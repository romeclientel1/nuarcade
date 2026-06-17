import { useEffect, useState } from "react"
import { getControllerHint } from "../../data/controllerHints"
import styles from "./ControllerPrompt.module.css"

const ICONS = { gun: '[GUN]', wheel: '[WHEEL]', stick: '[STICK]' }
const MESSAGES = {
  gun:   'GRAB THE LIGHT GUN',
  wheel: 'GRAB THE WHEEL',
  stick: 'GRAB THE FLIGHT STICK',
}
const DURATION_MS = 2200

export default function ControllerPrompt({ game, onDone }) {
  const [progress, setProgress] = useState(100)
  const hint = getControllerHint(game)

  useEffect(() => {
    if (!hint) { onDone(); return }
    const interval = setInterval(() => {
      setProgress(p => Math.max(0, p - (100 / (DURATION_MS / 50))))
    }, 50)
    const timer = setTimeout(() => { clearInterval(interval); onDone() }, DURATION_MS)
    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [hint, onDone])

  if (!hint) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.panel} style={{ borderColor: hint.color }}>
        <div className={styles.gameTitle}>{game.title || game.id}</div>
        <div className={styles.icon} style={{ color: hint.color }}>{ICONS[hint.type]}</div>
        <div className={styles.message} style={{ color: hint.color }}>{MESSAGES[hint.type]}</div>
        <div className={styles.sub}>Launching in a moment...</div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: progress + '%', background: hint.color }} />
        </div>
      </div>
    </div>
  )
}
