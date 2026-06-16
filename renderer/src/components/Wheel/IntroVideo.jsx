import { useState, useEffect, useRef } from "react"
import styles from "./IntroVideo.module.css"

// Plays F:\Media\intro.mp4 fullscreen before the wheel loads.
// Skip on any key, click, or gamepad button.
// If file doesn't exist or errors, calls onComplete immediately.

export default function IntroVideo({ mediaPath, onComplete }) {
  const videoRef = useRef(null)
  const [visible, setVisible] = useState(true)
  const doneRef  = useRef(false)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    setVisible(false)
    setTimeout(onComplete, 400) // let fade-out play
  }

  useEffect(() => {
    // Skip on any key or gamepad
    const onKey = () => finish()
    window.addEventListener('keydown', onKey)
    window.addEventListener('click',   onKey)

    // Gamepad polling -- any button skips
    const gpInterval = setInterval(() => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      for (const pad of pads) {
        if (!pad) continue
        if (pad.buttons.some(b => b.pressed)) { clearInterval(gpInterval); finish(); return }
      }
    }, 100)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click',   onKey)
      clearInterval(gpInterval)
    }
  }, [])

  const introPath = 'file:///' + (mediaPath || 'F:\\Media\\').replace(/\\/g, '/').replace(/\/$/, '') + '/intro.mp4'

  return (
    <div
      className={styles.overlay}
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}
    >
      <video
        ref={videoRef}
        className={styles.video}
        src={introPath}
        autoPlay
        playsInline
        onEnded={finish}
        onError={finish}
      />
      <div className={styles.skipHint}>Press any button to skip</div>
    </div>
  )
}
