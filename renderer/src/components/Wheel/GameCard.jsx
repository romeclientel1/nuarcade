import { useState, useEffect } from "react"
import styles from "./GameCard.module.css"
import { generatePlaceholderSvg } from "../../hooks/generatePlaceholder"
import { useGameNotes } from "../../hooks/useGameNotes"
import { useI18n } from "../../i18n/I18nContext.js"

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

const EMULATOR_COLORS = {
  teknoparrot: { bg: '#0a0500', accent: '#ff6a00', label: 'ARCADE',  badge: '#ff6a00' },
  mame:        { bg: '#0d0400', accent: '#ff4400', label: 'MAME',    badge: '#ff4400' },
  rpcs3:       { bg: '#00050f', accent: '#003087', label: 'PS3',     badge: '#003087' },
  xenia:       { bg: '#001a00', accent: '#107c10', label: 'XBOX360', badge: '#107c10' },
  dolphin:     { bg: '#050010', accent: '#6a0dad', label: 'GCN/WII', badge: '#6a0dad' },
  pcsx2:       { bg: '#00050f', accent: '#00439c', label: 'PS2',     badge: '#00439c' },
  ryujinx:     { bg: '#0a0000', accent: '#e4000f', label: 'SWITCH',  badge: '#e4000f' },
  duckstation: { bg: '#00050f', accent: '#003791', label: 'PS1',     badge: '#003791' },
  flycast:     { bg: '#0d0600', accent: '#f5821f', label: 'DCAST',   badge: '#f5821f' },
  xemu:        { bg: '#001a00', accent: '#107c10', label: 'XEMU',    badge: '#107c10' },
  cxbx:        { bg: '#001a00', accent: '#5cb85c', label: 'CXBX',    badge: '#5cb85c' },
  ppsspp:      { bg: '#00050f', accent: '#00439c', label: 'PSP',     badge: '#00439c' },
  cemu:        { bg: '#050010', accent: '#009ac7', label: 'WII U',   badge: '#009ac7' },
  model2:      { bg: '#0d0600', accent: '#ff6a00', label: 'MDL2',    badge: '#ff6a00' },
  model3:      { bg: '#0d0300', accent: '#ff3300', label: 'MDL3',    badge: '#ff3300' },
  retroarch:   { bg: '#06000d', accent: '#9933ff', label: 'RETRO',   badge: '#9933ff' },
  steam:       { bg: '#001020', accent: '#1b9aef', label: 'STEAM',   badge: '#1b9aef' },
  pc:          { bg: '#001a10', accent: '#00cc66', label: 'PC',      badge: '#00cc66' },
  pinball:     { bg: '#1a0a00', accent: '#ff6600', label: 'VPX',     badge: '#ff6600' },
}


const STATUS_COLORS = {
  Perfect:          "#00ff88",
  Great:            "#ffaa00",
  Playable:         "#ffaa00",
  Unverified:       "#888888",
  ready:            "#00ff88",
  discovered:       "#ffaa00",
  "path-missing":   "#e2694a",
  "not-configured": "#888888",
}

// Vespara: every card shares this deep teal-black base rather than the old
// per-genre/emulator rainbow slab -- genre/system identity now lives only
// in small accents (the system label, the flip-back panel), not the whole
// card's background.
const CARD_BG = "#142522"

export default function GameCard({ game, isCenter, isNavFocused, onClick, isFavorite, artwork, artPref }) {
  const { t } = useI18n()
  const [imgLoaded,   setImgLoaded  ] = useState(false)
  const [imgError,    setImgError   ] = useState(false)
  const [heroLoaded,  setHeroLoaded ] = useState(false)
  const [capsLoaded,  setCapsLoaded ] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const { getRating, getNote } = useGameNotes()

  // Reset flip when card loses center position
  useEffect(() => { if (!isCenter) setFlipped(false) }, [isCenter])

  // The wheel's navigation deliberately overshoots by one card then snaps
  // back ~80ms later for the spring feel (see navigate() in Wheel.jsx) --
  // which means a card briefly becomes "center" and un-becomes it again
  // before the real target settles. Mounting the full hero background +
  // logo immediately on isCenter would let that overshoot card's art flash
  // on screen for that ~80ms window. Debouncing past it means hero art
  // only appears once a selection has actually settled, not mid-correction.
  const [heroReady, setHeroReady] = useState(false)
  useEffect(() => {
    if (!isCenter) { setHeroReady(false); return }
    const t = setTimeout(() => setHeroReady(true), 100)
    return () => clearTimeout(t)
  }, [isCenter])

  // Tab key toggles flip on center card
  useEffect(() => {
    if (!isCenter) return
    const handler = (e) => { if (e.key === 'Tab') { e.preventDefault(); setFlipped(f => !f) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isCenter])

  const rating = getRating(game)
  const note   = getNote(game)

  const colors      = EMULATOR_COLORS[game.emulator] || GENRE_COLORS[game.genre] || GENRE_COLORS.Other
  const statusColor = STATUS_COLORS[game.status] || "#888888"

  // Artwork sources
  const gameArt   = artwork?.[game.id || game.profile] || null
  // pref: 'snap' | 'boxart' | 'sgdb' | 'none'  (default: 'sgdb')
  const pref = artPref || 'sgdb'
  const sgdbHero   = gameArt?.hero    || null
  const localSnap  = game.snapPath    || null
  const localBox   = game.boxArtPath  || null
  const heroUrl = (() => {
    if (pref === 'none') return null
    if (pref === 'snap')   return localSnap   || sgdbHero  || null
    if (pref === 'boxart') return localBox    || sgdbHero  || null
    // default 'sgdb'
    return sgdbHero || localSnap || localBox || null
  })()
  const capsuleUrl= gameArt?.capsule || null
  const logoUrl   = gameArt?.logo    || null

  const tpThumb   = game.isPinball ? null
    : (game.id && !game.isLauncher) ? `${THUMBNAIL_BASE}${game.id}.png` : null





  const showHero    = heroReady && heroUrl
  const showCapsule = capsuleUrl
  const showThumb   = tpThumb && !imgError && !showCapsule

  return (
    <div className={`${styles.flipContainer} ${flipped ? styles.flipped : ''}`}>
      <div className={styles.flipFront} onClick={onClick}>
        <div
          className={`${styles.card} ${isCenter ? styles.center : styles.neighbor}${isCenter && isNavFocused ? ' ' + styles.centerActive : ''}`}
          style={{ background: CARD_BG }}
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
        {/* Placeholder always renders as background -- real art overlays it */}
        {!game.isPinball && (
          <img
            src={generatePlaceholderSvg(game)}
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1,
              // Real capsule art (especially EmuMovies "3D box" style, which
              // is a stylized graphic on a transparent background rather
              // than a full-bleed rectangle) can have transparent regions --
              // without hiding the placeholder once real art loads, this
              // unrelated generated image shows through those gaps instead
              // of the card's own background color.
              opacity: (showCapsule && capsLoaded) ? 0 : 0.85,
              transition: 'opacity 0.3s ease',
            }}
          />
        )}


        {/* SteamGridDB capsule art -- z-index 2 */}
        {showCapsule && (
          <img
            src={capsuleUrl}
            alt={game.title}
            onLoad={() => setCapsLoaded(true)}
            onError={() => {}}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2, opacity: capsLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        )}

        {/* TeknoParrot thumbnail fallback -- z-index 2 */}
        {showThumb && (
          <img
            src={tpThumb}
            alt={game.title}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2, opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        )}

        {/* Pinball fallback */}
        {game.isPinball && !showCapsule && (
          <div className={styles.pinballFallback} style={{ borderColor: colors.accent + "44" }}>
            <div className={styles.pinballIcon}>PIN</div>
            <div className={styles.pinballName} style={{ color: colors.accent }}>{game.title}</div>
            <div className={styles.pinballSys}>Visual Pinball X</div>
          </div>
        )}


        {/* Logo overlay on capsule/hero */}
        {heroReady && logoUrl && (
          <img src={logoUrl} alt="" className={styles.logoOverlay} />
        )}
      </div>

      <div className={styles.gradient} />

      <div className={styles.statusDot} style={{ background: statusColor }} title={game.status} />
      {(game.status === 'not-configured' || game.status === 'path-missing' || game.status === 'discovered') && (
        <div style={{
          position: 'absolute', bottom: 28, left: 0, right: 0,
          textAlign: 'center', padding: '3px 6px',
          background: game.status === 'path-missing' ? 'rgba(196,90,70,0.92)' : 'rgba(11,22,21,0.88)',
          color: game.status === 'path-missing' ? '#fdf1ea' : 'rgba(232,220,195,0.65)',
          fontSize: 9, fontFamily: 'Share Tech Mono, monospace',
          letterSpacing: 1, zIndex: 10,
        }}>
          {game.status === 'path-missing'   ? 'FILE MISSING' :
           game.status === 'not-configured' ? 'SETUP IN TP'  : 'NEEDS CONFIG'}
        </div>
      )}

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
          <div className={styles.system}>
            <span className={styles.systemAccentDot} style={{ background: colors.accent }} />
            {game.system}
          </div>
        </div>
      )}

      {isCenter && (
        <div className={styles.playOverlay}>
          <div className={styles.playBtn}>
            {game.isPinball ? t("gameCard.launch") : t("gameCard.play")}
          </div>
        </div>
      )}

      {isCenter && <div className={styles.accentBorder} />}

        </div>
      </div>
      <div className={styles.flipBack} style={{ background: colors.bg, borderColor: colors.accent }} onClick={() => setFlipped(false)}>
        <div className={styles.flipBackInner}>
          <div className={styles.flipBackSystem} style={{ color: colors.accent }}>{game.system || game.emulator}</div>
          <div className={styles.flipBackTitle}>{game.title}</div>
          <div className={styles.flipBackDivider} style={{ borderColor: colors.accent }} />
          <div className={styles.flipBackRow}><span>Genre</span><span>{game.genre || 'Classic'}</span></div>
          <div className={styles.flipBackRow}><span>Status</span><span>{game.status || 'Playable'}</span></div>
          <div className={styles.flipBackRow}><span>Emulator</span><span>{game.emulator}</span></div>
          <div className={styles.flipBackHint} style={{ color: colors.accent }}>Tab or tap to flip back</div>
        </div>
      </div>
    </div>

  )
}
