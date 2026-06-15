import { useState, useRef, useEffect } from "react"
import styles from "./GameCard.module.css"
import { generatePlaceholderSvg } from "../../hooks/generatePlaceholder"
import { useGameNotes } from "../../hooks/useGameNotes"

const THUMBNAIL_BASE = "https://raw.githubusercontent.com/teknogods/TeknoParrotUIThumbnails/master/Icons/"

const GENRE_COLORS = {
  Racing:    { bg: "#001a33", accent: "#0066cc" },
  Fighting:  { bg: "#1a001a", accent: "#9900cc" },
  Shooter:   { bg: "#1a0000", accent: "#cc0000" },
  Rhythm:    { bg: "#0a001a", accent: "#6600cc" },
  Flying:    { bg: "#000d1a", accent: "#0099cc" },
  Sports:    { bg: "#001a00", accent: "#009900" },
  Pinball:   { bg: "#1a0a00", accent: "#ff6600" },
  Arcade:    { bg: "#0d0600", accent: "#ff6600" },
  Retro:     { bg: "#06000d", accent: "#9933ff" },
  N64:       { bg: "#0a0010", accent: "#e4000f" },
  PS1:       { bg: "#000510", accent: "#003791" },
  PSP:       { bg: "#000a15", accent: "#0057a8" },
  Dreamcast: { bg: "#0d0600", accent: "#ff6600" },
  WiiU:      { bg: "#000510", accent: "#009ac7" },
  Model2:    { bg: "#00060d", accent: "#0055aa" },
  Model3:    { bg: "#000d06", accent: "#0088aa" },
  PS3:       { bg: "#000d1a", accent: "#0070d1" },
  Xbox360:   { bg: "#001a00", accent: "#107c10" },
  GCWii:     { bg: "#0d001a", accent: "#6b21a8" },
  PS2:       { bg: "#00001a", accent: "#003791" },
  Switch:    { bg: "#1a0000", accent: "#e4000f" },
  Other:     { bg: "#0a0a0a", accent: "#444444" },
}

const STATUS_COLORS = {
  Perfect:    "#00ff88",
  Great:      "#ffaa00",
  Playable:   "#ffaa00",
  Unverified: "#888888",
}

export default function GameCard({ game, isCenter, onClick, isFavorite, artwork }) {
  const [imgLoaded,   setImgLoaded  ] = useState(false)
  const [imgError,    setImgError   ] = useState(false)
  const [heroLoaded,  setHeroLoaded ] = useState(false)
  const [capsLoaded,  setCapsLoaded ] = useState(false)
  const [videoReady,  setVideoReady ] = useState(false)
  const [videoError,  setVideoError ] = useState(false)
  const videoRef = useRef(null)
  const { getRating, getNote } = useGameNotes()
  const rating = getRating(game)
  const note   = getNote(game)

  const colors      = GENRE_COLORS[game.genre] || GENRE_COLORS.Other
  const statusColor = STATUS_COLORS[game.status] || "#888888"

  // Artwork sources
  const gameArt   = artwork?.[game.id || game.profile] || null
  const heroUrl   = gameArt?.hero    || null
  const capsuleUrl= gameArt?.capsule || null
  const logoUrl   = gameArt?.logo    || null

  const tpThumb   = game.isPinball ? null
    : game.id ? `${THUMBNAIL_BASE}${game.id}.png` : null

  const videoId   = game.id || game.profile?.replace(".xml","").replace(".vpx","")
  // Only use explicit videoPath from the video registry.
  // The old fallback guess caused silent errors on every game without a clip.
  const videoUrl  = game.videoPath || null

  useEffect(() => {
    if (!videoRef.current) return

    if (isCenter && videoUrl && !videoError) {
      videoRef.current.load()
      // Small delay so the element settles before play -- avoids AbortError
      // on rapid wheel navigation
      const t = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0
          videoRef.current.play().catch(() => setVideoError(true))
        }
      }, 120)
      return () => clearTimeout(t)
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setVideoReady(false)
    }
  }, [isCenter, videoUrl])

  // Reset video error state when game changes so a bad clip on one
  // game doesn't permanently disable video on the next
  useEffect(() => {
    setVideoError(false)
    setVideoReady(false)
  }, [game.id, game.profile])

  const showVideo   = isCenter && videoUrl && !videoError && videoReady
  const showHero    = isCenter && heroUrl && !showVideo
  const showCapsule = capsuleUrl && !showVideo
  const showThumb   = tpThumb && !imgError && !showCapsule && !showVideo

  return (
    <div
      className={`${styles.card} ${isCenter ? styles.center : ""}`}
      style={{ background: colors.bg }}
      onClick={onClick}
    >
      {/* Hero image -- full bleed background on center card */}
      {showHero && (
        <img
          src={heroUrl}
          alt=""
          className={`${styles.heroImg} ${heroLoaded ? styles.heroLoaded : ""}`}
          onLoad={() => setHeroLoaded(true)}
          onError={() => {}}
        />
      )}

      <div className={styles.artWrap}>
        {/* Video snap */}
        {isCenter && videoUrl && !videoError && (
          <video
            ref={videoRef}
            className={`${styles.videoEl} ${videoReady ? styles.videoVisible : ""}`}
            src={videoUrl}
            muted
            loop
            playsInline
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoError(true)}
          />
        )}

        {/* SteamGridDB capsule art */}
        {showCapsule && (
          <img
            src={capsuleUrl}
            alt={game.title}
            className={`${styles.artImg} ${capsLoaded ? styles.artLoaded : ""} ${showVideo ? styles.artHidden : ""}`}
            onLoad={() => setCapsLoaded(true)}
            onError={() => {}}
          />
        )}

        {/* TeknoParrot thumbnail fallback */}
        {showThumb && (
          <img
            src={tpThumb}
            alt={game.title}
            className={`${styles.artImg} ${imgLoaded ? styles.artLoaded : ""} ${showVideo ? styles.artHidden : ""}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {/* Pinball fallback */}
        {game.isPinball && !showVideo && !showCapsule && (
          <div className={styles.pinballFallback} style={{ borderColor: colors.accent + "44" }}>
            <div className={styles.pinballIcon}>PIN</div>
            <div className={styles.pinballName} style={{ color: colors.accent }}>{game.title}</div>
            <div className={styles.pinballSys}>Visual Pinball X</div>
          </div>
        )}

        {/* Generated placeholder -- always shows something */}
        {!game.isPinball && !showThumb && !showCapsule && !showVideo && (
          <img
            src={generatePlaceholderSvg(game)}
            alt={game.title}
            className={styles.artImg}
            style={{ opacity: 0.85 }}
          />
        )}

        {showVideo && <div className={styles.videoBadge}>LIVE</div>}

        {/* Logo overlay on capsule/hero */}
        {isCenter && logoUrl && !showVideo && (
          <img src={logoUrl} alt="" className={styles.logoOverlay} />
        )}
      </div>

      <div className={styles.gradient} />

      <div className={styles.statusDot} style={{ background: statusColor }} title={game.status} />

      {isFavorite && <div className={styles.favIndicator}>*</div>}

      {rating > 0 && (
        <div className={styles.ratingIndicator}>
          {"*".repeat(rating)}
        </div>
      )}

      {note && isCenter && (
        <div className={styles.notePreview}>{note.slice(0, 60)}{note.length > 60 ? "..." : ""}</div>
      )}

      {!game.isPinball && (
        <div className={styles.info}>
          <div className={styles.title}>{game.title}</div>
          <div className={styles.system}>{game.system}</div>
        </div>
      )}

      {isCenter && (
        <div className={styles.playOverlay}>
          <div className={styles.playBtn} style={{ borderColor: colors.accent, color: colors.accent }}>
            {game.isPinball ? "LAUNCH" : "PLAY"}
          </div>
        </div>
      )}

      {isCenter && (
        <div className={styles.accentBorder}
          style={{ boxShadow: `inset 0 0 20px ${colors.accent}22, 0 0 40px ${colors.accent}33` }}
        />
      )}
    </div>
  )
}
