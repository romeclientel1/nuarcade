import { useState, useEffect, useRef } from "react"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad"
import styles from "./Achievements.module.css"
import { getAchievements, computeStats } from "./achievementData"

export default function Achievements({ games, onClose }) {
  const bodyRef = useRef(null)
  const [stats, setStats] = useState(() => computeStats(games))

  useEffect(() => {
    setStats(computeStats(games))
    const interval = setInterval(() => setStats(computeStats(games)), 10000)
    return () => clearInterval(interval)
  }, [games])

  useOverlayGamepad({
    onClose,
    onUp:   () => bodyRef.current?.scrollBy({ top: -80, behavior: "smooth" }),
    onDown: () => bodyRef.current?.scrollBy({ top:  80, behavior: "smooth" }),
  })

  const unlocked = getAchievements().filter(a => a.check(stats))
  const locked   = getAchievements().filter(a => !a.check(stats))
  const pct      = Math.round((unlocked.length / getAchievements().length) * 100)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Achievements</div>
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: pct + "%" }} />
            </div>
            <span className={styles.progressLabel}>{unlocked.length} / {getAchievements().length}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div className={styles.body} ref={bodyRef}>
          {unlocked.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Unlocked ({unlocked.length})</div>
              <div className={styles.grid}>
                {unlocked.map(a => (
                  <div key={a.id} className={styles.card + " " + styles.cardUnlocked}>
                    <div className={styles.cardIcon}>{a.icon}</div>
                    <div className={styles.cardTitle}>{a.title}</div>
                    <div className={styles.cardDesc}>{a.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Locked ({locked.length})</div>
            <div className={styles.grid}>
              {locked.map(a => (
                <div key={a.id} className={styles.card + " " + styles.cardLocked}>
                  <div className={styles.cardIcon} style={{ opacity: 0.2 }}>{a.icon}</div>
                  <div className={styles.cardTitle} style={{ opacity: 0.4 }}>{a.title}</div>
                  <div className={styles.cardDesc}>{a.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {unlocked.length === 0 && (
            <div className={styles.empty}>
              No achievements yet -- launch some games to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
