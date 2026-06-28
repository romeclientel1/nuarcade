import { useState, useEffect, useRef, Component } from "react"
import Intro from "./components/Intro/Intro"
import Wheel from "./components/Wheel/Wheel"
import CRT from "./components/CRT/CRT"
import PlayerSelect from "./components/PlayerSelect/PlayerSelect"
import { usePlayerProfiles } from "./hooks/usePlayerProfiles"
import CoinCounter from "./components/CoinCounter/CoinCounter"
import { useTheme } from "./hooks/useTheme"
import "./index.css"

// Controller debug overlay -- press D to toggle
function ControllerDebug({ onClose }) {
  const [state, setState] = useState({ connected: false, buttons: [], axes: [] })
  const rafRef = useRef(null)

  useEffect(() => {
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      let gp = null
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].connected) { gp = pads[i]; break }
      }
      if (gp) {
        setState({
          connected: true,
          id: gp.id,
          buttons: Array.from(gp.buttons).map((b,i) => ({ i, pressed: b.pressed, value: b.value.toFixed(2) })),
          axes: Array.from(gp.axes).map((a,i) => ({ i, value: a.toFixed(3) })),
        })
      } else {
        setState({ connected: false, buttons: [], axes: [] })
      }
      rafRef.current = requestAnimationFrame(poll)
    }
    rafRef.current = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 9999, color: '#0ff', fontFamily: 'monospace',
      fontSize: 11, padding: 20, overflow: 'auto'
    }}>
      <div style={{ fontSize: 14, marginBottom: 8, color: '#ff0' }}>
        CONTROLLER DEBUG (click anywhere to close)
      </div>
      {!state.connected && (
        <div style={{ color: '#f44' }}>No gamepad detected -- press a button on your controller first</div>
      )}
      {state.connected && (
        <div>
          <div style={{ color: '#0f0', marginBottom: 8 }}>Connected: {state.id}</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ color: '#ff0', marginBottom: 4 }}>BUTTONS</div>
              {state.buttons.map(b => (
                <div key={b.i} style={{ color: b.pressed ? '#0ff' : '#555' }}>
                  [{b.i}] {b.pressed ? 'PRESSED' : '------'} ({b.value})
                </div>
              ))}
            </div>
            <div>
              <div style={{ color: '#ff0', marginBottom: 4 }}>AXES</div>
              {state.axes.map(a => (
                <div key={a.i} style={{ color: Math.abs(parseFloat(a.value)) > 0.1 ? '#0ff' : '#555' }}>
                  [{a.i}] {a.value}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [showDebug, setShowDebug] = useState(false)
  const { profiles, addProfile, deleteProfile } = usePlayerProfiles()
  useTheme()

  // Press D to toggle controller debug overlay
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'd' || e.key === 'D') setShowDebug(s => !s)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleIntroComplete = () => setPhase("playerSelect")

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

  const handleReturnToPlayerSelect = () => {
    setCurrentPlayer(null)
    setPhase("playerSelect")
  }

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
          <Wheel
            player={currentPlayer}
            onExit={handleReturnToPlayerSelect}
          />
        )}

        <CRT enabled={true} />
        <CoinCounter />

        {showDebug && <ControllerDebug onClose={() => setShowDebug(false)} />}
      </div>
    </ErrorBoundary>
  )
}
