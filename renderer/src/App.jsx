import { useState, useEffect, Component } from "react"
import Intro from "./components/Intro/Intro"
import Wizard from "./components/Wizard/Wizard"
import Wheel from "./components/Wheel/Wheel"
import Updater from "./components/Updater/Updater"
import CRT from "./components/CRT/CRT"
import UpdateBanner from "./components/UpdateBanner/UpdateBanner"
import { useAutoUpdate } from "./hooks/useAutoUpdate"
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
  const [lastLaunch, setLastLaunch] = useState(null)
  const { themeId, setTheme } = useTheme()
  const VERSION = "3.6.4"
  const { hasUpdate, newVersion, releaseUrl, releaseNotes, dismiss } = useAutoUpdate(VERSION)

  const [crtEnabled, setCrtEnabled] = useState(() => {
    try { return localStorage.getItem("nuarcade_crt") === "true" } catch { return false }
  })

  const handleCRTChange = (val) => {
    setCrtEnabled(val)
    localStorage.setItem("nuarcade_crt", val)
  }

  const handleIntroComplete = async () => {
    let goToWizard = false
    try {
      if (window.nuarcade?.getConfig) {
        const config = await window.nuarcade.getConfig()
        if (!config?.setupComplete) {
          goToWizard = true
        } else if (config.autoLaunchLast) {
          try {
            const recent = JSON.parse(localStorage.getItem("nuarcade_recent") || "[]")
            if (recent[0]) localStorage.setItem("nuarcade_auto_launch", JSON.stringify(recent[0]))
          } catch {}
        }
      } else {
        // window.nuarcade not available -- dev mode, go to wheel
        goToWizard = false
      }
    } catch (e) {
      console.warn("getConfig failed, defaulting to wizard:", e)
      goToWizard = true
    }
    if (goToWizard) {
      setPhase("wizard")
    } else {
      setPhase("wheel")
      setShowUpdater(true)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && phase === "intro") setPhase("wheel")
      // Ctrl+W = re-run setup wizard (emergency reset)
      if (e.ctrlKey && e.key === "w" && phase === "wheel") {
        window.nuarcade?.resetSetup?.().then(() => setPhase("wizard"))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [phase])

  return (
    <>
      <VolumeOverlay />
      {hasUpdate && (
        <UpdateBanner
          newVersion={newVersion}
          releaseUrl={releaseUrl}
          releaseNotes={releaseNotes}
          onDismiss={dismiss}
        />
      )}
      <div style={{ width: "100vw", height: "100vh", background: "#000", overflow: "hidden" }}>
        <ErrorBoundary>
          {phase === "intro" && <Intro onComplete={handleIntroComplete} />}
          {phase === "wizard" && <Wizard onComplete={() => {
            if (window.nuarcade?.setupComplete) window.nuarcade.setupComplete()
            setPhase("wheel")
            setShowUpdater(true)
          }} />}
          {(phase === "wheel" || phase === "fallback") && <Wheel onCRTChange={handleCRTChange} crtEnabled={crtEnabled} themeId={themeId} onThemeChange={setTheme} lastLaunch={lastLaunch} setLastLaunch={setLastLaunch} onSetupWizard={() => { window.nuarcade?.resetSetup?.().then(() => setPhase("wizard")) }} />}
          {phase === "wheel" && showUpdater && (
            <Updater onDismiss={() => setShowUpdater(false)} />
          )}
        </ErrorBoundary>
        <CRT enabled={crtEnabled} />
        <CoinCounter lastLaunch={lastLaunch} />
      </div>
    </>
  )
}
