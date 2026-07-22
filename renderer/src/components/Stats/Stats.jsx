import { useMemo, useRef, useState, useEffect } from "react"
import { useOverlayGamepad } from "../../hooks/useOverlayGamepad"
import { usePlaytime } from "../../hooks/usePlaytime"
import styles from "./Stats.module.css"
import { useI18n } from "../../i18n/I18nContext.js"

const SYSTEM_COLORS = {
  MAME: "#ff6600", TeknoParrot: "#00ff88", RetroArch: "#9933ff",
  "Nintendo 64": "#e4000f", PlayStation: "#003791", Dreamcast: "#ff6600",
  "PlayStation Portable": "#0057a8", "PlayStation 2": "#003791",
  "PlayStation 3": "#0070d1", "Xbox 360": "#107c10",
  "GameCube": "#6b21a8", "Nintendo Wii": "#6b21a8",
  "Wii U": "#009ac7", "Nintendo Switch": "#e4000f",
  "Visual Pinball X": "#ff6600", "Sega Model 2": "#0055aa",
  "Sega Model 3": "#0088aa",
}

export default function Stats({ games, onClose }) {
  const { t } = useI18n()
  const { getAllPlaytime, getAllLaunches, formatTime } = usePlaytime()
  const bodyRef = useRef(null)
  const [tick, setTick] = useState(0)

  // Refresh stats every 5s in case playtime updates while panel is open
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(interval)
  }, [])

  useOverlayGamepad({
    onClose,
    onUp:   () => bodyRef.current?.scrollBy({ top: -80, behavior: 'smooth' }),
    onDown: () => bodyRef.current?.scrollBy({ top:  80, behavior: 'smooth' }),
  })

  const { playtime, launches, systemStats, topPlayed, topLaunched, topRated, totalTime, totalLaunches } = useMemo(() => {
    const pt  = getAllPlaytime()
    const lc  = getAllLaunches()
    const ratings = (() => { try { return JSON.parse(localStorage.getItem("nuarcade_ratings") || "{}") } catch { return {} } })()

    // Merge game data with stats
    const enriched = games.map(g => {
      const id = g.id || g.profile
      return {
        ...g,
        ptTotal:   pt[id]?.total   || 0,
        lcCount:   lc[id]?.count   || 0,
        lcLast:    lc[id]?.last    || pt[id]?.last || null,
        rating:    ratings[id]     || 0,
      }
    })

    // Per-system totals
    const sysMap = {}
    enriched.forEach(g => {
      const sys = g.system || g.genre || "Unknown"
      if (!sysMap[sys]) sysMap[sys] = { system: sys, totalTime: 0, launches: 0, games: 0 }
      sysMap[sys].totalTime += g.ptTotal
      sysMap[sys].launches  += g.lcCount
      sysMap[sys].games     += 1
    })
    const systemStats = Object.values(sysMap)
      .filter(s => s.totalTime > 0 || s.launches > 0)
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10)

    const topPlayed   = [...enriched].filter(g => g.ptTotal > 0).sort((a,b) => b.ptTotal - a.ptTotal).slice(0, 8)
    const topLaunched = [...enriched].filter(g => g.lcCount > 0).sort((a,b) => b.lcCount - a.lcCount).slice(0, 8)
    const topRated    = [...enriched].filter(g => g.rating  > 0).sort((a,b) => b.rating  - a.rating ).slice(0, 8)

    const totalTime    = enriched.reduce((s, g) => s + g.ptTotal, 0)
    const totalLaunches = enriched.reduce((s, g) => s + g.lcCount, 0)

    return { playtime: pt, launches: lc, systemStats, topPlayed, topLaunched, topRated, totalTime, totalLaunches }
  }, [games, tick])

  const totalGames   = games.length
  const playedGames  = games.filter(g => (getAllPlaytime()[g.id||g.profile]?.total || 0) > 0).length

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>{t("stats.title")}</div>
          <button className={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div className={styles.body} ref={bodyRef}>

          {/* Hero numbers */}
          <div className={styles.heroRow}>
            <div className={styles.heroStat}>
              <div className={styles.heroVal}>{formatTime(totalTime)}</div>
              <div className={styles.heroLabel}>{t("stats.totalPlaytime")}</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroVal}>{totalLaunches}</div>
              <div className={styles.heroLabel}>{t("stats.totalLaunches")}</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroVal}>{playedGames}</div>
              <div className={styles.heroLabel}>{t("stats.gamesPlayed")}</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroVal}>{totalGames}</div>
              <div className={styles.heroLabel}>{t("stats.librarySize")}</div>
            </div>
          </div>

          <div className={styles.cols}>
            {/* Left col */}
            <div className={styles.col}>

              {/* Most played */}
              {topPlayed.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>{t("stats.mostPlayed")}</div>
                  {topPlayed.map((g, i) => (
                    <div key={g.id||g.profile} className={styles.gameRow}>
                      <span className={styles.rank}>{i+1}</span>
                      <div className={styles.gameInfo}>
                        <div className={styles.gameName}>{g.title}</div>
                        <div className={styles.gameSys}>{g.system}</div>
                      </div>
                      <div className={styles.gameVal}>{formatTime(g.ptTotal)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top rated */}
              {topRated.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>{t("stats.topRated")}</div>
                  {topRated.map((g, i) => (
                    <div key={g.id||g.profile} className={styles.gameRow}>
                      <span className={styles.rank}>{i+1}</span>
                      <div className={styles.gameInfo}>
                        <div className={styles.gameName}>{g.title}</div>
                        <div className={styles.gameSys}>{g.system}</div>
                      </div>
                      <div className={styles.gameVal} style={{ color: "#facc15" }}>{"*".repeat(g.rating)}</div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Right col */}
            <div className={styles.col}>

              {/* Most launched */}
              {topLaunched.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>{t("stats.mostLaunched")}</div>
                  {topLaunched.map((g, i) => (
                    <div key={g.id||g.profile} className={styles.gameRow}>
                      <span className={styles.rank}>{i+1}</span>
                      <div className={styles.gameInfo}>
                        <div className={styles.gameName}>{g.title}</div>
                        <div className={styles.gameSys}>{g.system}</div>
                      </div>
                      <div className={styles.gameVal}>{g.lcCount}x</div>
                    </div>
                  ))}
                </div>
              )}

              {/* By system */}
              {systemStats.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>{t("stats.bySystem")}</div>
                  {systemStats.map(s => {
                    const pct = totalTime > 0 ? Math.round((s.totalTime / totalTime) * 100) : 0
                    const color = SYSTEM_COLORS[s.system] || "#00ff88"
                    return (
                      <div key={s.system} className={styles.sysRow}>
                        <div className={styles.sysInfo}>
                          <div className={styles.sysName}>{s.system}</div>
                          <div className={styles.sysMeta}>{formatTime(s.totalTime)} | {s.launches} launches</div>
                        </div>
                        <div className={styles.sysBar}>
                          <div className={styles.sysBarFill} style={{ width: pct + "%", background: color }} />
                        </div>
                        <div className={styles.sysPct} style={{ color }}>{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          </div>

          {totalTime === 0 && totalLaunches === 0 && (
            <div className={styles.empty}>
              {t("stats.empty")}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
