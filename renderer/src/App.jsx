import { useState, useEffect, Component } from "react"
import Intro from "./components/Intro/Intro"
import Wheel from "./components/Wheel/Wheel"
import Updater from "./components/Updater/Updater"
import CRT from "./components/CRT/CRT"
import UpdateBanner from "./components/UpdateBanner/UpdateBanner"
import PlayerSelect from "./components/PlayerSelect/PlayerSelect"
import { useAutoUpdate } from "./hooks/useAutoUpdate"
import { usePlayerProfiles } from "./hooks/usePlayerProfiles"
import VolumeOverlay from "./components/VolumeOverlay/VolumeOverlay"
import CoinCounter from "./components/CoinCounter/CoinCounter"
import { useTheme } from "./hooks/useTheme"
import "./index.css"

// Error boundary catches render crashes and shows diagnostic info
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
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
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', maxWidth: 600, textAlign: 'center' }}>
            {this.state.error.stack?.split('\n').slice(0,5).join(' | ')}
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
  const [showUpdater, setShowUpdater] = useState(false)
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const { updateAvailable, remoteVersion, handleDownload } = useAutoUpdate()
  const { profiles, addProfile, deleteProfile } = usePlayerProfiles()
  useTheme()

  // After intro, always go to playerSelect -- no wizard
  const handleIntroComplete = () => setPhase("playerSelect")

  // Player selected -- go to main wheel
  const handlePlayerSelect = (player) => {
    setCurrentPlayer(player)
    setPhase("main")
  }

  const handleGuest = () => {
    setCurrentPlayer({ name: 'Guest', id: 'guest' })
    setPhase("main")
  }

  const handleAddProfile = (name) => {
    const p = addProfile(name)
    setCurrentPlayer(p)
    setPhase("main")
  }

  // Return to INSERT COIN from main screen
  const handleReturnToPlayerSelect = () => {
    setCurrentPlayer(null)
    setPhase("playerSelect")
  }

  return (
    <ErrorBoundary>
      <CRT>
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
            onRestartWizard={null}
          />
        )}

        {phase === "main" && (
          <>
            <Wheel
              player={currentPlayer}
              onExit={handleReturnToPlayerSelect}
            />
            {updateAvailable && (
              <UpdateBanner
                remoteVersion={remoteVersion}
                onUpdate={() => setShowUpdater(true)}
              />
            )}
          </>
        )}

        {showUpdater && (
          <Updater onClose={() => setShowUpdater(false)} />
        )}

        <VolumeOverlay />
        <CoinCounter />
      </CRT>
    </ErrorBoundary>
  )
}
