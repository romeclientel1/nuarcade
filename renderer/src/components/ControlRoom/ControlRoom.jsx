import { useEffect, useRef, useState } from "react"
import styles from "./ControlRoom.module.css"
import controlRoomEnvironment from "./assets/vespara-control-room.png"
import Settings from "../Settings/Settings"
import MediaManager from "../MediaManager/MediaManager"
import DepartConfirmation from "../Depart/DepartConfirmation"
import { resolveDepartInvoker, restoreDepartFocus } from "../Depart/departInteraction.js"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad.js"
import { useGameLibrary } from "../../hooks/useGameLibrary"
import { useI18n } from "../../i18n/I18nContext.js"
import vesparaSeal from "../../assets/brand/vespara-symbol-simplified.svg"

// Root-level navigation graph:
//   zone "header" -- items: return, depart (Left/Right between them, Down
//                    into root, restoring the exact wing/station the header
//                    was entered from)
//   zone "root"   -- columns: systems, archives (Left/Right between columns,
//                    Up/Down within the focused column's station list; Up
//                    from the top of Systems enters Return, Up from the top
//                    of Archives enters Depart -- see enterHeaderFromColumn)
// The center Workstation (Milestone C3) is a real readiness readout, not a
// navigable stop of its own -- Continue Setup is a second, mouse/Tab-
// reachable door onto the same action the Systems Wing's Settings station
// already performs, not a parallel entry in the arrow-key graph (see the
// comment on continueSetup() below for why).
// R1 -- direct-destination stations (replaces the one-station-per-wing
// model from Milestone C1). Each wing now lists real, individually
// selectable destinations instead of a single door onto one big folder.
// Settings.jsx and MediaManager.jsx are still reused wholesale, unedited in
// their save/apply/IPC logic -- a station is just {module, and either a
// `section` anchor Settings.jsx scrolls to, or a `tab` MediaManager opens
// directly on}. See the before-implementation report for why each station
// maps where it does (in particular: Controllers finishes wiring an
// existing-but-orphaned diagnostic rather than inventing a new feature, and
// Media Restoration opens Settings -- not MediaManager -- because that is
// where the real backup/restore/orphan-cleanup logic already lives).
const SYSTEMS_STATIONS = [
  { id: "emulators", module: "settings", section: "section-emulators", symbol: "◉", labelKey: "controlRoom.station.emulatorsLabel", hintKey: "controlRoom.station.emulatorsHint" },
  { id: "gamePaths", module: "settings", section: "section-paths", symbol: "⌁", labelKey: "controlRoom.station.gamePathsLabel", hintKey: "controlRoom.station.gamePathsHint" },
  { id: "controllers", module: "settings", section: "section-controllers", symbol: "✦", labelKey: "controlRoom.station.controllersLabel", hintKey: "controlRoom.station.controllersHint" },
  { id: "launchBehavior", module: "settings", section: "section-attract", symbol: "▷", labelKey: "controlRoom.station.launchBehaviorLabel", hintKey: "controlRoom.station.launchBehaviorHint" },
  { id: "displayPerformance", module: "settings", section: "section-display", symbol: "▣", labelKey: "controlRoom.station.displayPerformanceLabel", hintKey: "controlRoom.station.displayPerformanceHint" },
  { id: "preferences", module: "settings", section: "section-language", symbol: "◇", labelKey: "controlRoom.station.preferencesLabel", hintKey: "controlRoom.station.preferencesHint" },
  { id: "systemsArchive", module: "settings", section: "section-library", symbol: "◫", labelKey: "controlRoom.station.systemsArchiveLabel", hintKey: "controlRoom.station.systemsArchiveHint", advanced: true },
]
const ARCHIVES_STATIONS = [
  { id: "artwork", module: "media", tab: "artwork", symbol: "✧", labelKey: "controlRoom.station.artworkLabel", hintKey: "controlRoom.station.artworkHint" },
  { id: "videos", module: "media", tab: "library", symbol: "▹", labelKey: "controlRoom.station.videosLabel", hintKey: "controlRoom.station.videosHint" },
  { id: "scraping", module: "media", tab: "emumovies", symbol: "↥", labelKey: "controlRoom.station.scrapingLabel", hintKey: "controlRoom.station.scrapingHint" },
  { id: "bezels", module: "media", tab: "bezels", symbol: "▱", labelKey: "controlRoom.station.bezelsLabel", hintKey: "controlRoom.station.bezelsHint" },
  { id: "mediaRestoration", module: "settings", section: "section-media-restoration", symbol: "↺", labelKey: "controlRoom.station.mediaRestorationLabel", hintKey: "controlRoom.station.mediaRestorationHint", advanced: true },
]

// Media Manager owns its internal tab state, while Control Room owns the
// architectural frame surrounding it. Keep the frame label synchronized
// without changing any station id or station-to-tab mapping.
const MEDIA_TAB_LABEL_KEYS = {
  library: "controlRoom.station.videosLabel",
  artwork: "controlRoom.station.artworkLabel",
  emumovies: "controlRoom.station.scrapingLabel",
  bezels: "controlRoom.station.bezelsLabel",
  about: "settings.sectionAbout",
}

// Contextual-return contract (Milestone C3, Part 7): ControlRoom can be
// entered from more than one place. Today only "sanctuary" is ever passed
// (App.jsx's <ControlRoom> call site has no origin prop yet, so the default
// below is what actually runs) -- "library" is accepted so a later
// milestone can wire Library -> Control Room without touching this
// component again, but nothing currently produces that value. Any other/
// unrecognized origin falls back to "sanctuary" rather than rendering a
// broken label.
const RETURN_LABEL_BY_ORIGIN = {
  sanctuary: "wheel.navHome",
  library: "controlRoom.returnLibrary",
}

export default function ControlRoom({
  activeProfile, onReturnHome, entryOrigin = "sanctuary", isExiting = false,
  crtEnabled, onCRTChange,
  uiSoundsEnabled, onUiSoundsChange, uiSoundVolume, onUiSoundVolumeChange,
}) {
  const { t } = useI18n()
  const { games, config, loading } = useGameLibrary()
  const returnLabelKey = RETURN_LABEL_BY_ORIGIN[entryOrigin] || RETURN_LABEL_BY_ORIGIN.sanctuary

  const [focusZone, setFocusZone] = useState("header")       // "header" | "root"
  const [headerIdx, setHeaderIdx] = useState(0)               // 0 = return, 1 = depart
  const [column, setColumn] = useState("systems")             // "systems" | "archives"
  const [systemsIdx, setSystemsIdx] = useState(0)
  const [archivesIdx, setArchivesIdx] = useState(0)
  const [activeModule, setActiveModule] = useState(null)      // null | "settings" | "media"
  const [activeStationId, setActiveStationId] = useState(null) // which station within activeModule is open
  const [activeMediaTab, setActiveMediaTab] = useState(null)
  // True only while Continue Setup genuinely holds real DOM focus (native
  // Tab, not the arrow-key graph). Continue Setup deliberately has no
  // onFocus handler of its own (see continueSetup()'s comment) -- but that
  // means Tab-ing INTO it from the Settings station (whose onFocus DOES
  // fire and sets focusZone/column/systemsIdx) leaves that station's
  // derived-state "focused" class stuck on even though real focus has
  // since moved elsewhere. This flag is the fix: it's the one piece of
  // state that tracks real focus rather than the arrow-key graph's
  // intent, and suppresses the station's focused class while it's true --
  // caught live during Milestone C3 review (Blocker 1) by Tab-ing past the
  // Settings station on the way to Continue Setup and seeing both lit at
  // once.
  const [continueSetupFocused, setContinueSetupFocused] = useState(false)

  // Every value a keydown/gamepad handler reads is mirrored into a ref on
  // every render. The root input listeners below are registered once (empty
  // effect deps) so they never miss an input frame -- reading state directly
  // from their closures would freeze those reads at the render where the
  // listener was attached, which is exactly the bug an earlier pass of this
  // milestone shipped (Left/Right silently no-op'd after the first move).
  const focusZoneRef = useRef(focusZone); focusZoneRef.current = focusZone
  const headerIdxRef = useRef(headerIdx); headerIdxRef.current = headerIdx
  const columnRef = useRef(column); columnRef.current = column
  const systemsIdxRef = useRef(systemsIdx); systemsIdxRef.current = systemsIdx
  const archivesIdxRef = useRef(archivesIdx); archivesIdxRef.current = archivesIdx
  const activeModuleRef = useRef(activeModule); activeModuleRef.current = activeModule

  const returnBtnRef = useRef(null)
  const departBtnRef = useRef(null)
  const systemsBtnRef = useRef([])
  const archivesBtnRef = useRef([])
  const continueSetupBtnRef = useRef(null) // mouse/Tab entry point only -- see continueSetup() comment
  const restoreFocusRef = useRef(null) // { zone, column } to restore when a module closes

  const [showDepart, setShowDepart] = useState(false)
  const [departChoice, setDepartChoice] = useState(1) // 0 = yes, 1 = no
  const showDepartRef = useRef(showDepart); showDepartRef.current = showDepart
  const departTriggerRef = useRef(null)

  // Focus restoration: after any zone/column/module transition, move real
  // DOM focus onto the element that now owns navigation focus so the
  // visible focus ring and screen-reader focus always agree with state.
  useEffect(() => {
    if (activeModule) return
    if (focusZone === "header") {
      (headerIdx === 0 ? returnBtnRef : departBtnRef).current?.focus()
    } else if (focusZone === "root") {
      const stationRefs = column === "systems" ? systemsBtnRef : archivesBtnRef
      const stationIndex = column === "systems" ? systemsIdx : archivesIdx
      stationRefs.current[stationIndex]?.focus()
    }
  }, [focusZone, headerIdx, column, systemsIdx, archivesIdx, activeModule])

  const openStation = (station) => {
    restoreFocusRef.current = { zone: "root", column: columnRef.current }
    setActiveModule(station.module)
    setActiveStationId(station.id)
    setActiveMediaTab(station.module === "media" ? station.tab : null)
  }

  const closeStation = () => {
    setActiveModule(null)
    setActiveStationId(null)
    const restore = restoreFocusRef.current
    if (restore) { setFocusZone(restore.zone); setColumn(restore.column) }
    setActiveMediaTab(null)
  }

  const activateHeaderItem = () => {
    if (headerIdxRef.current === 0) { if (onReturnHome) onReturnHome(); return }
    openDepart(departBtnRef.current)
  }

  const activateRootItem = () => {
    if (columnRef.current === "systems") openStation(SYSTEMS_STATIONS[systemsIdxRef.current])
    else if (columnRef.current === "archives") openStation(ARCHIVES_STATIONS[archivesIdxRef.current])
  }

  const moveLeftRight = (dir) => {
    if (focusZoneRef.current === "header") { setHeaderIdx(i => i === 0 ? 1 : 0); return }
    setColumn(dir < 0 ? "systems" : "archives")
  }

  // Up from the top of a wing's station list enters the header -- landing
  // on the header item that sits above THAT wing (Systems -> Return,
  // Archives -> Depart), never on whatever header item happened to be
  // focused last. Down from the header always restores the exact wing/
  // station the header was entered from, because `column`/`systemsIdx`/
  // `archivesIdx` are never mutated by header navigation (Left/Right only
  // ever touches `headerIdx`) -- so "restore" is just "go back to root",
  // the underlying state never moved.
  const enterHeaderFromColumn = () => {
    setHeaderIdx(columnRef.current === "archives" ? 1 : 0)
    setFocusZone("header")
  }

  const moveDown = () => {
    if (focusZoneRef.current === "header") { setFocusZone("root"); return }
    if (columnRef.current === "systems") setSystemsIdx(i => Math.min(SYSTEMS_STATIONS.length - 1, i + 1))
    else if (columnRef.current === "archives") setArchivesIdx(i => Math.min(ARCHIVES_STATIONS.length - 1, i + 1))
  }

  const moveUpWithinColumn = () => {
    if (columnRef.current === "systems" && systemsIdxRef.current > 0) { setSystemsIdx(i => i - 1); return }
    if (columnRef.current === "archives" && archivesIdxRef.current > 0) { setArchivesIdx(i => i - 1); return }
    if (focusZoneRef.current === "root") { enterHeaderFromColumn(); return }
  }

  const confirm = () => {
    if (focusZoneRef.current === "header") activateHeaderItem()
    else activateRootItem()
  }

  // One level at a time: root wings back out to the header row; the header
  // row is the top of Control Room's own graph, so a further Back there
  // leaves the room entirely via the same path as the Return button --
  // matching Sanctuary's own contract that Escape/B always resolves to
  // somewhere, never a dead end. Never fires while a station or Depart is
  // open (both suppress this listener entirely -- see the two effects
  // below).
  const back = () => {
    if (focusZoneRef.current === "root") { setFocusZone("header"); return }
    if (focusZoneRef.current === "header") { if (onReturnHome) onReturnHome(); return }
  }

  const openDepart = (invoker) => {
    departTriggerRef.current = resolveDepartInvoker(invoker)
    setDepartChoice(1)
    setShowDepart(true)
  }
  const cancelDepart = () => { setShowDepart(false); restoreDepartFocus(departTriggerRef.current) }
  const chooseDepart = (next) => setDepartChoice(next)
  // Swallows a rejected quit-app IPC round-trip so a failed quit never
  // surfaces as an unhandled promise rejection (a missing bridge is
  // already safe via the optional chains alone).
  const acceptDepart = () => { window.nuarcade?.quit?.()?.catch?.(() => {}) }
  const declineDepart = () => cancelDepart()

  // Root-level gamepad navigation is suppressed entirely while a station is
  // open (Settings/MediaManager own input via their own useOverlayGamepad)
  // and while the Depart dialog is open (its own data-vespara-depart-dialog
  // marker already causes useOverlayGamepad instances to self-suppress).
  useOverlayGamepad({
    enabled: !activeModule && !showDepart,
    onUp: moveUpWithinColumn,
    onDown: moveDown,
    onLeft: () => moveLeftRight(-1),
    onRight: () => moveLeftRight(1),
    onConfirm: confirm,
    onClose: back,
  })

  // Registered once -- every value the handler needs is read from a ref at
  // call time (see the ref block above), so this never goes stale the way a
  // dependency-gated effect would after the first state change.
  useEffect(() => {
    const handler = (e) => {
      if (activeModuleRef.current || showDepartRef.current) return
      if (e.key === "ArrowUp") { e.preventDefault(); moveUpWithinColumn() }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveDown() }
      else if (e.key === "ArrowLeft") { e.preventDefault(); moveLeftRight(-1) }
      else if (e.key === "ArrowRight") { e.preventDefault(); moveLeftRight(1) }
      else if (e.key === "Enter") { e.preventDefault(); confirm() }
      else if (e.key === "Escape") { e.preventDefault(); back() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // While a station is open, the room behind it becomes a visible-but-
  // inactive backdrop: dimmed and non-interactive, so a mouse can't reach
  // Return/Depart/the other wing through the now-constrained (not
  // full-bleed) station frame and accidentally navigate away while
  // Settings/MediaManager is still mounted underneath.
  const stationOpen = !!activeModule
  // Driven by which WING the station was opened from (captured in
  // restoreFocusRef at openStation time), not by which underlying module
  // ended up mounting. This matters because Media Restoration is an
  // Archives Wing station that reuses the Settings module (its real content
  // lives there) -- deriving this from activeModule alone would wrongly
  // dim/select the Systems Wing while an Archives Wing station is open.
  const activeWing = stationOpen ? restoreFocusRef.current?.column : null

  // Readiness workstation (Milestone C3, Part 3/4; revised per the review
  // Blocker 2 audit). Every row reads real state already available to this
  // component -- config.load()'s actual on-disk config (via
  // useGameLibrary's `config`) and the actual scanned library (`games`) --
  // never an invented number. No IPC call, no Settings/MediaManager
  // internals reached into.
  //
  // `config` is only ever populated on win32 (see useGameLibrary's own
  // platform gate) and only after its async getConfig() call resolves --
  // so there are two states this component must not confuse with "the user
  // hasn't set anything up": platform-unsupported (config will NEVER
  // arrive) and still-loading (config hasn't arrived YET). Collapsing
  // either into "Needs setup" would show a permanent or false-urgent
  // warning to someone who did nothing wrong -- a Mac user, or anyone
  // mid-scan on first launch.
  //
  // Essential-completion gate, in priority order (readinessState):
  //   1. setupComplete === true  -> "ready"       (explicit positive
  //      override -- if the user's own saved config says setup is done,
  //      that always wins, regardless of anything else below)
  //   2. platform unsupported    -> "unavailable"  (config can't exist
  //      here; reviewing readiness isn't a meaningful action to offer)
  //   3. still loading           -> "unknown"      (config/library haven't
  //      resolved yet -- honest "checking", not "not configured")
  //   4. gamesDiscovered === 0   -> "needsSetup"   (the one signal that
  //      can be verified truthfully and distinguished from a placeholder:
  //      an actual scan either found something or it didn't)
  //   5. otherwise               -> "ready"
  // Controllers are deliberately NOT part of this gate -- they're optional
  // for keyboard/mouse play (Part 5.C), so their absence is informational
  // only, never a blocker. Game paths are likewise not independently
  // checked -- default placeholder paths (see src/main/config.js) can't be
  // truthfully distinguished from real ones without a scan, and the scan
  // result is exactly what `gamesDiscovered` already reports (Part 5.B).
  const platformSupported = typeof window !== "undefined" && window.nuarcade?.platform === "win32"
  const controllersConfigured = Object.values(config?.controllers || {}).filter(Boolean).length
  const gamesDiscovered = games.length
  const setupComplete = !!config?.setupComplete

  const readinessState =
    setupComplete ? "ready"
    : !platformSupported ? "unavailable"
    : loading ? "unknown"
    : gamesDiscovered === 0 ? "needsSetup"
    : "ready"

  const readinessRows = readinessState === "unavailable" || readinessState === "unknown"
    ? [{
        key: "status",
        labelKey: "controlRoom.readinessStatus",
        statusKey: readinessState === "unavailable" ? "controlRoom.statusUnavailable" : "controlRoom.statusChecking",
      }]
    : [
        {
          key: "emulators",
          labelKey: "controlRoom.readinessEmulators",
          statusKey: setupComplete ? "controlRoom.statusConfigured" : "controlRoom.statusNeedsSetup",
        },
        {
          key: "controllers",
          labelKey: "controlRoom.readinessControllers",
          statusKey: controllersConfigured > 0 ? "controlRoom.statusReady" : "controlRoom.statusOptionalNotConfigured",
        },
        {
          key: "paths",
          labelKey: "controlRoom.readinessPaths",
          statusKey: gamesDiscovered > 0 ? "controlRoom.statusConnected" : "controlRoom.statusNoPaths",
        },
        {
          key: "games",
          labelKey: "controlRoom.readinessGames",
          statusKey: gamesDiscovered > 0 ? null : "controlRoom.statusNotScanned",
          // A real count, not a fabricated one -- `games.length` is the
          // actual scanned library size. Only shown once something was
          // actually found.
          statusText: gamesDiscovered > 0 ? t("controlRoom.statusDiscoveredCount", { count: gamesDiscovered }) : null,
        },
      ]

  // Continue Setup opens the exact same station as the Systems Wing's
  // Settings entry -- it is a second door onto one action, not a second
  // implementation of it. It's reachable by mouse click and by native
  // Tab/Enter (a real <button>, no keydown interception of its own -- see
  // the C2 "native form controls unaffected" contract this milestone
  // doesn't touch). Controller/arrow-key users reach the identical result
  // via the already-fully-reachable Systems Wing -> Settings station; no
  // second, parallel entry was added to the Left/Right/Up/Down graph,
  // which would risk exactly the double-focus-owner problem Part 2 exists
  // to eliminate.
  const continueSetup = () => { setFocusZone("root"); setColumn("systems"); setSystemsIdx(0); openStation(SYSTEMS_STATIONS[0]) }
  const selectedStation = column === "systems" ? SYSTEMS_STATIONS[systemsIdx] : ARCHIVES_STATIONS[archivesIdx]
  const selectedWingLabel = column === "systems" ? t("controlRoom.systemsWing") : t("controlRoom.archivesWing")
  const activeStation = [...SYSTEMS_STATIONS, ...ARCHIVES_STATIONS].find(station => station.id === activeStationId)

  return (
      <div className={styles.stage + (isExiting ? " " + styles.stageExiting : "")}>
      <img src={controlRoomEnvironment} alt="" aria-hidden="true" className={styles.environment} />

      <div className={styles.globalHeader + (stationOpen ? " " + styles.roomInactive : "")}>
        <div className={styles.worldNav}>
          <button
            ref={returnBtnRef}
            className={styles.returnHomeBtn + " " + styles.goldTrim}
            onClick={() => { if (onReturnHome) onReturnHome() }}
            onFocus={() => { setFocusZone("header"); setHeaderIdx(0) }}
          >
            {t(returnLabelKey)}
          </button>
        </div>
        <div className={styles.brand} aria-hidden="true">
          <div className={styles.brandName + " " + styles.goldTrim}>VESPARA</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.travelerGreeting}>
            {t("wheel.welcomeBack")} <span className={styles.travelerName}>{activeProfile?.name || t("wheel.guestCta")}</span>
          </div>
          <button
            ref={departBtnRef}
            className={styles.departBtn + " " + styles.goldTrim}
            onClick={() => openDepart(departBtnRef.current)}
            onFocus={() => { setFocusZone("header"); setHeaderIdx(1) }}
          >
            {t("wheel.depart")}
          </button>
        </div>
      </div>

      <div className={styles.titleRow + (stationOpen ? " " + styles.roomInactive : "")}>
        <div className={styles.placeName + " " + styles.goldTrim}>{t("controlRoom.title")}</div>
        <div className={styles.placeSubtitle}>{t("controlRoom.subtitle")}</div>
      </div>

      <div className={styles.chamber + (stationOpen ? " " + styles.roomInactive : "")}>
        <div
          className={
            styles.wing
            + (column === "systems" && !stationOpen ? " " + styles.wingSelected : "")
            + (activeWing === "systems" ? " " + styles.wingSelected : "")
            + (activeWing === "archives" ? " " + styles.wingDimmed : "")
          }
          role="group"
          aria-label={t("controlRoom.systemsWing")}
        >
          <div className={styles.wingTitle + " " + styles.goldTrim}>{t("controlRoom.systemsWing")}</div>
          <div className={styles.wingPurpose}>{t("controlRoom.systemsPurpose")}</div>
          {SYSTEMS_STATIONS.map((s, i) => (
            <button
              key={s.id}
              ref={node => { systemsBtnRef.current[i] = node }}
              className={styles.station + (focusZone === "root" && column === "systems" && systemsIdx === i && !continueSetupFocused ? " " + styles.stationFocused : "")}
              aria-current={focusZone === "root" && column === "systems" && systemsIdx === i && !continueSetupFocused}
              onClick={() => { setFocusZone("root"); setColumn("systems"); setSystemsIdx(i); openStation(s) }}
              onFocus={() => { setFocusZone("root"); setColumn("systems"); setSystemsIdx(i); setContinueSetupFocused(false) }}
            >
              <span className={styles.stationMarker} aria-hidden="true">{s.symbol}</span>
              <span className={styles.stationCopy}>
                <span className={styles.stationLabel}>{t(s.labelKey)}</span>
                <span className={styles.stationHint}>{t(s.hintKey)}</span>
              </span>
            </button>
          ))}
        </div>

        <div className={styles.workstation}>
          <div className={styles.workstationHalo} aria-hidden="true" />
          <div className={styles.consoleCrown}>
            <img src={vesparaSeal} alt="" aria-hidden="true" className={styles.consoleSeal} />
            <div className={styles.readinessTitle + " " + styles.goldTrim}>{t("controlRoom.readinessTitle")}</div>
          </div>
          <div className={styles.consoleSurface}>
            <div className={styles.readinessRows}>
              {readinessRows.map(row => (
                <div key={row.key} className={styles.readinessRow}>
                  <span className={styles.readinessLabel}>{t(row.labelKey)}</span>
                  <span className={styles.readinessValue}>{row.statusText || t(row.statusKey)}</span>
                </div>
              ))}
            </div>
            {readinessState === "needsSetup" && (
              <button
                ref={continueSetupBtnRef}
                className={styles.readinessAction}
                onClick={continueSetup}
                onFocus={() => setContinueSetupFocused(true)}
                onBlur={() => setContinueSetupFocused(false)}
              >
                {t("controlRoom.continueSetup")}
              </button>
            )}
            {readinessState === "ready" && (
              <div className={styles.readinessComplete}>{t("controlRoom.vesparaReady")}</div>
            )}
            {readinessState === "unavailable" && (
              <div className={styles.readinessNeutral}>{t("controlRoom.readinessUnavailable")}</div>
            )}
            {readinessState === "unknown" && (
              <div className={styles.readinessNeutral}>{t("controlRoom.readinessChecking")}</div>
            )}
          </div>
          <div className={styles.stationContext} aria-live="polite">
            <span className={styles.contextSymbol} aria-hidden="true">{selectedStation.symbol}</span>
            <span className={styles.contextCopy}>
              <span className={styles.contextWing}>{selectedWingLabel}</span>
              <strong>{t(selectedStation.labelKey)}</strong>
              <span>{t(selectedStation.hintKey)}</span>
            </span>
          </div>
        </div>

        <div
          className={
            styles.wing
            + (column === "archives" && !stationOpen ? " " + styles.wingSelected : "")
            + (activeWing === "archives" ? " " + styles.wingSelected : "")
            + (activeWing === "systems" ? " " + styles.wingDimmed : "")
          }
          role="group"
          aria-label={t("controlRoom.archivesWing")}
        >
          <div className={styles.wingTitle + " " + styles.goldTrim}>{t("controlRoom.archivesWing")}</div>
          <div className={styles.wingPurpose}>{t("controlRoom.archivesPurpose")}</div>
          {ARCHIVES_STATIONS.map((s, i) => (
            <button
              key={s.id}
              ref={node => { archivesBtnRef.current[i] = node }}
              className={styles.station + (focusZone === "root" && column === "archives" && archivesIdx === i ? " " + styles.stationFocused : "")}
              aria-current={focusZone === "root" && column === "archives" && archivesIdx === i}
              onClick={() => { setFocusZone("root"); setColumn("archives"); setArchivesIdx(i); openStation(s) }}
              onFocus={() => { setFocusZone("root"); setColumn("archives"); setArchivesIdx(i) }}
            >
              <span className={styles.stationMarker} aria-hidden="true">{s.symbol}</span>
              <span className={styles.stationCopy}>
                <span className={styles.stationLabel}>{t(s.labelKey)}</span>
                <span className={styles.stationHint}>{t(s.hintKey)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeModule === "settings" && (
        <div className={styles.stationFrame} data-active-wing={activeWing}>
          <div className={styles.stationFrameHeader}>
            <span>{activeWing === "systems" ? t("controlRoom.systemsWing") : t("controlRoom.archivesWing")}</span>
            <strong>{activeStation ? t(activeStation.labelKey) : t("controlRoom.title")}</strong>
          </div>
          <div className={styles.stationViewport}>
            <Settings
              games={games}
              onClose={closeStation}
              onCRTChange={onCRTChange}
              crtEnabled={crtEnabled}
              uiSoundsEnabled={uiSoundsEnabled}
              onUiSoundsChange={onUiSoundsChange}
              uiSoundVolume={uiSoundVolume}
              onUiSoundVolumeChange={onUiSoundVolumeChange}
              scrollToSection={
                (SYSTEMS_STATIONS.find(s => s.id === activeStationId)
                  || ARCHIVES_STATIONS.find(s => s.id === activeStationId))?.section
              }
            />
          </div>
        </div>
      )}
      {activeModule === "media" && (
        <div className={styles.stationFrame} data-active-wing={activeWing}>
          <div className={styles.stationFrameHeader}>
            <span>{t("controlRoom.archivesWing")}</span>
            <strong>{activeMediaTab && MEDIA_TAB_LABEL_KEYS[activeMediaTab]
              ? t(MEDIA_TAB_LABEL_KEYS[activeMediaTab])
              : activeStation ? t(activeStation.labelKey) : t("controlRoom.title")}</strong>
          </div>
          <div className={styles.stationViewport}>
            <MediaManager
              onClose={closeStation}
              onVideosUpdated={() => {}}
              onArtworkUpdated={() => {}}
              initialTab={ARCHIVES_STATIONS.find(s => s.id === activeStationId)?.tab}
              onContextChange={setActiveMediaTab}
            />
          </div>
        </div>
      )}

      {showDepart && (
        <DepartConfirmation
          eyebrow={t("home.worldName")}
          title={t("wheel.confirmExitTitle")}
          hint={t("wheel.confirmExitHint")}
          yesLabel={t("depart.depart")}
          noLabel={t("depart.remain")}
          choice={departChoice}
          onChoiceChange={chooseDepart}
          onConfirm={acceptDepart}
          onCancel={declineDepart}
        />
      )}
    </div>
  )
}
