import { useState, useEffect, useCallback } from "react"
import styles from "./AchievementToast.module.css"

const SEEN_KEY = "nuarcade_achievements_seen"

function getSeenSet() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")) } catch { return new Set() }
}
function markSeen(id) {
  const seen = getSeenSet()
  seen.add(id)
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])) } catch {}
}

const ACHIEVEMENTS = [
  { id: "first_launch",   check: (s) => s.totalLaunches >= 1,      icon: "?",  title: "First Launch",      desc: "Launch your first game" },
  { id: "hour_1",         check: (s) => s.totalTimeSec >= 3600,     icon: "?",  title: "First Hour",        desc: "Play for 1 total hour" },
  { id: "hour_10",        check: (s) => s.totalTimeSec >= 36000,    icon: "?",  title: "Dedicated",         desc: "Play for 10 total hours" },
  { id: "hour_50",        check: (s) => s.totalTimeSec >= 180000,   icon: "?",  title: "Veteran",           desc: "Play for 50 total hours" },
  { id: "hour_100",       check: (s) => s.totalTimeSec >= 360000,   icon: "?",  title: "Legend",            desc: "Play for 100 total hours" },
  { id: "session_30m",    check: (s) => s.bestSession >= 1800,      icon: "?",  title: "In The Zone",       desc: "Play one game for 30+ minutes" },
  { id: "session_2h",     check: (s) => s.bestSession >= 7200,      icon: "?",  title: "Marathon",          desc: "Play one game for 2+ hours" },
  { id: "launches_10",    check: (s) => s.totalLaunches >= 10,      icon: "?",  title: "Regular",           desc: "Launch games 10 times total" },
  { id: "launches_50",    check: (s) => s.totalLaunches >= 50,      icon: "?",  title: "Frequent Flyer",    desc: "Launch games 50 times total" },
  { id: "launches_200",   check: (s) => s.totalLaunches >= 200,     icon: "?",  title: "Cabinet Life",      desc: "Launch games 200 times total" },
  { id: "one_game_10",    check: (s) => s.maxGameLaunches >= 10,    icon: "?",  title: "Obsessed",          desc: "Launch one game 10+ times" },
  { id: "one_game_50",    check: (s) => s.maxGameLaunches >= 50,    icon: "?",  title: "Main Character",    desc: "Launch one game 50+ times" },
  { id: "games_10",       check: (s) => s.gamesPlayed >= 10,        icon: "?",  title: "Collector",         desc: "Play 10 different games" },
  { id: "games_25",       check: (s) => s.gamesPlayed >= 25,        icon: "?",  title: "Explorer",          desc: "Play 25 different games" },
  { id: "games_50",       check: (s) => s.gamesPlayed >= 50,        icon: "?",  title: "Connoisseur",       desc: "Play 50 different games" },
  { id: "games_100",      check: (s) => s.gamesPlayed >= 100,       icon: "?",  title: "Completionist",     desc: "Play 100 different games" },
  { id: "rated_1",        check: (s) => s.gamesRated >= 1,          icon: "*",  title: "Critic",            desc: "Rate your first game" },
  { id: "rated_10",       check: (s) => s.gamesRated >= 10,         icon: "*",  title: "Reviewer",          desc: "Rate 10 games" },
  { id: "rated_25",       check: (s) => s.gamesRated >= 25,         icon: "*",  title: "Taste Maker",       desc: "Rate 25 games" },
  { id: "perfect_5",      check: (s) => s.perfectRatings >= 5,      icon: "*",  title: "Hall of Fame",      desc: "Give 5 games a perfect rating" },
  { id: "collection_1",   check: (s) => s.collections >= 1,         icon: "[]", title: "Curator",           desc: "Create your first collection" },
  { id: "collection_5",   check: (s) => s.collections >= 5,         icon: "[]", title: "Archivist",         desc: "Create 5 collections" },
  { id: "col_game_10",    check: (s) => s.collectionGames >= 10,    icon: "[]", title: "Organized",         desc: "Add 10 games to collections" },
  { id: "night_owl",      check: (s) => s.launchedAfterMidnight,    icon: "?",  title: "Night Owl",         desc: "Launch a game after midnight" },
  { id: "early_bird",     check: (s) => s.launchedBeforeSix,        icon: "?",  title: "Early Bird",        desc: "Launch a game before 6am" },
  { id: "all_emulators",  check: (s) => s.distinctEmulators >= 16,  icon: "?",  title: "Omniplay",          desc: "Use all 16 emulators at least once" },
  { id: "5_systems",      check: (s) => s.distinctSystems >= 5,     icon: "?",  title: "Multi-System",      desc: "Play games on 5 different systems" },
]

export function AchievementToastContainer({ toasts, onDismiss }) {
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <div key={t.id + t.ts} className={styles.toast} onClick={() => onDismiss(t.ts)}>
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

export function useAchievementToasts(stats) {
  const [toasts, setToasts] = useState([])

  const checkForNew = useCallback(() => {
    if (!stats) return
    const seen = getSeenSet()
    const newlyUnlocked = ACHIEVEMENTS.filter(a => !seen.has(a.id) && a.check(stats))
    if (newlyUnlocked.length === 0) return

    newlyUnlocked.forEach(a => markSeen(a.id))
    const newToasts = newlyUnlocked.map(a => ({ ...a, ts: Date.now() + Math.random() }))
    setToasts(prev => [...prev, ...newToasts])
    newToasts.forEach(t => {
      setTimeout(() => setToasts(prev => prev.filter(p => p.ts !== t.ts)), 4000)
    })
  }, [stats])

  useEffect(() => { checkForNew() }, [stats])

  const dismiss = useCallback((ts) => setToasts(prev => prev.filter(t => t.ts !== ts)), [])

  return { toasts, dismiss }
}
