import { useEffect, useState } from "react"
import { getControllerHint } from "../../data/controllerHints"
import styles from "./ControllerPrompt.module.css"
import { useI18n } from "../../i18n/I18nContext.js"

const ICONS = { gun: '[GUN]', wheel: '[WHEEL]', stick: '[STICK]' }
// Message keys, not the messages themselves -- built into real strings
// inside the component via t() so a locale change is reflected immediately.
const MESSAGE_KEYS = {
  gun:   'controllerPrompt.grabGun',
  wheel: 'controllerPrompt.grabWheel',
  stick: 'controllerPrompt.grabStick',
}
const DURATION_MS = 2200

export default function ControllerPrompt({ game, onDone }) {
  const { t } = useI18n()
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
        <div className={styles.message} style={{ color: hint.color }}>{t(MESSAGE_KEYS[hint.type])}</div>
        <div className={styles.sub}>{t("controllerPrompt.launchingSoon")}</div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: progress + '%', background: hint.color }} />
        </div>
      </div>
    </div>
  )
}
