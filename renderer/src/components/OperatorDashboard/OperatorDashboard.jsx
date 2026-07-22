import { useMemo, useRef, useState, useEffect } from "react"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad"
import styles from "./OperatorDashboard.module.css"
import { useI18n } from "../../i18n/I18nContext.js"

const SYSTEM_COLORS = {
  MAME: "#ff6600", TeknoParrot: "#00ff88", RetroArch: "#9933ff",
  "Nintendo 64": "#e4000f", PlayStation: "#003791", Dreamcast: "#ff8800",
  "PlayStation 2": "#003791", "PlayStation 3": "#0070d1",
  "Xbox 360": "#107c10", "GameCube": "#6b21a8", "Nintendo Wii": "#6b21a8",
  "Nintendo Switch": "#e4000f", "Visual Pinball X": "#cc4400",
  "Sega Model 2": "#0055aa", "Sega Model 3": "#0088aa",
  Steam: "#1b2838", PC: "#555",
}

function getColor(system) {
  return SYSTEM_COLORS[system] || "#00c8ff"
}

function fmtTime(secs) {
  if (!secs) return "0m"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return h + "h " + m + "m"
  return m + "m"
}

function fmtDate(iso) {
  if (!iso) return "Never"
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function getActivityGrid(launches, days) {
  const grid = []
  const now = Date.now()
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - (i + 1) * 86400000
    const dayEnd   = now - i * 86400000
    let count = 0
    Object.values(launches).forEach(g => {
      if (g.last) {
        const t = new Date(g.last).getTime()
        if (t >= dayStart && t < dayEnd) count++
      }
    })
    grid.push({ count, dayOffset: i })
  }
  return grid
}

export default function OperatorDashboard({ games, onClose }) {
  const { t } = useI18n()
  const { getAllPlaytime, getAllLaunches } = usePlaytime()
  const bodyRef = useRef(null)
  const [tab, setTab] = useState("overview")

  const tabList = ['overview', 'games', 'systems']

  const cycleTab = (dir) => {
    setTab(prev => {
      const idx = tabList.indexOf(prev)
      return tabList[(idx + dir + tabList.length) % tabList.length]
    })
  }

  useOverlayGamepad({
    onClose,
    onUp:    () => bodyRef.current?.scrollBy({ top: -80, behavior: 'smooth' }),
    onDown:  () => bodyRef.current?.scrollBy({ top:  80, behavior: 'smooth' }),
    onLeft:  () => cycleTab(-1),
    onRight: () => cycleTab(1),
  })

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" || e.key === "o" || e.key === "O") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const data = useMemo(() => {
    const pt = getAllPlaytime()
    const lc = getAllLaunches()
    const now = Date.now()
    const weekAgo = now - 7 * 86400000

    const enriched = games.map(g => {
      const id = g.id || g.profile
      return {
        ...g,
        id,
        ptTotal:  pt[id]?.total    || 0,
        ptBest:   pt[id]?.best     || 0,
        sessions: pt[id]?.sessions || 0,
        lcCount:  lc[id]?.count    || 0,
        lcLast:   lc[id]?.last     || pt[id]?.last || null,
      }
    })

    const totalTime     = enriched.reduce((a, g) => a + g.ptTotal, 0)
    const totalLaunches = enriched.reduce((a, g) => a + g.lcCount, 0)
    const playedGames   = enriched.filter(g => g.lcCount > 0).length
    const totalGames    = games.length

    const lastPlayed = enriched
      .filter(g => g.lcLast)
      .sort((a, b) => new Date(b.lcLast) - new Date(a.lcLast))[0] || null

    const topTime     = [...enriched].sort((a, b) => b.ptTotal - a.ptTotal).slice(0, 8)
    const topLaunches = [...enriched].sort((a, b) => b.lcCount - a.lcCount).slice(0, 8)
    const topWeek     = [...enriched]
      .filter(g => g.lcLast && new Date(g.lcLast).getTime() > weekAgo)
      .sort((a, b) => b.lcCount - a.lcCount).slice(0, 5)

    const sysMap = {}
    enriched.forEach(g => {
      const sys = g.system || "Unknown"
      if (!sysMap[sys]) sysMap[sys] = { system: sys, time: 0, launches: 0, games: 0, played: 0 }
      sysMap[sys].games++
      sysMap[sys].time     += g.ptTotal
      sysMap[sys].launches += g.lcCount
      if (g.lcCount > 0) sysMap[sys].played++
    })
    const systems = Object.values(sysMap).filter(s => s.games > 0).sort((a, b) => b.time - a.time)

    const activityGrid = getActivityGrid(lc, 35)
    const maxActivity  = Math.max(...activityGrid.map(d => d.count), 1)

    return { totalTime, totalLaunches, playedGames, totalGames, lastPlayed, topTime, topLaunches, topWeek, systems, activityGrid, maxActivity }
  }, [games, getAllPlaytime, getAllLaunches])

  const maxTopTime = data.topTime[0]?.ptTotal || 1
  const maxTopLc   = data.topLaunches[0]?.lcCount || 1

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.badge}>OPS</div>
            <div className={styles.title}>{t("operatorDashboard.title")}</div>
          </div>
          <div className={styles.tabs}>
            <button className={styles.tab + (tab === "overview" ? " " + styles.tabActive : "")} onClick={() => setTab("overview")}>Overview</button>
            <button className={styles.tab + (tab === "games"    ? " " + styles.tabActive : "")} onClick={() => setTab("games")}>Top Games</button>
            <button className={styles.tab + (tab === "systems"  ? " " + styles.tabActive : "")} onClick={() => setTab("systems")}>Systems</button>
          </div>
        </div>

        <div className={styles.body} ref={bodyRef}>

          {tab === "overview" && (
            <div className={styles.overviewGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{fmtTime(data.totalTime)}</div>
                <div className={styles.statLabel}>Total Play Time</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{data.totalLaunches}</div>
                <div className={styles.statLabel}>Total Launches</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{data.playedGames}<span className={styles.statSub}>/{data.totalGames}</span></div>
                <div className={styles.statLabel}>Games Played</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{data.totalGames > 0 ? Math.round((data.playedGames / data.totalGames) * 100) : 0}%</div>
                <div className={styles.statLabel}>Library Coverage</div>
              </div>
              {data.lastPlayed && (
                <div className={styles.lastPlayed}>
                  <div className={styles.sectionLabel}>Last Session</div>
                  <div className={styles.lastPlayedName}>{data.lastPlayed.title || data.lastPlayed.id}</div>
                  <div className={styles.lastPlayedMeta}>{data.lastPlayed.system} - {fmtDate(data.lastPlayed.lcLast)}</div>
                </div>
              )}
              <div className={styles.activitySection}>
                <div className={styles.sectionLabel}>Activity - Last 35 Days</div>
                <div className={styles.activityGrid}>
                  {data.activityGrid.map((d, i) => (
                    <div key={i} className={styles.activityCell}
                      style={{ opacity: d.count === 0 ? 0.08 : 0.2 + (d.count / data.maxActivity) * 0.8 }} />
                  ))}
                </div>
                <div className={styles.activityLegend}><span>35 days ago</span><span>Today</span></div>
              </div>
              <div className={styles.weekSection}>
                <div className={styles.sectionLabel}>This Week</div>
                {data.topWeek.length === 0 ? (
                  <div className={styles.empty}>No plays in the last 7 days</div>
                ) : data.topWeek.map((g, i) => (
                  <div key={g.id} className={styles.weekRow}>
                    <div className={styles.weekRank}>{i + 1}</div>
                    <div className={styles.weekName}>{g.title || g.id}</div>
                    <div className={styles.weekSystem} style={{ color: getColor(g.system) }}>{g.system || "?"}</div>
                    <div className={styles.weekCount}>{g.lcCount} plays</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "games" && (
            <div className={styles.gamesTab}>
              <div className={styles.gamesList}>
                <div className={styles.gamesListTitle}>By Playtime</div>
                {data.topTime.map((g, i) => (
                  <div key={g.id} className={styles.gameRow}>
                    <div className={styles.gameRank}>{i + 1}</div>
                    <div className={styles.gameInfo}>
                      <div className={styles.gameName}>{g.title || g.id}</div>
                      <div className={styles.gameMeta}>
                        <span style={{ color: getColor(g.system) }}>{g.system || "?"}</span>
                        <span>{g.sessions} sessions</span>
                        <span>Best: {fmtTime(g.ptBest)}</span>
                      </div>
                    </div>
                    <div className={styles.gameBarWrap}>
                      <div className={styles.gameBar} style={{ width: Math.round((g.ptTotal / maxTopTime) * 100) + "%", background: getColor(g.system) }} />
                    </div>
                    <div className={styles.gameTime}>{fmtTime(g.ptTotal)}</div>
                  </div>
                ))}
              </div>
              <div className={styles.gamesList}>
                <div className={styles.gamesListTitle}>By Launch Count</div>
                {data.topLaunches.map((g, i) => (
                  <div key={g.id} className={styles.gameRow}>
                    <div className={styles.gameRank}>{i + 1}</div>
                    <div className={styles.gameInfo}>
                      <div className={styles.gameName}>{g.title || g.id}</div>
                      <div className={styles.gameMeta}>
                        <span style={{ color: getColor(g.system) }}>{g.system || "?"}</span>
                        <span>Last: {g.lcLast ? fmtDate(g.lcLast) : "Never"}</span>
                      </div>
                    </div>
                    <div className={styles.gameBarWrap}>
                      <div className={styles.gameBar} style={{ width: Math.round((g.lcCount / maxTopLc) * 100) + "%", background: getColor(g.system) }} />
                    </div>
                    <div className={styles.gameTime}>{g.lcCount}x</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "systems" && (
            <div className={styles.systemsTab}>
              {data.systems.map(s => (
                <div key={s.system} className={styles.systemCard}>
                  <div className={styles.systemHeader}>
                    <div className={styles.systemDot} style={{ background: getColor(s.system) }} />
                    <div className={styles.systemName}>{s.system}</div>
                    <div className={styles.systemTime}>{fmtTime(s.time)}</div>
                  </div>
                  <div className={styles.systemBarTrack}>
                    <div className={styles.systemBarFill} style={{
                      width: data.systems[0]?.time ? Math.round((s.time / data.systems[0].time) * 100) + "%" : "0%",
                      background: getColor(s.system)
                    }} />
                  </div>
                  <div className={styles.systemMeta}>
                    <span>{s.games} games</span>
                    <span>{s.played} played</span>
                    <span>{s.launches} launches</span>
                    <span>{s.games > 0 ? Math.round((s.played / s.games) * 100) : 0}% coverage</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
        <div className={styles.footer}>
          Press O or ESC to close - Tab: Overview / Top Games / Systems
        </div>
      </div>
    </div>
  )
}
