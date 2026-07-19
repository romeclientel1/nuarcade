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
