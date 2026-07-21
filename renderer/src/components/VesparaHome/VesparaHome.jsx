import { useState, useEffect, useCallback, useMemo } from "react"
import { useProfiles } from "../../context/ProfileContext"
import { useRecentGames } from "../../hooks/useRecentGames"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useGameLauncher } from "../../hooks/useGameLauncher"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad"
import { useErrorToast, ErrorToastContainer } from "../Wheel/ErrorToast"
import ControllerPrompt from "../ControllerPrompt/ControllerPrompt"
import {
  selectProfileHistoryStatus,
  selectInstallationReadiness,
  selectValidRecentGames,
} from "../../selectors/profileReadiness"
import { selectInitialHomeFocus } from "../../selectors/homeEntry"
import { buildHomeOriginContext } from "./homeLaunchOrigin.js"
import styles from "./VesparaHome.module.css"

const RECENT_LIMIT = 8
const ACTIONS = ["library", "switchPlayer", "depart"]
const ACTION_LABELS = { library: "Library", switchPlayer: "Switch Player", depart: "Depart" }

// VesparaHome -------------------------------------------------------------
// The neutral, temporary Vespara Home shell. Proves the app can exist
// outside Wheel: identify the active player, show Recently Played, launch
// one directly, or enter the existing Wheel/Library experience. Not the
// final Vespara world -- no cinematic transitions, camera movement, or
// environmental design here, deliberately.
export default function VesparaHome({ onEnterLibrary, onSwitchPlayer }) {
  const { activeProfile } = useProfiles()
  const { recentGamesRaw, games, addRecentlyPlayed, loading } = useRecentGames(RECENT_LIMIT)
  const { startSession, endSession, recordLaunch } = usePlaytime()
  const { toasts: errorToasts, showError, dismiss: dismissError } = useErrorToast()

  const activeProfileId = activeProfile?.id ?? null

  const {
    launch, confirmLaunch, dismissControllerPrompt,
    launching, launchError, needsControllerPrompt,
  } = useGameLauncher({
    addRecentlyPlayed,
    activeProfileId,
    startSession, endSession, recordLaunch,
    showError,
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

  const [showDepartConfirm, setShowDepartConfirm] = useState(false)
  const [departChoice, setDepartChoice] = useState(1) // 0 = Yes, 1 = No (default safe)

  const runAction = useCallback((action) => {
    if (action === "library") onEnterLibrary?.()
    else if (action === "switchPlayer") onSwitchPlayer?.()
    else if (action === "depart") { setDepartChoice(1); setShowDepartConfirm(true) }
  }, [onEnterLibrary, onSwitchPlayer])

  const launchFocused = useCallback(() => {
    if (focusZone === "recents" && displayedRecentGames[recentIndex]) {
      launch(displayedRecentGames[recentIndex])
    } else if (focusZone === "actions") {
      runAction(ACTIONS[actionIndex])
    }
  }, [focusZone, displayedRecentGames, recentIndex, actionIndex, launch, runAction])

  // Main Home controller handling -- disabled while the Depart
  // confirmation or a controller hint prompt is showing, matching the
  // same "exactly one active listener" discipline Wheel already uses for
  // its own overlays.
  useOverlayGamepad({
    enabled: !showDepartConfirm && !needsControllerPrompt,
    onLeft: () => {
      acceptManualFocus()
      if (focusZone === "recents") setRecentIndex(i => Math.max(0, i - 1))
      else setActionIndex(i => Math.max(0, i - 1))
    },
    onRight: () => {
      acceptManualFocus()
      if (focusZone === "recents") setRecentIndex(i => Math.min(displayedRecentGames.length - 1, i + 1))
      else setActionIndex(i => Math.min(ACTIONS.length - 1, i + 1))
    },
    onUp: () => { acceptManualFocus(); if (hasRecents) setFocusZone("recents") },
    onDown: () => { acceptManualFocus(); if (focusZone === "recents") setFocusZone("actions") },
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
    onLeft:  () => setDepartChoice(0),
    onRight: () => setDepartChoice(1),
    onConfirm: () => {
      if (departChoice === 0) window.nuarcade?.quit?.()
      else setShowDepartConfirm(false)
    },
    onClose: () => setShowDepartConfirm(false),
  })

  // Keyboard parity -- mouse and keyboard must remain functional
  // alongside the controller.
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return
      if (showDepartConfirm) {
        if (e.key === "ArrowLeft")  setDepartChoice(0)
        if (e.key === "ArrowRight") setDepartChoice(1)
        if (e.key === "Enter") { if (departChoice === 0) window.nuarcade?.quit?.(); else setShowDepartConfirm(false) }
        if (e.key === "Escape") setShowDepartConfirm(false)
        return
      }
      if (needsControllerPrompt) return
      if (e.key === "ArrowLeft") {
        acceptManualFocus()
        if (focusZone === "recents") setRecentIndex(i => Math.max(0, i - 1))
        else setActionIndex(i => Math.max(0, i - 1))
      }
      if (e.key === "ArrowRight") {
        acceptManualFocus()
        if (focusZone === "recents") setRecentIndex(i => Math.min(displayedRecentGames.length - 1, i + 1))
        else setActionIndex(i => Math.min(ACTIONS.length - 1, i + 1))
      }
      if (e.key === "ArrowUp")   { acceptManualFocus(); if (hasRecents) setFocusZone("recents") }
      if (e.key === "ArrowDown") { acceptManualFocus(); if (focusZone === "recents") setFocusZone("actions") }
      if (e.key === "Enter") launchFocused()
      if (e.key === "Escape") { acceptManualFocus(); setFocusZone("actions"); setActionIndex(0) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [focusZone, recentIndex, actionIndex, displayedRecentGames.length, hasRecents, showDepartConfirm, departChoice, needsControllerPrompt, launchFocused, acceptManualFocus])

  const isSetupFocus = installationReadiness === "unconfigured"
  const emptyStateText = isSetupFocus
    ? "No games configured yet -- head into the Library to set up a connection."
    : "No recent games yet -- head into the Library to get started."

  return (
    <div className={styles.home}>
      <div className={styles.header}>
        <div className={styles.profileName}>
          {activeProfile ? activeProfile.name : "Guest"}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.sectionTitle}>Recently Played</div>
        {loading ? (
          <div className={styles.empty}>Loading...</div>
        ) : !hasRecents ? (
          <div className={styles.empty}>{emptyStateText}</div>
        ) : (
          <div className={styles.recentRow}>
            {displayedRecentGames.map((g, i) => {
              const id = g.id || g.profile
              const art = artwork?.[id]
              const focused = focusZone === "recents" && i === recentIndex
              return (
                <button
                  key={id}
                  className={styles.recentCard + (focused ? " " + styles.focused : "")}
                  onClick={() => { acceptManualFocus(); setFocusZone("recents"); setRecentIndex(i); launch(g) }}
                  disabled={launching}
                >
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

        {launchError && (
          <div className={styles.launchError}>{launchError}</div>
        )}

        <div className={styles.actionRow}>
          {ACTIONS.map((action, i) => (
            <button
              key={action}
              className={styles.actionBtn + (focusZone === "actions" && i === actionIndex ? " " + styles.focused : "")}
              onClick={() => { acceptManualFocus(); setFocusZone("actions"); setActionIndex(i); runAction(action) }}
            >
              {action === "library" && isSetupFocus ? "Set Up" : ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </div>

      {needsControllerPrompt && (
        <ControllerPrompt
          game={needsControllerPrompt}
          onDone={() => confirmLaunch(needsControllerPrompt)}
        />
      )}

      {showDepartConfirm && (
        <div className={styles.departOverlay}>
          <div className={styles.departTitle}>EXIT NUARCADE?</div>
          <div className={styles.departChoices}>
            <button
              className={styles.departBtn + (departChoice === 0 ? " " + styles.departBtnActive : "")}
              onClick={() => window.nuarcade?.quit?.()}
            >YES</button>
            <button
              className={styles.departBtn + (departChoice === 1 ? " " + styles.departBtnActive : "")}
              onClick={() => setShowDepartConfirm(false)}
            >NO</button>
          </div>
        </div>
      )}

      <ErrorToastContainer toasts={errorToasts} onDismiss={dismissError} />
    </div>
  )
}
