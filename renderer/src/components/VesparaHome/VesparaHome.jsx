import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useProfiles } from "../../context/ProfileContext"
import { useRecentGames } from "../../hooks/useRecentGames"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useGameLauncher } from "../../hooks/useGameLauncher"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad"
import { useArcadeSounds } from "../../hooks/useArcadeSounds"
import { shouldPlayLaunchErrorCue } from "../../hooks/launchErrorSoundGuard.js"
import { useErrorToast, ErrorToastContainer } from "../Wheel/ErrorToast"
import ControllerPrompt from "../ControllerPrompt/ControllerPrompt"
import {
  selectProfileHistoryStatus,
  selectInstallationReadiness,
  selectValidRecentGames,
} from "../../selectors/profileReadiness"
import { selectInitialHomeFocus } from "../../selectors/homeEntry"
import { buildHomeOriginContext } from "./homeLaunchOrigin.js"
import { applyPendingRecentlyPlayedCredit } from "../../launchSession/startupRecovery.js"
import { consumeRestorationRequest } from "../../launchSession/restorationRequest.js"
import { shouldConsumeRestoration, resolveHomeFocus } from "../../launchSession/restorationResolution.js"
import { useI18n } from "../../i18n/I18nContext.js"
import styles from "./VesparaHome.module.css"
import starFieldAsset from "./assets/starField.svg"
import planetAsset from "./assets/planet.svg"
import sunAsset from "./assets/sun.svg"
import moonAsset from "./assets/moon.svg"
import vesparaSealAsset from "../../assets/brand/vespara-symbol-simplified.svg"

const RECENT_LIMIT = 8
const ACTIONS = ["library", "switchPlayer", "depart"]

// VesparaHome -------------------------------------------------------------
// The neutral, temporary Vespara Home shell. Proves the app can exist
// outside Wheel: identify the active player, show Recently Played, launch
// one directly, or enter the existing Wheel/Library experience. Not the
// final Vespara world -- no cinematic transitions, camera movement, or
// environmental design here, deliberately.
export default function VesparaHome({ onEnterLibrary, onSwitchPlayer, restorationRequest, uiSoundsEnabled, uiSoundVolume }) {
  const { t } = useI18n()
  const ACTION_LABELS = { library: t("home.libraryDestination"), switchPlayer: t("home.switchPlayer"), depart: t("home.depart") }
  const { activeProfile } = useProfiles()
  const { recentGamesRaw, games, addRecentlyPlayed, loading } = useRecentGames(RECENT_LIMIT)
  const { startSession, endSession, recordLaunch } = usePlaytime()
  const { toasts: errorToasts, showError, dismiss: dismissError } = useErrorToast()
  // Pass the raw config values straight through -- useArcadeSounds is the
  // single normalization/conversion boundary (0-100 percent -> 0-1 gain
  // scale); pre-converting here would be a second, redundant conversion.
  const sounds = useArcadeSounds({ enabled: uiSoundsEnabled, volume: uiSoundVolume })

  const activeProfileId = activeProfile?.id ?? null

  const {
    launch, confirmLaunch, dismissControllerPrompt,
    launching, launchError, launchErrorSeq, needsControllerPrompt,
  } = useGameLauncher({
    addRecentlyPlayed,
    activeProfileId,
    startSession, endSession, recordLaunch,
    showError,
    playLaunchSound: sounds.launch,
    // No background video in Home -- onLaunchStart/onReturn are optional
    // and Wheel-specific (pausing/resuming its own bg video refs). Home
    // has nothing equivalent, so both are simply omitted.
    // Recently Played is no longer tagged/written here -- useGameLauncher
    // itself is now the single write authority, writing once on
    // confirmed return. See useGameLauncher.js and
    // selectors/profileReadiness.js for the full contract.
    originDestination: "home",
    originContext: buildHomeOriginContext(),
  })

  // Surface-scoped launch-error sound: plays sounds.error() once when a
  // genuinely new, non-empty launchError appears -- never on an ordinary
  // rerender while the same message is still showing, and never merely
  // because the display text changed (e.g. a locale switch retranslating
  // an already-visible message). Keyed off launchErrorSeq -- a monotonic
  // occurrence counter useGameLauncher increments once per showLaunchError()
  // call, entirely independent of the (translated, locale-dependent)
  // message text -- rather than comparing launchError's string value,
  // which is not a safe identity across a locale change and could
  // coincidentally collide between two unrelated failures. Resets the
  // instant the error clears, so a later, separate failure (even with an
  // identical message) is treated as new and sounds again. Plain ref +
  // effect, no timers, no new React state beyond the seq already exposed
  // by useGameLauncher, and deliberately not wired through
  // useErrorToast/ErrorToast (untouched this milestone).
  const lastPlayedLaunchErrorSeqRef = useRef(null)
  useEffect(() => {
    const { play, nextLastPlayedSeq } = shouldPlayLaunchErrorCue(launchError, launchErrorSeq, lastPlayedLaunchErrorSeqRef.current)
    if (play) sounds.error()
    lastPlayedLaunchErrorSeqRef.current = nextLastPlayedSeq
  }, [launchError, launchErrorSeq])

  // Completes any Recently Played credit a startup-recovered launch session
  // left pending (see launchSession/startupRecovery.js) -- recovery itself
  // can't resolve the real game/addRecentlyPlayed (it runs before this
  // catalog exists), so it durably records the credit instead of losing
  // it. Cheap and safe to call on every games-list change: a no-op once
  // the pending queue is empty, and idempotent even if Wheel and Home both
  // end up attempting it (whichever runs first wins; the entry is removed
  // the instant it's applied).
  useEffect(() => {
    if (loading) return
    applyPendingRecentlyPlayedCredit({ games, addRecentlyPlayed })
  }, [loading, games, addRecentlyPlayed])

  // Profile-scoped, resolved history -- the single source both the
  // visible Recent row and the initial-focus derivation use, so they can
  // never disagree with each other.
  const validRecentGames = useMemo(
    () => selectValidRecentGames(activeProfileId, recentGamesRaw, games),
    [activeProfileId, recentGamesRaw, games]
  )
  const displayedRecentGames = useMemo(
    () => validRecentGames.slice(0, RECENT_LIMIT),
    [validRecentGames]
  )
  const profileHistoryStatus = useMemo(
    () => selectProfileHistoryStatus(activeProfile, recentGamesRaw, games),
    [activeProfile, recentGamesRaw, games]
  )
  const installationReadiness = useMemo(
    () => selectInstallationReadiness(games, recentGamesRaw),
    [games, recentGamesRaw]
  )
  const initialFocus = useMemo(() => selectInitialHomeFocus({
    profileHistoryStatus,
    installationReadiness,
    recentGames: validRecentGames,
    availableGames: games,
  }), [profileHistoryStatus, installationReadiness, validRecentGames, games])

  // Artwork: read the same cache Wheel's own artwork state initializes
  // from, once, on mount. No scraping, no live subscription -- if a
  // recent game isn't in the cache yet, its row falls back to text only.
  const [artwork] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nuarcade_artwork") || "{}") } catch { return {} }
  })

  // Focus model: two zones -- the Recent row (if it has anything in it)
  // and the action row (Library / Switch Player / Depart). Left/Right
  // moves within a zone, Up/Down switches zones, Confirm activates
  // whatever's focused.
  const hasRecents = displayedRecentGames.length > 0
  const [focusZone, setFocusZone] = useState(hasRecents ? "recents" : "actions")
  const [recentIndex, setRecentIndex] = useState(0)
  const [actionIndex, setActionIndex] = useState(0)

  // Tracks whether the player has manually moved focus at least once.
  // Until then, background data settling (the async library load
  // finishing, artwork resolving, etc.) is allowed to apply the derived
  // initial focus. Once true, nothing here overrides the player's own
  // navigation again -- see the "Focus lifecycle" requirement.
  const [hasAcceptedInitialFocus, setHasAcceptedInitialFocus] = useState(false)
  const acceptManualFocus = useCallback(() => setHasAcceptedInitialFocus(true), [])

  // Re-derive and reset when the active profile changes. In the current
  // app, VesparaHome only ever mounts fresh per profile session (Home
  // and Wheel are mutually exclusive, and switching players tears down
  // and remounts Home) -- so this realistically only fires once, on
  // mount, per session. Included for correctness if that mounting
  // strategy ever changes (e.g. Home becomes persistently mounted).
  useEffect(() => {
    setHasAcceptedInitialFocus(false)
  }, [activeProfileId])

  useEffect(() => {
    if (hasAcceptedInitialFocus) return
    if (loading) return // wait for the async library load to settle first
    if (initialFocus.type === "recent-game") {
      const idx = displayedRecentGames.findIndex(g => (g.id || g.profile) === initialFocus.gameId)
      if (idx >= 0) { setFocusZone("recents"); setRecentIndex(idx); return }
    }
    // 'library' | 'setup-connection' | 'first-game' (not produced today,
    // see selectInitialHomeFocus) | 'none' all currently resolve to
    // focusing the Library action slot -- see the render section for how
    // 'setup-connection' relabels that same button rather than adding a
    // new one.
    setFocusZone("actions")
    setActionIndex(0)
  }, [hasAcceptedInitialFocus, loading, initialFocus, displayedRecentGames])

  useEffect(() => {
    if (!hasRecents && focusZone === "recents") setFocusZone("actions")
  }, [hasRecents, focusZone])

  // Launch-origin restoration -- consumes App's restoration request exactly
  // once, at the first moment the recent-games data is genuinely ready.
  // Focuses the Recently Played tile with the exact saved game id when it
  // still exists in THIS profile's resolved list (displayedRecentGames is
  // already profile-scoped); when it doesn't, the request is consumed and
  // Home simply keeps its normal derived initial focus -- no fabricated
  // entry, no invalid selection. Declared after the initial-focus effects
  // above so a restored focus wins within the same commit, and marked as
  // accepted so later data settling can't override it.
  useEffect(() => {
    if (!shouldConsumeRestoration(restorationRequest, { catalogReady: !loading })) return
    if (!consumeRestorationRequest(restorationRequest)) return
    const focus = resolveHomeFocus(restorationRequest, { recentGames: displayedRecentGames })
    if (focus) {
      setFocusZone("recents")
      setRecentIndex(focus.recentIndex)
      setHasAcceptedInitialFocus(true)
    }
  }, [restorationRequest, loading, displayedRecentGames])

  // Visual-only correction: if the focused recent-game tile lies outside
  // the row's currently visible horizontal bounds (row is overflow-x:auto),
  // nudge it into view without any smooth-scroll animation. Purely a
  // bounding-rect comparison -- never touches recentIndex, restoration
  // selection, or any focus/navigation state. No-ops safely whenever the
  // Recent row isn't the active zone or either ref isn't mounted yet.
  const recentRowRef = useRef(null)
  const focusedRecentCardRef = useRef(null)
  useEffect(() => {
    if (focusZone !== "recents") return
    const row = recentRowRef.current
    const card = focusedRecentCardRef.current
    if (!row || !card) return
    const rowRect = row.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const outOfView = cardRect.left < rowRect.left || cardRect.right > rowRect.right
    if (outOfView) {
      card.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" })
    }
  }, [focusZone, recentIndex])

  const [showDepartConfirm, setShowDepartConfirm] = useState(false)
  const [departChoice, setDepartChoice] = useState(1) // 0 = Yes, 1 = No (default safe)

  const runAction = useCallback((action) => {
    if (action === "library") onEnterLibrary?.()
    else if (action === "switchPlayer") onSwitchPlayer?.()
    else if (action === "depart") { setDepartChoice(1); setShowDepartConfirm(true) }
  }, [onEnterLibrary, onSwitchPlayer])

  const launchFocused = useCallback(() => {
    if (focusZone === "recents" && displayedRecentGames[recentIndex]) {
      // No confirm sound here -- a recent-game launch gets its one sound
      // exclusively through useGameLauncher's playLaunchSound, once the
      // launch is actually accepted (see the wiring above). Playing
      // select() first would stack a second cue on the same action.
      launch(displayedRecentGames[recentIndex])
    } else if (focusZone === "actions") {
      // Opening Library/Switch Player, or opening the Depart confirmation
      // dialog, is an ordinary menu-action activation -- one select() cue.
      sounds.select()
      runAction(ACTIONS[actionIndex])
    }
  }, [focusZone, displayedRecentGames, recentIndex, actionIndex, launch, runAction, sounds])

  // Main Home controller handling -- disabled while the Depart
  // confirmation or a controller hint prompt is showing, matching the
  // same "exactly one active listener" discipline Wheel already uses for
  // its own overlays.
  useOverlayGamepad({
    enabled: !showDepartConfirm && !needsControllerPrompt,
    onLeft: () => {
      acceptManualFocus()
      if (focusZone === "recents") {
        if (recentIndex > 0) { sounds.navigate(); setRecentIndex(i => Math.max(0, i - 1)) }
      } else if (actionIndex > 0) {
        sounds.navigate(); setActionIndex(i => Math.max(0, i - 1))
      }
    },
    onRight: () => {
      acceptManualFocus()
      if (focusZone === "recents") {
        if (recentIndex < displayedRecentGames.length - 1) { sounds.navigate(); setRecentIndex(i => Math.min(displayedRecentGames.length - 1, i + 1)) }
      } else if (actionIndex < ACTIONS.length - 1) {
        sounds.navigate(); setActionIndex(i => Math.min(ACTIONS.length - 1, i + 1))
      }
    },
    onUp: () => { acceptManualFocus(); if (hasRecents && focusZone !== "recents") { sounds.navigate(); setFocusZone("recents") } },
    onDown: () => { acceptManualFocus(); if (focusZone === "recents") { sounds.navigate(); setFocusZone("actions") } },
    onConfirm: launchFocused,
    // Back must not unexpectedly quit or leave Home. A safe, deterministic
    // default: return focus to the action row's first entry (Library).
    // Depart stays an explicit, separate action -- never triggered by Back.
    onClose: () => { acceptManualFocus(); setFocusZone("actions"); setActionIndex(0) },
  })

  // Depart confirmation's own small Left/Right/Confirm/Back handling,
  // active only while it's showing -- mirrors the same pattern Wheel uses
  // for its own inline Exit confirmation.
  useOverlayGamepad({
    enabled: showDepartConfirm,
    onLeft:  () => { if (departChoice !== 0) { sounds.navigate(); setDepartChoice(0) } },
    onRight: () => { if (departChoice !== 1) { sounds.navigate(); setDepartChoice(1) } },
    onConfirm: () => {
      if (departChoice === 0) { sounds.select(); window.nuarcade?.quit?.() }
      else { sounds.back(); setShowDepartConfirm(false) }
    },
    onClose: () => { sounds.back(); setShowDepartConfirm(false) },
  })

  // Keyboard parity -- mouse and keyboard must remain functional
  // alongside the controller.
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return
      if (showDepartConfirm) {
        if (e.key === "ArrowLeft" && departChoice !== 0)  { sounds.navigate(); setDepartChoice(0) }
        if (e.key === "ArrowRight" && departChoice !== 1) { sounds.navigate(); setDepartChoice(1) }
        if (e.key === "Enter") {
          if (departChoice === 0) { sounds.select(); window.nuarcade?.quit?.() }
          else { sounds.back(); setShowDepartConfirm(false) }
        }
        if (e.key === "Escape") { sounds.back(); setShowDepartConfirm(false) }
        return
      }
      if (needsControllerPrompt) return
      if (e.key === "ArrowLeft") {
        acceptManualFocus()
        if (focusZone === "recents") {
          if (recentIndex > 0) { sounds.navigate(); setRecentIndex(i => Math.max(0, i - 1)) }
        } else if (actionIndex > 0) {
          sounds.navigate(); setActionIndex(i => Math.max(0, i - 1))
        }
      }
      if (e.key === "ArrowRight") {
        acceptManualFocus()
        if (focusZone === "recents") {
          if (recentIndex < displayedRecentGames.length - 1) { sounds.navigate(); setRecentIndex(i => Math.min(displayedRecentGames.length - 1, i + 1)) }
        } else if (actionIndex < ACTIONS.length - 1) {
          sounds.navigate(); setActionIndex(i => Math.min(ACTIONS.length - 1, i + 1))
        }
      }
      if (e.key === "ArrowUp")   { acceptManualFocus(); if (hasRecents && focusZone !== "recents") { sounds.navigate(); setFocusZone("recents") } }
      if (e.key === "ArrowDown") { acceptManualFocus(); if (focusZone === "recents") { sounds.navigate(); setFocusZone("actions") } }
      if (e.key === "Enter") launchFocused()
      if (e.key === "Escape") { acceptManualFocus(); setFocusZone("actions"); setActionIndex(0) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [focusZone, recentIndex, actionIndex, displayedRecentGames.length, hasRecents, showDepartConfirm, departChoice, needsControllerPrompt, launchFocused, acceptManualFocus, sounds])

  const isSetupFocus = installationReadiness === "unconfigured"
  const emptyStateText = isSetupFocus
    ? t("home.emptyUnconfigured")
    : t("home.emptyNoRecent")

  const playerName = activeProfile ? activeProfile.name : t("common.guest")
  const welcomeText = activeProfile
    ? t("home.welcomeBack", { name: playerName })
    : t("home.welcomeGuest")

  return (
    <div className={styles.home}>
      <div className={styles.worldLayer} aria-hidden="true">
        <div className={styles.deepField} />
        {/* Sanctuary-beyond-the-chamber layers -- one large hazed planet,
            the sun low in the horizon band, and a small off-axis moon,
            behind a richer star layer. All decorative/inert, positioned
            behind the architectural layers below them so the Library
            threshold and traveler presence stay visually dominant. */}
        <img src={starFieldAsset} alt="" aria-hidden="true" className={styles.starField} />
        <img src={planetAsset} alt="" aria-hidden="true" className={styles.planetDisc} />
        <img src={moonAsset} alt="" aria-hidden="true" className={styles.moonDisc} />
        <img src={sunAsset} alt="" aria-hidden="true" className={styles.sunDisc} />
        <div className={styles.distantCrown} />
        <div className={styles.horizonGlow} />
        <div className={styles.lightShafts} />
        <div className={styles.atmosphere} />
        <div className={styles.sanctuaryArch} />
        <div className={styles.foregroundFrame} />
      </div>

      <main className={styles.sanctuary}>
        <header className={styles.header}>
          <div className={styles.worldIdentity}>
            <img src={vesparaSealAsset} alt="" aria-hidden="true" className={styles.worldSeal} />
            <div className={styles.worldName}>{t("home.worldName")}</div>
            <div className={styles.worldPlace}>{t("home.sanctuary")}</div>
          </div>
          <div className={styles.playerIdentity}>
            <div className={styles.returnSignal} aria-hidden="true" />
            <div>
              <div className={styles.welcome}>{welcomeText}</div>
              <div className={styles.profileName}>{playerName}</div>
            </div>
          </div>
        </header>

        <div className={styles.body}>
          <section className={styles.memoryShelf} aria-labelledby="vespara-recent-title">
            <div className={styles.sectionHeading}>
              <div>
                <div id="vespara-recent-title" className={styles.sectionTitle}>{t("home.recentlyPlayed")}</div>
                <div className={styles.sectionSubtitle}>{t("home.memorySubtitle")}</div>
              </div>
              <div className={styles.memoryLine} aria-hidden="true" />
            </div>

            <div className={styles.memoryContent}>
              {loading ? (
                <div className={styles.empty}>{t("common.loading")}</div>
              ) : !hasRecents ? (
                <div className={styles.empty}>{emptyStateText}</div>
              ) : (
                <div
                  className={
                    styles.recentRow
                    + (displayedRecentGames.length === 1 ? " " + styles.singleRecentRow : "")
                    + (displayedRecentGames.length > 1 ? " " + styles.multiRecentRow : "")
                  }
                  ref={recentRowRef}
                >
                  {displayedRecentGames.map((g, i) => {
                    const id = g.id || g.profile
                    const art = artwork?.[id]
                    const focused = focusZone === "recents" && i === recentIndex
                    return (
                      <button
                        key={id}
                        ref={focused ? focusedRecentCardRef : null}
                        className={styles.recentCard + (focused ? " " + styles.focused : "")}
                        onClick={() => { acceptManualFocus(); setFocusZone("recents"); setRecentIndex(i); launch(g) }}
                        disabled={launching}
                      >
                        <span className={styles.memoryIndex} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                        {art?.capsule || art?.hero ? (
                          <img className={styles.recentArt} src={art.capsule || art.hero} alt="" />
                        ) : (
                          <div className={styles.recentArtFallback} aria-hidden="true">
                            <span className={styles.recentArtFallbackGlyph}>{g.system ? g.system[0] : "?"}</span>
                          </div>
                        )}
                        <div className={styles.recentTitle}>{g.title}</div>
                        <div className={styles.recentSystem}>{g.system}</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {launchError && (
            <div className={styles.launchError}>{launchError}</div>
          )}

          <section className={styles.destinationDeck} aria-label={t("home.destinationsLabel")}>
            <div className={styles.destinationAxis} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className={styles.actionRow}>
              {ACTIONS.map((action, i) => {
                const focused = focusZone === "actions" && i === actionIndex
                const detail = action === "library"
                  ? t("home.librarySubtitle")
                  : action === "switchPlayer"
                    ? t("home.switchPlayerSubtitle")
                    : t("home.departSubtitle")
                return (
                  <button
                    key={action}
                    className={styles.actionBtn + " " + styles[action + "Destination"] + (focused ? " " + styles.focused : "")}
                    onClick={() => { acceptManualFocus(); setFocusZone("actions"); setActionIndex(i); sounds.select(); runAction(action) }}
                  >
                    <span className={styles.destinationMarker} aria-hidden="true" />
                    <span className={styles.destinationCopy}>
                      <span className={styles.destinationName}>
                        {action === "library" && isSetupFocus ? t("home.setUp") : ACTION_LABELS[action]}
                      </span>
                      <span className={styles.destinationDetail}>{detail}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      {needsControllerPrompt && (
        <ControllerPrompt
          game={needsControllerPrompt}
          onDone={() => confirmLaunch(needsControllerPrompt)}
        />
      )}

      {showDepartConfirm && (
        <div className={styles.departOverlay}>
          <div className={styles.departChamber}>
            <div className={styles.departEyebrow}>{t("home.worldName")}</div>
            <div className={styles.departTitle}>{t("home.confirmDepartTitle")}</div>
            <div className={styles.departHint}>{t("home.confirmDepartHint")}</div>
            <div className={styles.departChoices}>
              <button
                className={styles.departBtn + (departChoice === 0 ? " " + styles.departBtnActive : "")}
                style={{ textTransform: 'uppercase' }}
                onClick={() => { sounds.select(); window.nuarcade?.quit?.() }}
              >{t("common.yes")}</button>
              <button
                className={styles.departBtn + (departChoice === 1 ? " " + styles.departBtnActive : "")}
                style={{ textTransform: 'uppercase' }}
                onClick={() => { sounds.back(); setShowDepartConfirm(false) }}
              >{t("common.no")}</button>
            </div>
          </div>
        </div>
      )}

      <ErrorToastContainer toasts={errorToasts} onDismiss={dismissError} />
    </div>
  )
}
