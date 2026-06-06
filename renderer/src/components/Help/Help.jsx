import styles from './Help.module.css'

const SHORTCUTS = [
  { key: '← →', desc: 'Navigate wheel' },
  { key: 'Enter', desc: 'Open game detail' },
  { key: 'Escape', desc: 'Close / go back' },
  { key: 'F', desc: 'Toggle favorite' },
  { key: 'Space', desc: 'Quick launch (skip detail screen)' },
  { key: 'R', desc: 'Pick a random game' },
  { key: 'C', desc: 'Cabinet mode (hide UI chrome)' },
  { key: 'S', desc: 'Screenshot mode (hide all UI)' },
  { key: '?', desc: 'Show this help' },
  { key: 'A (gamepad)', desc: 'Open game detail' },
  { key: 'B (gamepad)', desc: 'Go back' },
  { key: 'Y (gamepad)', desc: 'Toggle favorite' },
  { key: 'D-pad left/right', desc: 'Navigate wheel' },
]

export default function Help({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Keyboard Shortcuts</div>
          <button className={styles.closeBtn} onClick={onClose}>x</button>
        </div>
        <div className={styles.list}>
          {SHORTCUTS.map((s, i) => (
            <div key={i} className={styles.row}>
              <div className={styles.key}>{s.key}</div>
              <div className={styles.desc}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div className={styles.footer}>Press ? or click anywhere to close</div>
      </div>
    </div>
  )
}
