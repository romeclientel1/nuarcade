import { getControllerHint } from "../../data/controllerHints"
import styles from "./ControllerBadge.module.css"
import { useI18n } from "../../i18n/I18nContext.js"

const ICONS = { gun: '[GUN]', wheel: '[WHEEL]', stick: '[STICK]' }
// hint.type -> label key, not the label itself -- controllerHints.js is a
// plain data module with no React/i18n access, so the localized label is
// built here from t() instead of trusting hint.label (English-only data).
const LABEL_KEYS = { gun: 'controllerBadge.gun', wheel: 'controllerBadge.wheel', stick: 'controllerBadge.stick' }

export default function ControllerBadge({ game, size }) {
  const { t } = useI18n()
  const hint = getControllerHint(game)
  if (!hint) return null
  const isLarge = size === 'large'
  const label = t(LABEL_KEYS[hint.type])
  return (
    <div
      className={styles.badge + (isLarge ? ' ' + styles.large : '')}
      style={{ borderColor: hint.color, color: hint.color }}
      title={t("controllerBadge.use", { device: label })}
    >
      <span className={styles.icon}>{ICONS[hint.type]}</span>
      <span className={styles.label}>{label.toUpperCase()}</span>
    </div>
  )
}
