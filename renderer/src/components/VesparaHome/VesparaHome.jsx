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
import { useSanctuaryAmbience } from "./useSanctuaryAmbience.js"
import DepartConfirmation from "../Depart/DepartConfirmation.jsx"
import styles from "./VesparaHome.module.css"
import sanctuaryBackground from "./assets/sanctuary-arrival-hall.png"
import sanctuaryArrivalHall from "./assets/sanctuary-arrival-hall.png"
import destinationLibrary from "./assets/destination-library.png"
import destinationControlRoom from "./assets/destination-control-room.png"
import destinationSwitchPlayer from "./assets/destination-switch-player.png"
import vesparaSealAsset from "../../assets/brand/vespara-symbol-simplified.svg"

const RECENT_LIMIT = 8
const ACTIONS = ["library", "controlRoom", "switchPlayer", "depart"]
const DESTINATION_VISUALS = {
  library: `url("${destinationLibrary}")`,
  controlRoom: `url("${destinationControlRoom}")`,
  switchPlayer: `url("${destinationSwitchPlayer}")`,
  depart: `url("${sanctuaryArrivalHall}")`,
}

// VesparaHome -------------------------------------------------------------
// Vespara's central arrival space after Traveler Recognition: identify the
// active Traveler, revisit a recent game, or continue deeper into Library.
export default function VesparaHome({
  onEnterLibrary, onEnterControlRoom, onSwitchPlayer, restorationRequest,
  initialFocusHint, onFocusHintConsumed,
  uiSoundsEnabled, uiSoundVolume,
}) {
  const { t } = useI18n()
  const ACTION_LABELS = {
    library: t("home.libraryDestination"),
    controlRoom: t("home.controlRoomDestination"),
    switchPlayer: t("home.switchPlayer"),
    depart: t("home.depart"),
  }
  const { activeProfile } = useProfiles()
  const { recentGamesRaw, games, addRecentlyPlayed, loading } = useRecentGames(RECENT_LIMIT)
  const { startSession, endSession, recordLaunch } = usePlaytime()
  const { toasts: errorToasts, showError, dismiss: dismissError } = useErrorToast()
  // Pass the raw config values straight through -- useArcadeSounds is the
  // single normalization/conversion boundary (0-100 percent -> 0-1 gain
  // scale); pre-converting here would be a second, redundant conversion.
  const sounds = useArcadeSounds({ enabled: uiSoundsEnabled, volume: uiSoundVolume })
  const {
    fadeOutAndStop: fadeOutSanctuaryAmbience,
    pauseForLaunch: pauseSanctuaryAmbienceForLaunch,
    resumeFromLaunch: resumeSanctuaryAmbienceFromLaunch,
  } = useSanctuaryAmbience()

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
    // VES-R0-001: Home has no background video the way Wheel does, but it
    // does have the Sanctuary ambient loop -- the same category of
    // Vespara-owned media Wheel already pauses/resumes around a launch via
    // these same two callbacks. Wiring it here (rather than only through
    // activateAction, which Recently Played never calls) means every launch
    // path that goes through this single useGameLauncher instance -- the
    // Recent row's click handler, its gamepad/keyboard confirm path, and any
    // future Home launch surface -- silences ambience before the external
    // game opens and restores it only once useGameLauncher itself confirms
    // return (focus/visibilitychange), without needing to duplicate that
    // logic at each call site.
    onLaunchStart: pauseSanctuaryAmbienceForLaunch,
    onReturn: resumeSanctuaryAmbienceFromLaunch,
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
  const actionRefs = useRef({})
  const departTriggerRef = useRef(null)
  const setActionRef = useCallback((action, node) => {
    if (node) actionRefs.current[action] = node
    else delete actionRefs.current[action]
  }, [])

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
    // A pending returning-destination hint (see below) always wins over the
    // derived default, regardless of which effect's state update actually
    // commits first -- without this, a real race is reachable: `loading`
    // resolving asynchronously can re-run this effect in a render where
    // hasAcceptedInitialFocus hasn't yet reflected the hint effect's own
    // setHasAcceptedInitialFocus(true) from the very same mount, letting
    // this effect win the last write and silently override the hint back
    // to the Library default. Reproduced live during this milestone's own
    // preview verification (Return from Control Room landed focus on
    // Library instead of the Control Room tile).
    if (initialFocusHint) return
    if (loading) return // wait for the async library load to settle first
    if (initialFocus.type === "recent-game") {
      const idx = displayedRecentGames.findIndex(g => (g.id || g.profile) === initialFocus.gameId)
      if (idx >= 0) { setFocusZone("recents"); setRecentIndex(idx); return }
    }
    // 'setup-connection' (true first-run: no playable game and no play
    // history at all -- see selectInstallationReadiness/selectInitialHomeFocus)
    // now focuses the Control Room tile, not Library -- new users connect
    // their systems there before the Library has anything to show. This
    // only touches the derived focus target; detection (installationReadiness)
    // and completion (it naturally stops being 'unconfigured' once a game
    // becomes playable) are untouched. See the render section for how this
    // same isSetupFocus condition relabels that tile's CTA text.
    if (initialFocus.type === "setup-connection") {
      setFocusZone("actions")
      setActionIndex(ACTIONS.indexOf("controlRoom"))
      return
    }
    // 'library' | 'first-game' (not produced today, see selectInitialHomeFocus)
    // | 'none' all resolve to focusing the Library action slot, unchanged
    // for established users.
    setFocusZone("actions")
    setActionIndex(0)
  }, [hasAcceptedInitialFocus, initialFocusHint, loading, initialFocus, displayedRecentGames])

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

  // Returning-destination focus hint -- App passes this when the Traveler
  // just came back from a live in-session destination (Library or Control
  // Room) rather than a fresh arrival, so focus lands back on that
  // destination's own tile instead of the usual derived default. Distinct
  // from restorationRequest above (that one is startup/crash recovery);
  // this is same-session navigation. Declared after both prior focus
  // effects so it wins the same-commit ordering, consumed exactly once via
  // onFocusHintConsumed so a later, unrelated Home mount (e.g. after
  // switching players) never sees a stale hint.
  useEffect(() => {
    if (!initialFocusHint) return
    const idx = ACTIONS.indexOf(initialFocusHint)
    if (idx < 0) return
    setFocusZone("actions")
    setActionIndex(idx)
    setHasAcceptedInitialFocus(true)
    onFocusHintConsumed?.()
  }, [initialFocusHint, onFocusHintConsumed])

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

  // Keep the browser's real focus synchronized with the existing Sanctuary
  // navigation model. Keyboard/controller movement already owns focusZone and
  // the two indexes; this effect only projects that same selection onto the
  // mounted button. It deliberately yields while data is settling or a child
  // prompt owns focus, and requestAnimationFrame lets React finish swapping
  // conditional Recent content before resolving the selected ref.
  useEffect(() => {
    if (loading || showDepartConfirm || needsControllerPrompt) return
    const frame = requestAnimationFrame(() => {
      const action = ACTIONS[actionIndex]
      const target = focusZone === "actions"
        ? actionRefs.current[action]
        : focusedRecentCardRef.current
      if (!target || target.disabled || document.activeElement === target) return
      target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [focusZone, recentIndex, actionIndex, loading, showDepartConfirm, needsControllerPrompt])

  const runAction = useCallback((action) => {
    if (action === "library") onEnterLibrary?.()
    else if (action === "controlRoom") onEnterControlRoom?.()
    else if (action === "switchPlayer") onSwitchPlayer?.()
    else if (action === "depart") { setDepartChoice(1); setShowDepartConfirm(true) }
  }, [onEnterLibrary, onEnterControlRoom, onSwitchPlayer])

  // Navigation remains immediate; the ambience controller owns its short
  // non-blocking fade after Home unmounts. Depart only leaves the world after
  // confirmation, so opening/cancelling its safe-default dialog stays audible.
  const activateAction = useCallback((action) => {
    if (action === "library" || action === "controlRoom" || action === "switchPlayer") fadeOutSanctuaryAmbience()
    runAction(action)
  }, [fadeOutSanctuaryAmbience, runAction])

  const confirmDepart = useCallback(() => {
    fadeOutSanctuaryAmbience()
    // A missing bridge (window.nuarcade or .quit undefined) is already safe
    // via optional chaining -- this additionally swallows a REJECTED quit-app
    // IPC round-trip (e.g. the main process throwing) so a failed quit can
    // never surface as an unhandled promise rejection in the renderer.
    window.nuarcade?.quit?.()?.catch?.(() => {})
  }, [fadeOutSanctuaryAmbience])

  const cancelDepart = useCallback(() => {
    setShowDepartConfirm(false)
    setDepartChoice(1)
    requestAnimationFrame(() => departTriggerRef.current?.focus())
  }, [])

  const chooseDepart = useCallback((nextChoice) => {
    sounds.navigate()
    setDepartChoice(nextChoice)
  }, [sounds])

  const acceptDepart = useCallback(() => {
    sounds.select()
    confirmDepart()
  }, [sounds, confirmDepart])

  const declineDepart = useCallback(() => {
    sounds.back()
    cancelDepart()
  }, [sounds, cancelDepart])

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
      activateAction(ACTIONS[actionIndex])
    }
  }, [focusZone, displayedRecentGames, recentIndex, actionIndex, launch, activateAction, sounds])

  // Main Home controller handling -- disabled while the Depart
  // confirmation or a controller hint prompt is showing, matching the
  // same "exactly one active listener" discipline Wheel already uses for
  // its own overlays.
  //
  // Mirrored into refs (updated on every render, not inside an effect) so
  // the native keydown handler below can be registered exactly once and
  // still always read current values -- registering it with a dependency
  // array that includes focusZone/actionIndex/etc instead (as this used
  // to) re-subscribes on every navigation, and two keydown events close
  // enough together can land before that resubscription completes,
  // reading a stale actionIndex. This is the same class of bug Control
  // Room Milestone C1 found and fixed in its own root navigation.
  const focusZoneRef = useRef(focusZone); focusZoneRef.current = focusZone
  const recentIndexRef = useRef(recentIndex); recentIndexRef.current = recentIndex
  const actionIndexRef = useRef(actionIndex); actionIndexRef.current = actionIndex
  const hasRecentsRef = useRef(hasRecents); hasRecentsRef.current = hasRecents
  const showDepartConfirmRef = useRef(showDepartConfirm); showDepartConfirmRef.current = showDepartConfirm
  const needsControllerPromptRef = useRef(needsControllerPrompt); needsControllerPromptRef.current = needsControllerPrompt
  const displayedRecentGamesRef = useRef(displayedRecentGames); displayedRecentGamesRef.current = displayedRecentGames
  const launchFocusedRef = useRef(launchFocused); launchFocusedRef.current = launchFocused

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

  // Keyboard parity -- mouse and keyboard must remain functional
  // alongside the controller. Registered once (empty deps); every value it
  // reads comes from the refs mirrored above, so it never goes stale --
  // see the comment on those refs for why that matters.
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return
      if (showDepartConfirmRef.current) return
      if (needsControllerPromptRef.current) return
      const focusZone = focusZoneRef.current
      const recentIndex = recentIndexRef.current
      const actionIndex = actionIndexRef.current
      const displayedRecentGames = displayedRecentGamesRef.current
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        acceptManualFocus()
        if (focusZone === "recents") {
          if (recentIndex > 0) { sounds.navigate(); setRecentIndex(i => Math.max(0, i - 1)) }
        } else if (actionIndex > 0) {
          sounds.navigate(); setActionIndex(i => Math.max(0, i - 1))
        }
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        acceptManualFocus()
        if (focusZone === "recents") {
          if (recentIndex < displayedRecentGames.length - 1) { sounds.navigate(); setRecentIndex(i => Math.min(displayedRecentGames.length - 1, i + 1)) }
        } else if (actionIndex < ACTIONS.length - 1) {
          sounds.navigate(); setActionIndex(i => Math.min(ACTIONS.length - 1, i + 1))
        }
      }
      if (e.key === "ArrowUp")   { e.preventDefault(); acceptManualFocus(); if (hasRecentsRef.current && focusZone !== "recents") { sounds.navigate(); setFocusZone("recents") } }
      if (e.key === "ArrowDown") { e.preventDefault(); acceptManualFocus(); if (focusZone === "recents") { sounds.navigate(); setFocusZone("actions") } }
      // preventDefault matters here specifically: without it, if this Enter
      // press navigates to Control Room (which moves real DOM focus onto
      // its own Return button on mount), the browser's own default action
      // for an unprevented Enter keydown can synthesize a click on
      // whatever element now holds focus -- immediately bouncing back out.
      // Reproduced live during this milestone's own preview verification.
      if (e.key === "Enter") { e.preventDefault(); launchFocusedRef.current() }
      if (e.key === "Escape") { e.preventDefault(); acceptManualFocus(); setFocusZone("actions"); setActionIndex(0) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const isSetupFocus = installationReadiness === "unconfigured"
  const emptyStateText = isSetupFocus
    ? t("home.emptyUnconfigured")
    : t("home.emptyNoRecent")

  const playerName = activeProfile ? activeProfile.name : t("common.guest")
  const welcomeText = activeProfile
    ? t("home.welcomeBack", { name: playerName })
    : t("home.welcomeGuest")
  const recentStatusText = loading
    ? t("common.loading")
    : hasRecents
      ? t("home.memorySubtitle")
      : "None yet"
  const libraryStatusText = loading
    ? t("common.loading")
    : games.length > 0
      ? "Ready"
      : "Empty"

  return (
    <div className={styles.home}>
      <div className={styles.worldLayer} aria-hidden="true">
        <img
          src={sanctuaryBackground}
          alt=""
          aria-hidden="true"
          className={styles.sanctuaryPlate}
        />
        <div className={styles.environmentVeil} />
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
          <section className={styles.arrivalConsole} aria-label={t("home.sanctuary")}>
            <div className={styles.consoleOrnament} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <aside className={styles.statusPanel} aria-label={`${t("home.sanctuary")} status`}>
              <div className={styles.statusHeading}>
                <strong>{t("home.sanctuary")}</strong>
                <span>Status</span>
              </div>
              <dl className={styles.statusList}>
                <div className={styles.statusRow}>
                  <dt>{t("playerSelect.headline")}</dt>
                  <dd>{playerName}</dd>
                </div>
                <div className={styles.statusRow}>
                  <dt>{t("home.recentlyPlayed")}</dt>
                  <dd>{recentStatusText}</dd>
                </div>
                <div className={styles.statusRow}>
                  <dt>{t("home.library")}</dt>
                  <dd>{libraryStatusText}</dd>
                </div>
              </dl>
              <div className={styles.statusFoot}>
                <span className={styles.statusLamp} aria-hidden="true" />
                <span>{isSetupFocus ? t("home.enterControlRoom") : t("home.librarySubtitle")}</span>
              </div>
            </aside>

            <div className={styles.arrivalVista} aria-hidden="true">
              <div className={styles.vistaHalo} />
              <img src={vesparaSealAsset} alt="" className={styles.vistaSeal} />
              <div className={styles.vistaWordmark}>{t("home.worldName")}</div>
              <div className={styles.vistaWelcome}>{welcomeText}</div>
              <div className={styles.vistaRule}><span /></div>
            </div>

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
                          aria-current={focused ? "true" : undefined}
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
                  : action === "controlRoom"
                    ? t("controlRoom.subtitle")
                    : action === "switchPlayer"
                      ? t("home.switchPlayerSubtitle")
                      : t("home.departSubtitle")
                return (
                  <button
                    key={action}
                    ref={action === "depart" ? departTriggerRef : undefined}
                    className={styles.actionBtn + " " + styles[action + "Destination"] + (focused ? " " + styles.focused : "")}
                    style={{ "--destination-image": DESTINATION_VISUALS[action] }}
                    aria-current={focused ? "true" : undefined}
                    onClick={() => { acceptManualFocus(); setFocusZone("actions"); setActionIndex(i); sounds.select(); activateAction(action) }}
                  >
                    <span
                      ref={(node) => setActionRef(action, node?.parentElement || null)}
                      className={styles.destinationMarker}
                      aria-hidden="true"
                    />
                    <span className={styles.destinationCopy}>
                      <span className={styles.destinationName}>
                        {/* First-run onboarding now points to the Control
                            Room, not the Library -- see the isSetupFocus
                            comment above and the initial-focus effect,
                            which targets this same tile. */}
                        {action === "controlRoom" && isSetupFocus ? t("home.enterControlRoom") : ACTION_LABELS[action]}
                      </span>
                      <span className={styles.destinationDetail} aria-hidden="true">{detail}</span>
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
        <DepartConfirmation
          eyebrow={t("home.worldName")}
          title={t("home.confirmDepartTitle")}
          hint={t("home.confirmDepartHint")}
          yesLabel={t("depart.depart")}
          noLabel={t("depart.remain")}
          choice={departChoice}
          onChoiceChange={chooseDepart}
          onConfirm={acceptDepart}
          onCancel={declineDepart}
        />
      )}

      <ErrorToastContainer toasts={errorToasts} onDismiss={dismissError} />
    </div>
  )
}
