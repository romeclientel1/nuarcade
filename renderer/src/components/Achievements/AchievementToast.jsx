import { useState, useEffect, useCallback, useRef } from "react"
import styles from "./AchievementToast.module.css"
import { getAchievements } from "./achievementData"

// Tracks which achievements have been seen so we don't re-toast
const SEEN_KEY = "nuarcade_achievements_seen"

function getSeenSet() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")) } catch { return new Set() }
}
function markSeen(id) {
  const seen = getSeenSet()
  seen.add(id)
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])) } catch {}
}

// The toast component -- renders a stack of toasts
export function AchievementToastContainer({ toasts, onDismiss }) {
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <div
          key={t.id + t.ts}
          className={styles.toast}
          onClick={() => onDismiss(t.ts)}
        >
          <div className={styles.toastIcon}>{t.icon}</div>
          <div className={styles.toastBody}>
            <div className={styles.toastLabel}>Achievement Unlocked!</div>
            <div className={styles.toastTitle}>{t.title}</div>
            <div className={styles.toastDesc}>{t.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Hook -- call with computed stats, returns toasts + dismiss
export function useAchievementToasts(stats) {
  const [toasts, setToasts] = useState([])

  const checkForNew = useCallback(() => {
    if (!stats) return
    const seen = getSeenSet()
    const newlyUnlocked = getAchievements().filter(a => {
      if (seen.has(a.id)) return false
      return a.check(stats)
    })
    if (newlyUnlocked.length === 0) return

    newlyUnlocked.forEach(a => markSeen(a.id))

    const newToasts = newlyUnlocked.map(a => ({
      ...a,
      ts: Date.now() + Math.random(),
    }))

    setToasts(prev => [...prev, ...newToasts])

    newToasts.forEach(t => {
      setTimeout(() => {
        setToasts(prev => prev.filter(p => p.ts !== t.ts))
      }, 4000)
    })
  }, [stats])

  useEffect(() => {
    checkForNew()
  }, [stats])

  const dismiss = useCallback((ts) => {
    setToasts(prev => prev.filter(t => t.ts !== ts))
  }, [])

  return { toasts, dismiss }
}
