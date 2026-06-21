import { useState, useEffect, useRef } from "react"
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import styles from "./Achievements.module.css"
import { computeStats } from "./computeStats"

const ACHIEVEMENTS = [
  // Playtime
  { id: "first_launch",   icon: "+",  title: "First Launch",      desc: "Launch your first game",               check: (s) => s.totalLaunches >= 1 },
  { id: "hour_1",         icon: "+",  title: "First Hour",        desc: "Play for 1 total hour",                check: (s) => s.totalTimeSec >= 3600 },
  { id: "hour_10",        icon: "+",  title: "Dedicated",         desc: "Play for 10 total hours",              check: (s) => s.totalTimeSec >= 36000 },
  { id: "hour_50",        icon: "+",  title: "Veteran",           desc: "Play for 50 total hours",              check: (s) => s.totalTimeSec >= 180000 },
  { id: "hour_100",       icon: "+",  title: "Legend",            desc: "Play for 100 total hours",             check: (s) => s.totalTimeSec >= 360000 },
  { id: "session_30m",    icon: "+",  title: "In The Zone",       desc: "Play one game for 30+ minutes",        check: (s) => s.bestSession >= 1800 },
  { id: "session_2h",     icon: "+",  title: "Marathon",          desc: "Play one game for 2+ hours",           check: (s) => s.bestSession >= 7200 },
  // Launches
  { id: "launches_10",    icon: "+",  title: "Regular",           desc: "Launch games 10 times total",          check: (s) => s.totalLaunches >= 10 },
  { id: "launches_50",    icon: "+",  title: "Frequent Flyer",    desc: "Launch games 50 times total",          check: (s) => s.totalLaunches >= 50 },
  { id: "launches_200",   icon: "+",  title: "Cabinet Life",      desc: "Launch games 200 times total",         check: (s) => s.totalLaunches >= 200 },
  { id: "one_game_10",    icon: "+",  title: "Obsessed",          desc: "Launch one game 10+ times",            check: (s) => s.maxGameLaunches >= 10 },
  { id: "one_game_50",    icon: "+",  title: "Main Character",    desc: "Launch one game 50+ times",            check: (s) => s.maxGameLaunches >= 50 },
  // Library
  { id: "games_10",       icon: "+",  title: "Collector",         desc: "Play 10 different games",              check: (s) => s.gamesPlayed >= 10 },
  { id: "games_25",       icon: "+",  title: "Explorer",          desc: "Play 25 different games",              check: (s) => s.gamesPlayed >= 25 },
  { id: "games_50",       icon: "+",  title: "Connoisseur",       desc: "Play 50 different games",              check: (s) => s.gamesPlayed >= 50 },
  { id: "games_100",      icon: "+",  title: "Completionist",     desc: "Play 100 different games",             check: (s) => s.gamesPlayed >= 100 },
  // Ratings
  { id: "rated_1",        icon: "*",  title: "Critic",            desc: "Rate your first game",                 check: (s) => s.gamesRated >= 1 },
  { id: "rated_10",       icon: "*",  title: "Reviewer",          desc: "Rate 10 games",                        check: (s) => s.gamesRated >= 10 },
  { id: "rated_25",       icon: "*",  title: "Taste Maker",       desc: "Rate 25 games",                        check: (s) => s.gamesRated >= 25 },
  { id: "perfect_5",      icon: "*",  title: "Hall of Fame",      desc: "Give 5 games a perfect rating",        check: (s) => s.perfectRatings >= 5 },
  // Collections
  { id: "collection_1",   icon: "[]", title: "Curator",           desc: "Create your first collection",         check: (s) => s.collections >= 1 },
  { id: "collection_5",   icon: "[]", title: "Archivist",         desc: "Create 5 collections",                 check: (s) => s.collections >= 5 },
  { id: "col_game_10",    icon: "[]", title: "Organized",         desc: "Add 10 games to collections",          check: (s) => s.collectionGames >= 10 },
  // Special
  { id: "night_owl",      icon: "+",  title: "Night Owl",         desc: "Launch a game after midnight",         check: (s) => s.launchedAfterMidnight },
  { id: "early_bird",     icon: "+",  title: "Early Bird",        desc: "Launch a game before 6am",             check: (s) => s.launchedBeforeSix },
  { id: "all_emulators",  icon: "+",  title: "Omniplay",          desc: "Use all 16 emulators at least once",   check: (s) => s.distinctEmulators >= 16 },
  { id: "5_systems",      icon: "+",  title: "Multi-System",      desc: "Play games on 5 different systems",    check: (s) => s.distinctSystems >= 5 },
]

export default function Achievements({ games, onClose }) {
  const bodyRef = useRef(null)
  useOverlayGamepad({
    onClose,
    onUp:   () => bodyRef.current?.scrollBy({ top: -120, behavior: 'smooth' }),
    onDown: () => bodyRef.current?.scrollBy({ top:  120, behavior: 'smooth',
  }),
  })
  const [stats, setStats] = useState(() => computeStats(games))

  useEffect(() => {
    setStats(computeStats(games))
    const interval = setInterval(() => setStats(computeStats(games)), 10000)
    return () => clearInterval(interval)
  }, [games])

  const unlocked = ACHIEVEMENTS.filter(a => a.check(stats))
  const locked   = ACHIEVEMENTS.filter(a => !a.check(stats))
  const pct      = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Achievements</div>
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: pct + "%" }} />
            </div>
            <span className={styles.progressLabel}>{unlocked.length} / {ACHIEVEMENTS.length}</span>
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
            <div className={styles.empty}>No achievements yet -- launch some games to get started!</div>
          )}
        </div>
      </div>
    </div>
  )
}
