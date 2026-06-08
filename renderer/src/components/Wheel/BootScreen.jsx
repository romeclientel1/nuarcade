import { useState, useEffect } from "react"
import styles from "./BootScreen.module.css"

const BOOT_DURATION = 3500  // total ms before auto-dismiss
const CYCLE_MS      = 700   // ms per game card

export default function BootScreen({ games, artwork, onComplete }) {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  // Get top 5 most played
  const topGames = (() => {
    const pt = (() => { try { return JSON.parse(localStorage.getItem("nuarcade_playtime") || "{}") } catch { return {} } })()
    const played = games.filter(g => pt[g.id || g.profile]?.total > 0)
    if (played.length < 3) return games.slice(0, 5)
    return played
      .sort((a, b) => (pt[b.id||b.profile]?.total||0) - (pt[a.id||a.profile]?.total||0))
      .slice(0, 5)
  })()

  // Cycle through games
  useEffect(() => {
    if (topGames.length < 2) { setTimeout(onComplete, 1200); return }
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % topGames.length)
        setFade(true)
      }, 150)
    }, CYCLE_MS)
    return () => clearInterval(interval)
  }, [topGames.length])

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(onComplete, BOOT_DURATION)
    return () => clearTimeout(t)
  }, [])

  if (!topGames.length) return null

  const game = topGames[idx]
  const art  = artwork?.[game?.id || game?.profile]
  const hero = art?.hero || art?.capsule || null

  return (
    <div className={styles.overlay} onClick={onComplete}>
      {hero && (
        <div
          className={styles.heroBg}
          style={{ backgroundImage: "url(" + hero + ")", opacity: fade ? 0.18 : 0, transition: "opacity 0.15s" }}
        />
      )}
      <div className={styles.content}>
        <div className={styles.brand}>NuArcade</div>
        <div className={styles.label}>Your Library</div>
        <div className={styles.gameRow} style={{ opacity: fade ? 1 : 0, transition: "opacity 0.15s" }}>
          {topGames.map((g, i) => {
            const gArt = artwork?.[g.id || g.profile]
            const thumb = gArt?.capsule || gArt?.hero || null
            return (
              <div key={g.id || g.profile} className={styles.gameCard + (i === idx ? " " + styles.gameCardActive : "")}>
                {thumb ? (
                  <img src={thumb} alt={g.title} className={styles.gameThumb} />
                ) : (
                  <div className={styles.gameFallback}>{g.icon || g.genre?.[0] || "?"}</div>
                )}
              </div>
            )
          })}
        </div>
        <div className={styles.gameTitle} style={{ opacity: fade ? 1 : 0, transition: "opacity 0.15s" }}>
          {game?.title}
        </div>
        <div className={styles.gameSystem}>{game?.system}</div>
        <div className={styles.hint}>Press any button to continue</div>
      </div>
      <div className={styles.scanlines} />
    </div>
  )
}
