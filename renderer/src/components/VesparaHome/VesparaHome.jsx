import { useState, useEffect, useCallback, useMemo } from "react"
import { useProfiles } from "../../context/ProfileContext"
import { useRecentGames } from "../../hooks/useRecentGames"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useGameLauncher } from "../../hooks/useGameLauncher"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad"
import { useErrorToast, ErrorToastContainer } from "../Wheel/ErrorToast"
import ControllerPrompt from "../ControllerPrompt/ControllerPrompt"
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
  const { recentGames, addRecentlyPlayed, loading } = useRecentGames(RECENT_LIMIT)
  const { startSession, endSession, recordLaunch } = usePlaytime()
  const { toasts: errorToasts, showError, dismiss: dismissError } = useErrorToast()

  const {
    launch, confirmLaunch, dismissControllerPrompt,
    launching, launchError, needsControllerPrompt,
  } = useGameLauncher({
    addRecentlyPlayed,
    startSession, endSession, recordLaunch,
    showError,
    // No background video in Home -- onLaunchStart/onReturn are optional
    // and Wheel-specific (pausing/resuming its own bg video refs). Home
    // has nothing equivalent, so both are simply omitted.
  })

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
  const hasRecents = recentGames.length > 0
  const [focusZone, setFocusZone] = useState(hasRecents ? "recents" : "actions")
  const [recentIndex, setRecentIndex] = useState(0)
  const [actionIndex, setActionIndex] = useState(0)

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
    if (focusZone === "recents" && recentGames[recentIndex]) {
      launch(recentGames[recentIndex])
    } else if (focusZone === "actions") {
      runAction(ACTIONS[actionIndex])
    }
  }, [focusZone, recentGames, recentIndex, actionIndex, launch, runAction])

  // Main Home controller handling -- disabled while the Depart
  // confirmation or a controller hint prompt is showing, matching the
  // same "exactly one active listener" discipline Wheel already uses for
  // its own overlays.
  useOverlayGamepad({
    enabled: !showDepartConfirm && !needsControllerPrompt,
    onLeft: () => {
      if (focusZone === "recents") setRecentIndex(i => Math.max(0, i - 1))
      else setActionIndex(i => Math.max(0, i - 1))
    },
    onRight: () => {
      if (focusZone === "recents") setRecentIndex(i => Math.min(recentGames.length - 1, i + 1))
      else setActionIndex(i => Math.min(ACTIONS.length - 1, i + 1))
    },
    onUp: () => { if (hasRecents) setFocusZone("recents") },
    onDown: () => { if (focusZone === "recents") setFocusZone("actions") },
    onConfirm: launchFocused,
    // Back must not unexpectedly quit or leave Home. A safe, deterministic
    // default: return focus to the action row's first entry (Library).
    // Depart stays an explicit, separate action -- never triggered by Back.
    onClose: () => { setFocusZone("actions"); setActionIndex(0) },
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
        if (focusZone === "recents") setRecentIndex(i => Math.max(0, i - 1))
        else setActionIndex(i => Math.max(0, i - 1))
      }
      if (e.key === "ArrowRight") {
        if (focusZone === "recents") setRecentIndex(i => Math.min(recentGames.length - 1, i + 1))
        else setActionIndex(i => Math.min(ACTIONS.length - 1, i + 1))
      }
      if (e.key === "ArrowUp")   { if (hasRecents) setFocusZone("recents") }
      if (e.key === "ArrowDown") { if (focusZone === "recents") setFocusZone("actions") }
      if (e.key === "Enter") launchFocused()
      if (e.key === "Escape") { setFocusZone("actions"); setActionIndex(0) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [focusZone, recentIndex, actionIndex, recentGames.length, hasRecents, showDepartConfirm, departChoice, needsControllerPrompt, launchFocused])

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
          <div className={styles.empty}>No recent games yet -- head into the Library to get started.</div>
        ) : (
          <div className={styles.recentRow}>
            {recentGames.map((g, i) => {
              const id = g.id || g.profile
              const art = artwork?.[id]
              const focused = focusZone === "recents" && i === recentIndex
              return (
                <button
                  key={id}
                  className={styles.recentCard + (focused ? " " + styles.focused : "")}
                  onClick={() => { setFocusZone("recents"); setRecentIndex(i); launch(g) }}
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
              onClick={() => { setFocusZone("actions"); setActionIndex(i); runAction(action) }}
            >
              {ACTION_LABELS[action]}
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
