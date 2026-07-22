import { useState } from "react"
import { useGamepad } from "../../hooks/useGamepad"
import styles from "./SortMenu.module.css"
import { useI18n } from "../../i18n/I18nContext.js"

// icon/id pairs only -- labels are locale-aware, built inside the
// component via t() so they react to a runtime language change instead of
// being frozen at module-load time.
const SORT_OPTION_DEFS = [
  { id: "default",        labelKey: "sortMenu.default",        icon: "D" },
  { id: "most_played",    labelKey: "sortMenu.mostPlayed",      icon: "P" },
  { id: "most_launched",  labelKey: "sortMenu.mostLaunched",    icon: "L" },
  { id: "top_rated",      labelKey: "sortMenu.topRated",        icon: "*" },
  { id: "recently_added", labelKey: "sortMenu.recentlyAdded",   icon: "N" },
  { id: "name",           labelKey: "sortMenu.nameAZ",          icon: "A" },
  { id: "system",         labelKey: "sortMenu.system",          icon: "S" },
  { id: "status",         labelKey: "sortMenu.status",          icon: "!" },
]

export default function SortMenu({ current, onChange, onClose }) {
  const { t } = useI18n()
  const SORT_OPTIONS = SORT_OPTION_DEFS.map(o => ({ ...o, label: t(o.labelKey) }))
  // Start focus on the currently active sort option, fall back to 0
  const startIdx = Math.max(0, SORT_OPTIONS.findIndex(o => o.id === current))
  const [focusIdx, setFocusIdx] = useState(startIdx)

  useGamepad({
    up:      () => setFocusIdx(i => Math.max(0, i - 1)),
    down:    () => setFocusIdx(i => Math.min(SORT_OPTIONS.length - 1, i + 1)),
    confirm: () => { onChange(SORT_OPTIONS[focusIdx].id); onClose() },
    back:    () => onClose(),
    enabled: true,
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.menu} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>{t("sortMenu.title")}</div>
        {SORT_OPTIONS.map((opt, i) => (
          <button
            key={opt.id}
            className={
              styles.option +
              (current === opt.id ? " " + styles.active : "") +
              (focusIdx === i ? " " + styles.gamepadFocused : "")
            }
            onClick={() => { onChange(opt.id); onClose() }}
            onMouseEnter={() => setFocusIdx(i)}
          >
            <span className={styles.icon}>{opt.icon}</span>
            <span className={styles.label}>{opt.label}</span>
            {current === opt.id && <span className={styles.check}>OK</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
