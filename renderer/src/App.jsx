import { useState, useEffect } from "react"
import Intro from "./components/Intro/Intro"
import Wizard from "./components/Wizard/Wizard"
import Wheel from "./components/Wheel/Wheel"
import Updater from "./components/Updater/Updater"
import CRT from "./components/CRT/CRT"
import Splash from "./components/Splash/Splash"
import UpdateBanner from "./components/UpdateBanner/UpdateBanner"
import { useAutoUpdate } from "./hooks/useAutoUpdate"
import VolumeOverlay from "./components/VolumeOverlay/VolumeOverlay"
import CoinCounter from "./components/CoinCounter/CoinCounter"
import { useTheme } from "./hooks/useTheme"
import "./index.css"

export default function App() {
  const [phase, setPhase] = useState("intro")
  const [showUpdater, setShowUpdater] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const [lastLaunch, setLastLaunch] = useState(null)
  const { themeId, setTheme } = useTheme()
  const VERSION = "3.2.0"
  const { hasUpdate, newVersion, releaseUrl, releaseNotes, dismiss } = useAutoUpdate(VERSION)

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
      // Store autoLaunchLast flag for Wheel to pick up
      if (config.autoLaunchLast) {
        try {
          const recent = JSON.parse(localStorage.getItem("nuarcade_recent") || "[]")
          if (recent[0]) localStorage.setItem("nuarcade_auto_launch", JSON.stringify(recent[0]))
        } catch {}
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

  if (!splashDone) {
    return <Splash onComplete={() => setSplashDone(true)} />
  }

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
        {phase === "intro" && <Intro onComplete={handleIntroComplete} />}
        {phase === "wizard" && <Wizard onComplete={() => {
          if (window.nuarcade?.setupComplete) window.nuarcade.setupComplete()
          setPhase("wheel")
          setShowUpdater(true)
        }} />}
        {phase === "wheel" && <Wheel onCRTChange={handleCRTChange} crtEnabled={crtEnabled} themeId={themeId} onThemeChange={setTheme} lastLaunch={lastLaunch} setLastLaunch={setLastLaunch} />}
        {phase === "wheel" && showUpdater && (
          <Updater onDismiss={() => setShowUpdater(false)} />
        )}
        <CRT enabled={crtEnabled} />
        <CoinCounter lastLaunch={lastLaunch} />
      </div>
    </>
  )
}
