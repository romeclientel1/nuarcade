import { useState, useEffect, useRef, useCallback } from "react"
import { useVersionCheck } from "../../hooks/useVersionCheck"
import styles from "./AttractMode.module.css"
import { useGamepad } from "../../hooks/useGamepad"

const CYCLE_INTERVAL = 6000
const FADE_DURATION  = 600

const GENRE_COLORS = {
  Racing:    "#0066cc", Fighting: "#9900cc", Shooter:   "#cc0000",
  Rhythm:    "#6600cc", Flying:   "#0099cc", Sports:    "#009900",
  Pinball:   "#ff6600", Arcade:   "#ff6600", Retro:     "#9933ff",
  N64:       "#e4000f", PS1:      "#003791", PSP:       "#0057a8",
  Dreamcast: "#ff6600", WiiU:     "#009ac7", Model2:    "#0055aa",
  Model3:    "#0088aa", PS3:      "#0070d1", Xbox360:   "#107c10",
  GCWii:     "#6b21a8", PS2:      "#003791", Switch:    "#e4000f",
  Other:     "#00ff88",
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function AttractMode({ games, isActive, onWake, onSelect, artwork, attractConfig = {} }) {
  const { currentVersion } = useVersionCheck()

  // Any gamepad button press wakes attract mode
  useGamepad({
    confirm:     onWake,
    back:        onWake,
    left:        onWake,
    right:       onWake,
    up:          onWake,
    down:        onWake,
    settings:    onWake,
    filterLeft:  onWake,
    filterRight: onWake,
    random:      onWake,
    launch:      onWake,
    favorite:    onWake,
    detail:      onWake,
    enabled:     true,
  })
  const [currentIdx,  setCurrentIdx ] = useState(0)
  const [visible,     setVisible    ] = useState(false)
  const [phase,       setPhase      ] = useState("in") // "in" | "out"
  const [videoError,  setVideoError ] = useState({})
  const [shuffled,    setShuffled   ] = useState([])
  const videoRef  = useRef(null)
  const timerRef  = useRef(null)
  const indexRef  = useRef(0)

  // Build a shuffled list -- respect attractPreferArt config
  useEffect(() => {
    if (!games.length) return
    const preferArt = attractConfig.preferArt !== false
    const withArt = games.filter(g => artwork?.[g.id || g.profile]?.hero || artwork?.[g.id || g.profile]?.capsule)
    const pool = (preferArt && withArt.length >= 6) ? withArt : games
    setShuffled(shuffle(pool))
  }, [games, artwork, attractConfig.preferArt])

  const goToNext = useCallback(() => {
    setPhase("out")
    setTimeout(() => {
      indexRef.current = (indexRef.current + 1) % (shuffled.length || 1)
      setCurrentIdx(indexRef.current)
      setPhase("in")
    }, FADE_DURATION)
  }, [shuffled.length])

  useEffect(() => {
    if (!isActive) {
      clearInterval(timerRef.current)
      setVisible(false)
      return
    }
    setVisible(true)
    indexRef.current = 0
    setCurrentIdx(0)
    setPhase("in")
    const cycleMs = (attractConfig.cycleSpeed || 6) * 1000
    timerRef.current = setInterval(goToNext, cycleMs)
    return () => clearInterval(timerRef.current)
  }, [isActive, goToNext])

  useEffect(() => {
    if (!videoRef.current || !isActive) return
    videoRef.current.currentTime = 0
    videoRef.current.play().catch(() => {})
  }, [currentIdx, isActive])

  // Keep video volume in sync with the "Attract volume" setting
  useEffect(() => {
    if (!videoRef.current) return
    const vol = Math.max(0, Math.min(1, (attractConfig.ambientVolume ?? 35) / 100))
    videoRef.current.volume = vol
  }, [attractConfig.ambientVolume, currentIdx])

  useEffect(() => {
    const wake = (e) => {
      if (!isActive) return
      // Arrow keys navigate while attract mode is active -- don't wake on those
      if (e.type === "keydown" && ["ArrowLeft","ArrowRight","Enter"," "].includes(e.key)) return
      // Snap wheel to the game currently showing in attract mode
      if (onSelect && shuffled.length > 0) {
        const showing = shuffled[indexRef.current]
        if (showing) {
          const realIdx = games.findIndex(g =>
            (g.id && g.id === showing.id) || (g.profile && g.profile === showing.profile)
          )
          if (realIdx >= 0) onSelect(realIdx)
        }
      }
      onWake()
    }
    window.addEventListener("keydown", wake)
    window.addEventListener("gamepadconnected", onWake)
    window.addEventListener("click",   wake)
    return () => {
      window.removeEventListener("keydown", wake)
      window.removeEventListener("gamepadconnected", onWake)
      window.removeEventListener("click",   wake)
    }
  }, [isActive, onWake, onSelect, shuffled, games])

  if (!isActive || !visible || shuffled.length === 0) return null

  const game   = shuffled[currentIdx] || shuffled[0]
  const gameId = game.id || game.profile?.replace(".xml","").replace(".vpx","")
  const art    = artwork?.[game.id || game.profile] || {}

  const videoUrl = window.nuarcade?.platform === "win32"
    ? "file:///F:/Media/Videos/" + gameId + ".mp4"
    : null

  const hasVideo   = videoUrl && !videoError[currentIdx]
  const heroUrl    = art.hero    || null
  const capsuleUrl = art.capsule || null
  const logoUrl    = art.logo    || null
  const accent     = GENRE_COLORS[game.genre] || "#00ff88"
  const fadeStyle  = { opacity: phase === "in" ? 1 : 0, transition: `opacity ${FADE_DURATION}ms ease` }

  // Progress dots -- show max 16, use proportional active indicator
  const totalDots = Math.min(shuffled.length, 16)
  const activeDot = Math.floor((currentIdx / shuffled.length) * totalDots)

  return (
    <div className={styles.overlay} onClick={onWake}>

      {/* Background */}
      <div className={styles.bg} style={fadeStyle}>
        {hasVideo && (
          <video
            ref={videoRef}
            className={styles.bgVideo}
            src={videoUrl}
            loop playsInline autoPlay
            onError={() => setVideoError(e => ({ ...e, [currentIdx]: true }))}
          />
        )}
        {!hasVideo && heroUrl && (
          <img src={heroUrl} alt="" className={styles.bgHero} />
        )}
        {!hasVideo && !heroUrl && capsuleUrl && (
          <img src={capsuleUrl} alt="" className={styles.bgCapsule} />
        )}
        {!hasVideo && !heroUrl && !capsuleUrl && (
          <div className={styles.bgColor}
            style={{ background: "radial-gradient(ellipse at 40% 40%, " + accent + "30 0%, #000 65%)" }}
          />
        )}
        <div className={styles.bgOverlay} />
        <div className={styles.bgVignette} />
      </div>

      {/* Scanlines */}
      <div className={styles.scanlines} />

      {/* Capsule art overlay -- floats over hero art OR video, whichever
          is the current background. Only fully suppressed when capsule art
          is itself acting as the background (no video, no hero). */}
      {(hasVideo || heroUrl) && capsuleUrl && (
        <div className={styles.capsuleWrap} style={fadeStyle}>
          <img src={capsuleUrl} alt="" className={styles.capsuleFloat} />
        </div>
      )}

      {/* Game info */}
      <div className={styles.gameInfo} style={fadeStyle}>
        <div className={styles.systemTag} style={{ background: accent + "22", borderColor: accent + "44", color: accent }}>
          {game.system || game.genre}
        </div>
        {logoUrl ? (
          <img src={logoUrl} alt={game.title} className={styles.gameLogo} />
        ) : (
          <div className={styles.gameTitle} style={{ color: "#fff", textShadow: "0 0 40px " + accent + "88" }}>
            {game.title}
          </div>
        )}
        {game.genre && !logoUrl && (
          <div className={styles.gameGenre} style={{ color: accent + "aa" }}>{game.genre}</div>
        )}
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <div className={styles.nuarcadeBrand}>
          <span className={styles.brandPrimary}>VESPARA</span>
          <span className={styles.brandSecondary}>by NuArcade</span>
        </div>
        <div className={styles.insertCoin}>
          <span className={styles.coinBlink}>INSERT COIN</span>
        </div>
        <div className={styles.gameCount}>{games.length} games</div>
      </div>

      {/* Progress dots */}
      <div className={styles.dots}>
        {Array.from({ length: totalDots }).map((_, i) => (
          <div
            key={i}
            className={styles.dot + (i === activeDot ? " " + styles.dotActive : "")}
            style={i === activeDot ? { background: accent } : {}}
          />
        ))}
      </div>

      {/* Version */}
      <div className={styles.version}>v{currentVersion}</div>
    </div>
  )
}
