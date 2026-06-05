import { useState, useRef, useEffect } from 'react'
import styles from './GameCard.module.css'

const THUMBNAIL_BASE = 'https://raw.githubusercontent.com/teknogods/TeknoParrotUIThumbnails/master/Icons/'

const GENRE_COLORS = {
  Racing:   { bg: '#001a33', accent: '#0066cc' },
  Fighting: { bg: '#1a001a', accent: '#9900cc' },
  Shooter:  { bg: '#1a0000', accent: '#cc0000' },
  Rhythm:   { bg: '#0a001a', accent: '#6600cc' },
  Flying:   { bg: '#000d1a', accent: '#0099cc' },
  Sports:   { bg: '#001a00', accent: '#009900' },
  Pinball:  { bg: '#1a0d00', accent: '#cc6600' },
  Other:    { bg: '#0a0a0a', accent: '#444444' },
}

const GENRE_ICONS = {
  Racing:   '🏎️',
  Fighting: '⚔️',
  Shooter:  '🎯',
  Rhythm:   '🎵',
  Flying:   '✈️',
  Sports:   '🏆',
  Pinball:  '🎱',
  Other:    '🎮',
}

export default function GameCard({ game, isCenter, onClick }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef(null)

  const colors = GENRE_COLORS[game.genre] || GENRE_COLORS.Other
  const fallbackIcon = game.icon || GENRE_ICONS[game.genre] || '🎮'
  const imgUrl = game.id ? `${THUMBNAIL_BASE}${game.id}.png` : null

  // Video path — local file on Windows cabinet
  // On Mac dev mode this will just fail silently and show artwork instead
  const videoId = game.id || game.profile?.replace('.xml', '')
  const videoUrl = game.videoPath || 
    (window.nuarcade?.platform === 'win32' 
      ? `file:///F:/Media/Videos/${videoId}.mp4`
      : null)

  // Play video when card becomes center
  useEffect(() => {
    if (!videoRef.current) return
    if (isCenter && videoUrl && !videoError) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => setVideoError(true))
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setVideoReady(false)
    }
  }, [isCenter, videoUrl, videoError])

  const showVideo = isCenter && videoUrl && !videoError && videoReady

  return (
    <div
      className={`${styles.card} ${isCenter ? styles.center : ''}`}
      style={{ background: colors.bg }}
      onClick={onClick}
    >
      <div className={styles.artWrap}>

        {/* Video layer — only on center card, only on Windows */}
        {isCenter && videoUrl && !videoError && (
          <video
            ref={videoRef}
            className={`${styles.videoEl} ${videoReady ? styles.videoVisible : ''}`}
            src={videoUrl}
            muted
            loop
            playsInline
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoError(true)}
          />
        )}

        {/* Artwork layer — shows while video loads or if no video */}
        {imgUrl && !imgError && (
          <img
            src={imgUrl}
            alt={game.title}
            className={`${styles.artImg} ${imgLoaded ? styles.artLoaded : ''} ${showVideo ? styles.artHidden : ''}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {/* Fallback — genre icon with glow */}
        {(!imgUrl || !imgLoaded || imgError) && !showVideo && (
          <div className={styles.artFallback} style={{ background: colors.bg }}>
            <div className={styles.fallbackIcon}>{fallbackIcon}</div>
            <div
              className={styles.fallbackGlow}
              style={{ background: `radial-gradient(ellipse at center, ${colors.accent}22 0%, transparent 70%)` }}
            />
          </div>
        )}

        {/* Video indicator badge */}
        {showVideo && (
          <div className={styles.videoBadge}>▶ LIVE</div>
        )}

      </div>

      <div className={styles.gradient} />

      <div
        className={styles.statusDot}
        style={{ background: game.status === 'Perfect' ? '#00ff88' : '#ffaa00' }}
        title={game.status}
      />

      <div className={styles.info}>
        <div className={styles.title}>{game.title}</div>
        <div className={styles.system}>{game.system}</div>
      </div>

      {isCenter && (
        <div className={styles.playOverlay}>
          <div className={styles.playBtn} style={{ borderColor: colors.accent, color: colors.accent }}>▶</div>
        </div>
      )}

      {isCenter && (
        <div
          className={styles.accentBorder}
          style={{ boxShadow: `inset 0 0 20px ${colors.accent}22, 0 0 40px ${colors.accent}33` }}
        />
      )}
    </div>
  )
}