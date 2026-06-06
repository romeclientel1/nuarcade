import { useState, useEffect } from "react"
import Intro from "./components/Intro/Intro"
import Wizard from "./components/Wizard/Wizard"
import Wheel from "./components/Wheel/Wheel"
import Updater from "./components/Updater/Updater"
import CRT from "./components/CRT/CRT"
import "./index.css"

export default function App() {
  const [phase, setPhase] = useState("intro")
  const [showUpdater, setShowUpdater] = useState(false)
  const [crtEnabled, setCrtEnabled] = useState(() => {
    try { return localStorage.getItem("nuarcade_crt") === "true" } catch { return false }
  })

  const handleCRTChange = (val) => {
    setCrtEnabled(val)
    localStorage.setItem("nuarcade_crt", val)
  }

  const handleIntroComplete = async () => {
    if (window.nuarcade && window.nuarcade.platform === "win32") {
      const config = await window.nuarcade.getConfig()
      if (!config.setupComplete) {
        setPhase("wizard")
        return
      }
    }
    setPhase("wheel")
    setShowUpdater(true)
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && phase === "intro") setPhase("wheel")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [phase])

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", overflow: "hidden" }}>
      {phase === "intro"  && <Intro onComplete={handleIntroComplete} />}
      {phase === "wizard" && <Wizard onComplete={() => setPhase("wheel")} />}
      {phase === "wheel"  && <Wheel onCRTChange={handleCRTChange} crtEnabled={crtEnabled} />}
      {phase === "wheel" && showUpdater && (
        <Updater onDismiss={() => setShowUpdater(false)} />
      )}
      <CRT enabled={crtEnabled} />
    </div>
  )
}
