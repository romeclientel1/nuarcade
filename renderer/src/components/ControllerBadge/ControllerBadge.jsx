import { getControllerHint } from "../../data/controllerHints"
import styles from "./ControllerBadge.module.css"

const ICONS = { gun: '[GUN]', wheel: '[WHEEL]', stick: '[STICK]' }

export default function ControllerBadge({ game, size }) {
  const hint = getControllerHint(game)
  if (!hint) return null
  const isLarge = size === 'large'
  return (
    <div
      className={styles.badge + (isLarge ? ' ' + styles.large : '')}
      style={{ borderColor: hint.color, color: hint.color }}
      title={'Use: ' + hint.label}
    >
      <span className={styles.icon}>{ICONS[hint.type]}</span>
      <span className={styles.label}>{hint.label.toUpperCase()}</span>
    </div>
  )
}
