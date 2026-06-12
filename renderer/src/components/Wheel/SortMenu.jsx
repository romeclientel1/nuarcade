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
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.menu} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>Sort by</div>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.id}
            className={styles.option + (current === opt.id ? " " + styles.active : "")}
            onClick={() => { onChange(opt.id); onClose() }}
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
