import { useState, useEffect, useRef, Component } from "react"
import Intro from "./components/Intro/Intro"
import Wheel from "./components/Wheel/Wheel"
import VesparaHome from "./components/VesparaHome/VesparaHome"
import CRT from "./components/CRT/CRT"
import PlayerSelect from "./components/PlayerSelect/PlayerSelect"
import { useProfiles } from "./context/ProfileContext"
import { useDestination } from "./hooks/useDestination"
import CoinCounter from "./components/CoinCounter/CoinCounter"
import { useTheme } from "./hooks/useTheme"
import { recoverLaunchSession, resolvePendingRestoration } from "./launchSession/startupRecovery.js"
import "./index.css"

// Controller debug overlay -- press D to toggle
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#000',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#ef4444', fontFamily: 'monospace', padding: 40, gap: 16
        }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>NuArcade render error</div>
          <div style={{ fontSize: 12, color: '#ff8888', maxWidth: 600, textAlign: 'center' }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '8px 24px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 4 }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [phase, setPhase] = useState("intro")
  const { profiles, activeProfile, addProfile, selectProfile, selectGuest, deleteProfile } = useProfiles()
  // App-level surface: Vespara Home <-> the existing Wheel/Library
  // experience. A second, independent useDestination() instance --
  // completely separate from Wheel's own internal one governing
  // Help/Stats. null = Home, "library" = Wheel. Named locally so it's
  // clear this instance has nothing to do with Wheel's destinations.
  // back: backSurface is not yet wired to anything -- Wheel's own return
  // path is pending confirmation (see report). Only what's actually used
  // is destructured here to avoid dead code in the meantime.
  const {
    currentDestination: currentSurface,
    navigate: navigateSurface,
    goHome: goToSurfaceRoot,
  } = useDestination()
  const { themeId, setTheme } = useTheme()
  // Settings already persists this to the backend config under crtEffect --
  // this just loads that saved value on launch and mirrors live changes so
  // the CRT overlay actually reflects what's configured instead of being
  // permanently hardcoded on.
  const [crtEnabled, setCrtEnabled] = useState(true)
  useEffect(() => {
    window.nuarcade?.getConfig?.().then(cfg => {
      if (cfg && typeof cfg.crtEffect === 'boolean') setCrtEnabled(cfg.crtEffect)
    }).catch(() => {})
  }, [])

  // Startup launch-session recovery -- runs once, before Player Select, so
  // a stale nonterminal session from a previous crash/reload/restart never
  // blocks a new launch (sessionStore's own launch guard would otherwise
  // refuse every launch attempt until this resolves). Lifecycle
  // reconciliation (outcome, Recently Played, LIVING) happens immediately
  // here, using the session's own captured profileId -- never gated on
  // whatever profile happens to be active right now. Destination/focus
  // restoration is deliberately DEFERRED to the separate effect below:
  // activeProfileId is reliably null at this point (ProfileContext always
  // starts a fresh session at null until Player Select runs), and null is
  // an unresolved state, not evidence the session belongs to someone else
  // -- so it must not be treated as a profile mismatch here. See
  // startupRecovery.js for the full separation.
  const [pendingRestoration, setPendingRestoration] = useState(null)
  useEffect(() => {
    let cancelled = false
    let unsubscribe = null
    recoverLaunchSession({
      getLaunchLifecycleStatus: window.nuarcade?.getLaunchLifecycleStatus,
      onLaunchLifecycleTerminal: window.nuarcade?.onLaunchLifecycleTerminal,
    }).then((outcome) => {
      if (cancelled) {
        if (typeof outcome.unsubscribe === "function") outcome.unsubscribe()
        return
      }
      unsubscribe = outcome.unsubscribe || null
      if (outcome.pendingRestoration) setPendingRestoration(outcome.pendingRestoration)
    }).catch(() => {})
    return () => {
      cancelled = true
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [])

  // Applies the pending restoration exactly once, only once a real profile
  // has actually been resolved this session (phase === "main", reached via
  // handlePlayerSelect/handleGuest/handleAddProfile below). Restores the
  // captured origin only if the selected profile matches the one the
  // session was captured for (and that profile still exists) -- otherwise
  // falls back to Home, never exposing another profile's Library position.
  const appliedRestorationRef = useRef(false)
  useEffect(() => {
    if (!pendingRestoration) return
    if (phase !== "main") return
    if (appliedRestorationRef.current) return
    if (!activeProfile) return
    appliedRestorationRef.current = true
    const restoration = resolvePendingRestoration(pendingRestoration, {
      selectedProfileId: activeProfile.id, profiles,
    })
    if (restoration.destination === "library") navigateSurface("library")
    else goToSurfaceRoot()
  }, [pendingRestoration, phase, activeProfile, profiles, navigateSurface, goToSurfaceRoot])

  const handleIntroComplete = () => setPhase("playerSelect")

  const handlePlayerSelect = (player) => {
    selectProfile(player.id)
    setPhase("main")
  }

  const handleGuest = () => {
    selectGuest()
    setPhase("main")
  }

  const handleAddProfile = (name) => {
    addProfile(name)
    setPhase("main")
  }

  const handleReturnToPlayerSelect = () => {
    // Reset the surface to Home so selecting a different player next
    // cannot land them directly inside the previous player's Library view.
    goToSurfaceRoot()
    setPhase("playerSelect")
  }

  const handleEnterLibrary = () => navigateSurface("library")

  return (
    <ErrorBoundary>
      <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>

        {phase === "intro" && (
          <Intro onComplete={handleIntroComplete} />
        )}

        {phase === "playerSelect" && (
          <PlayerSelect
            profiles={profiles}
            onSelect={handlePlayerSelect}
            onGuest={handleGuest}
            onAdd={handleAddProfile}
            onDelete={deleteProfile}
          />
        )}

        {phase === "main" && (
          currentSurface === "library" ? (
            <Wheel
              activeProfile={activeProfile}
              onSwitchPlayer={handleReturnToPlayerSelect}
              onReturnHome={goToSurfaceRoot}
              crtEnabled={crtEnabled}
              onCRTChange={setCrtEnabled}
              themeId={themeId}
              onThemeChange={setTheme}
            />
          ) : (
            <VesparaHome
              onEnterLibrary={handleEnterLibrary}
              onSwitchPlayer={handleReturnToPlayerSelect}
            />
          )
        )}

        <CRT enabled={crtEnabled} />
        <CoinCounter />

      </div>
    </ErrorBoundary>
  )
}
