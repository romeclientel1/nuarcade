import { useState } from "react"
import { useGamepad } from "../../hooks/useGamepad"
import styles from "./SortMenu.module.css"

const SORT_OPTIONS = [
  { id: "default",        label: "Default",         icon: "D" },
  { id: "most_played",    label: "Most Played",      icon: "P" },
  { id: "most_launched",  label: "Most Launched",    icon: "L" },
  { id: "top_rated",      label: "Top Rated",        icon: "*" },
  { id: "recently_added", label: "Recently Added",   icon: "N" },
  { id: "name",           label: "Name A-Z",         icon: "A" },
  { id: "system",         label: "System",           icon: "S" },
  { id: "status",         label: "Status",           icon: "!" },
]

export default function SortMenu({ current, onChange, onClose }) {
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
        <div className={styles.title}>Sort by</div>
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
