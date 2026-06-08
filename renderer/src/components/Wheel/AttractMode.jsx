import { useState, useEffect, useRef, useCallback } from "react"
import styles from "./AttractMode.module.css"

const CYCLE_INTERVAL = 5000
const FADE_DURATION  = 800

export default function AttractMode({ games, isActive, onWake, artwork }) {
  const [currentIdx,  setCurrentIdx ] = useState(0)
  const [visible,     setVisible    ] = useState(false)
  const [fadeClass,   setFadeClass  ] = useState(styles.fadeIn)
  const [videoError,  setVideoError ] = useState({})
  const videoRef  = useRef(null)
  const timerRef  = useRef(null)
  const indexRef  = useRef(0)

  // Filter to games that have video or hero art
  const attractGames = games.filter(g => {
    const id = g.id || g.profile?.replace(".xml","").replace(".vpx","")
    const hasVideo = window.nuarcade?.platform === "win32"
    const hasHero  = artwork?.[g.id || g.profile]?.hero
    return hasVideo || hasHero || true // show all games, fall back to genre colors
  })

  const goToNext = useCallback(() => {
    setFadeClass(styles.fadeOut)
    setTimeout(() => {
      indexRef.current = (indexRef.current + 1) % (attractGames.length || 1)
      setCurrentIdx(indexRef.current)
      setVideoError(e => ({ ...e, [indexRef.current]: false }))
      setFadeClass(styles.fadeIn)
    }, FADE_DURATION)
  }, [attractGames.length])

  // Start/stop cycling
  useEffect(() => {
    if (!isActive) {
      clearInterval(timerRef.current)
      setVisible(false)
      return
    }
    setVisible(true)
    setCurrentIdx(0)
    indexRef.current = 0
    timerRef.current = setInterval(goToNext, CYCLE_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [isActive, goToNext])

  // Play video when slide changes
  useEffect(() => {
    if (!videoRef.current || !isActive) return
    videoRef.current.currentTime = 0
    videoRef.current.play().catch(() => {})
  }, [currentIdx, isActive])

  // Wake on any input
  useEffect(() => {
    const wake = (e) => {
      if (!isActive) return
      if (e.type === "keydown" && ["ArrowLeft","ArrowRight","Enter"," "].includes(e.key)) return
      onWake()
    }
    window.addEventListener("keydown", wake)
    window.addEventListener("click",   wake)
    return () => {
      window.removeEventListener("keydown", wake)
      window.removeEventListener("click",   wake)
    }
  }, [isActive, onWake])

  if (!isActive || !visible || attractGames.length === 0) return null

  const game   = attractGames[currentIdx] || attractGames[0]
  const gameId = game.id || game.profile?.replace(".xml","").replace(".vpx","")
  const art    = artwork?.[game.id || game.profile] || {}

  const videoUrl = window.nuarcade?.platform === "win32"
    ? "file:///F:/Media/Videos/" + gameId + ".mp4"
    : null

  const hasVideo = videoUrl && !videoError[currentIdx]
  const heroUrl  = art.hero || null
  const logoUrl  = art.logo || null

  const GENRE_COLORS = {
    Racing:  "#0066cc", Fighting: "#9900cc", Shooter: "#cc0000",
    Rhythm:  "#6600cc", Flying:   "#0099cc", Sports:  "#009900",
    Pinball: "#ff6600", PS3:      "#0070d1", Xbox360: "#107c10",
    GCWii:   "#6b21a8", PS2:      "#003791", Switch:  "#e4000f",
  }
  const accentColor = GENRE_COLORS[game.genre] || "#00ff88"

  return (
    <div className={styles.overlay} onClick={onWake}>
      {/* Background layer */}
      <div className={`${styles.bgLayer} ${fadeClass}`}>
        {hasVideo && (
          <video
            ref={videoRef}
            className={styles.bgVideo}
            src={videoUrl}
            muted
            loop
            playsInline
            autoPlay
            onError={() => setVideoError(e => ({ ...e, [currentIdx]: true }))}
          />
        )}
        {!hasVideo && heroUrl && (
          <img src={heroUrl} alt="" className={styles.bgHero} />
        )}
        {!hasVideo && !heroUrl && (
          <div
            className={styles.bgColor}
            style={{ background: "radial-gradient(ellipse at center, " + accentColor + "22 0%, #000 70%)" }}
          />
        )}
        <div className={styles.bgOverlay} />
      </div>

      {/* Scanlines */}
      <div className={styles.scanlines} />

      {/* Game info */}
      <div className={`${styles.gameInfo} ${fadeClass}`}>
        {logoUrl ? (
          <img src={logoUrl} alt={game.title} className={styles.gameLogo} />
        ) : (
          <div className={styles.gameTitle} style={{ color: accentColor }}>
            {game.title}
          </div>
        )}
        <div className={styles.gameSystem}>{game.system || game.genre}</div>
        <div className={styles.gameGenre} style={{ background: accentColor + "22", borderColor: accentColor + "44", color: accentColor }}>
          {game.genre}
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <div className={styles.nuarcadeBrand}>NuArcade</div>
        <div className={styles.insertCoin}>INSERT COIN</div>
        <div className={styles.gameCount}>{attractGames.length} games</div>
      </div>

      {/* Progress dots */}
      <div className={styles.dots}>
        {attractGames.slice(0, Math.min(attractGames.length, 12)).map((_, i) => (
          <div
            key={i}
            className={styles.dot + (i === currentIdx ? " " + styles.dotActive : "")}
            style={i === currentIdx ? { background: accentColor } : {}}
          />
        ))}
      </div>

      {/* Corner watermark */}
      <div className={styles.version}>v1.6.0</div>
    </div>
  )
}
