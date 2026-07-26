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

// Root-level navigation graph:
//   zone "header" -- items: return, depart (Left/Right between them, Down into root)
//   zone "root"   -- columns: systems, archives (Left/Right between columns,
//                    Up/Down within the focused column's station list, Up
//                    from the top of a list returns to "header")
// The center Workstation displays whichever wing is focused but is not
// itself a navigable stop -- it hosts no station of its own until one is
// opened, and a focus stop with nothing to focus would be a dead end.
// Each wing currently maps to exactly one real station -- Settings and Media
// Archives are the only two destinations the existing Console exposes. No
// additional stations are invented; see the Milestone C1 audit for why.
const SYSTEMS_STATIONS = [
  { id: "settings", labelKey: "controlRoom.settingsLabel", hintKey: "controlRoom.settingsHint" },
]
const ARCHIVES_STATIONS = [
  { id: "media", labelKey: "controlRoom.mediaLabel", hintKey: "controlRoom.mediaHint" },
]

export default function ControlRoom({
  activeProfile, onReturnHome,
  crtEnabled, onCRTChange, themeId, onThemeChange,
  uiSoundsEnabled, onUiSoundsChange, uiSoundVolume, onUiSoundVolumeChange,
}) {
  const { t } = useI18n()
  const { games } = useGameLibrary()

  const [focusZone, setFocusZone] = useState("header")       // "header" | "root"
  const [headerIdx, setHeaderIdx] = useState(0)               // 0 = return, 1 = depart
  const [column, setColumn] = useState("systems")             // "systems" | "archives"
  const [systemsIdx, setSystemsIdx] = useState(0)
  const [archivesIdx, setArchivesIdx] = useState(0)
  const [activeModule, setActiveModule] = useState(null)      // null | "settings" | "media"

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
  const systemsBtnRef = useRef(null)
  const archivesBtnRef = useRef(null)
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
      (column === "systems" ? systemsBtnRef : column === "archives" ? archivesBtnRef : null)?.current?.focus()
    }
  }, [focusZone, headerIdx, column, activeModule])

  const openStation = (moduleId) => {
    restoreFocusRef.current = { zone: "root", column: columnRef.current }
    setActiveModule(moduleId)
  }

  const closeStation = () => {
    setActiveModule(null)
    const restore = restoreFocusRef.current
    if (restore) { setFocusZone(restore.zone); setColumn(restore.column) }
  }

  const activateHeaderItem = () => {
    if (headerIdxRef.current === 0) { if (onReturnHome) onReturnHome(); return }
    openDepart(departBtnRef.current)
  }

  const activateRootItem = () => {
    if (columnRef.current === "systems") openStation(SYSTEMS_STATIONS[systemsIdxRef.current].id)
    else if (columnRef.current === "archives") openStation(ARCHIVES_STATIONS[archivesIdxRef.current].id)
  }

  const moveLeftRight = (dir) => {
    if (focusZoneRef.current === "header") { setHeaderIdx(i => i === 0 ? 1 : 0); return }
    setColumn(dir < 0 ? "systems" : "archives")
  }

  const moveUp = () => {
    if (focusZoneRef.current === "root") { setFocusZone("header"); return }
  }

  const moveDown = () => {
    if (focusZoneRef.current === "header") { setFocusZone("root"); return }
    if (columnRef.current === "systems") setSystemsIdx(i => Math.min(SYSTEMS_STATIONS.length - 1, i + 1))
    else if (columnRef.current === "archives") setArchivesIdx(i => Math.min(ARCHIVES_STATIONS.length - 1, i + 1))
  }

  const moveUpWithinColumn = () => {
    if (columnRef.current === "systems" && systemsIdxRef.current > 0) { setSystemsIdx(i => i - 1); return }
    if (columnRef.current === "archives" && archivesIdxRef.current > 0) { setArchivesIdx(i => i - 1); return }
    moveUp()
  }

  const confirm = () => {
    if (focusZoneRef.current === "header") activateHeaderItem()
    else activateRootItem()
  }

  const back = () => {
    if (focusZoneRef.current === "root") { setFocusZone("header"); return }
  }

  const openDepart = (invoker) => {
    departTriggerRef.current = resolveDepartInvoker(invoker)
    setDepartChoice(1)
    setShowDepart(true)
  }
  const cancelDepart = () => { setShowDepart(false); restoreDepartFocus(departTriggerRef.current) }
  const chooseDepart = (next) => setDepartChoice(next)
  const acceptDepart = () => { window.nuarcade?.quit?.() }
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

  return (
    <div className={styles.stage}>
      <img src={controlRoomEnvironment} alt="" aria-hidden="true" className={styles.environment} />

      <div className={styles.globalHeader}>
        <div className={styles.worldNav}>
          <button
            ref={returnBtnRef}
            className={styles.returnHomeBtn}
            onClick={() => { if (onReturnHome) onReturnHome() }}
            onFocus={() => { setFocusZone("header"); setHeaderIdx(0) }}
          >
            {t("wheel.navHome")}
          </button>
        </div>
        <div className={styles.brand} aria-hidden="true">
          <div className={styles.brandName}>VESPARA</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.travelerGreeting}>
            {t("wheel.welcomeBack")} <span className={styles.travelerName}>{activeProfile?.name || t("wheel.guestCta")}</span>
          </div>
          <button
            ref={departBtnRef}
            className={styles.departBtn}
            onClick={() => openDepart(departBtnRef.current)}
            onFocus={() => { setFocusZone("header"); setHeaderIdx(1) }}
          >
            {t("wheel.depart")}
          </button>
        </div>
      </div>

      <div className={styles.titleRow}>
        <div className={styles.placeName}>{t("controlRoom.title")}</div>
        <div className={styles.placeSubtitle}>{t("controlRoom.subtitle")}</div>
      </div>

      <div className={styles.chamber}>
        <div
          className={styles.wing + (column === "systems" ? " " + styles.wingActive : "")}
          role="group"
          aria-label={t("controlRoom.systemsWing")}
        >
          <div className={styles.wingTitle}>{t("controlRoom.systemsWing")}</div>
          {SYSTEMS_STATIONS.map((s, i) => (
            <button
              key={s.id}
              ref={i === 0 ? systemsBtnRef : null}
              className={styles.station + (focusZone === "root" && column === "systems" && systemsIdx === i ? " " + styles.stationFocused : "")}
              aria-current={focusZone === "root" && column === "systems" && systemsIdx === i}
              onClick={() => { setFocusZone("root"); setColumn("systems"); setSystemsIdx(i); openStation(s.id) }}
              onFocus={() => { setFocusZone("root"); setColumn("systems"); setSystemsIdx(i) }}
            >
              <div className={styles.stationLabel}>{t(s.labelKey)}</div>
              <div className={styles.stationHint}>{t(s.hintKey)}</div>
            </button>
          ))}
        </div>

        <div className={styles.workstation}>
          <div className={styles.workstationIdle}>{t("controlRoom.workstationIdle")}</div>
          <div className={styles.workstationHint}>{t("controlRoom.workstationHint")}</div>
        </div>

        <div
          className={styles.wing + (column === "archives" ? " " + styles.wingActive : "")}
          role="group"
          aria-label={t("controlRoom.archivesWing")}
        >
          <div className={styles.wingTitle}>{t("controlRoom.archivesWing")}</div>
          {ARCHIVES_STATIONS.map((s, i) => (
            <button
              key={s.id}
              ref={i === 0 ? archivesBtnRef : null}
              className={styles.station + (focusZone === "root" && column === "archives" && archivesIdx === i ? " " + styles.stationFocused : "")}
              aria-current={focusZone === "root" && column === "archives" && archivesIdx === i}
              onClick={() => { setFocusZone("root"); setColumn("archives"); setArchivesIdx(i); openStation(s.id) }}
              onFocus={() => { setFocusZone("root"); setColumn("archives"); setArchivesIdx(i) }}
            >
              <div className={styles.stationLabel}>{t(s.labelKey)}</div>
              <div className={styles.stationHint}>{t(s.hintKey)}</div>
            </button>
          ))}
        </div>
      </div>

      {activeModule === "settings" && (
        <Settings
          games={games}
          onClose={closeStation}
          onCRTChange={onCRTChange}
          crtEnabled={crtEnabled}
          themeId={themeId}
          onThemeChange={onThemeChange}
          uiSoundsEnabled={uiSoundsEnabled}
          onUiSoundsChange={onUiSoundsChange}
          uiSoundVolume={uiSoundVolume}
          onUiSoundVolumeChange={onUiSoundVolumeChange}
        />
      )}
      {activeModule === "media" && (
        <MediaManager onClose={closeStation} onVideosUpdated={() => {}} onArtworkUpdated={() => {}} />
      )}

      {showDepart && (
        <DepartConfirmation
          eyebrow={t("home.worldName")}
          title={t("wheel.confirmExitTitle")}
          hint={t("wheel.confirmExitHint")}
          yesLabel={t("common.yes")}
          noLabel={t("common.no")}
          choice={departChoice}
          onChoiceChange={chooseDepart}
          onConfirm={acceptDepart}
          onCancel={declineDepart}
        />
      )}
    </div>
  )
}
