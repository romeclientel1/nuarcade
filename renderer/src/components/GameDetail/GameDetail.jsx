import { useState, useEffect, useRef } from "react"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useGameNotes } from "../../hooks/useGameNotes"
import { useCollections } from "../Collections/Collections"
import ControllerBadge from "../ControllerBadge/ControllerBadge"
import styles from "./GameDetail.module.css"

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

const THUMBNAIL_BASE = "https://raw.githubusercontent.com/teknogods/TeknoParrotUIThumbnails/master/Icons/"

const GENRE_ICONS = {
  Racing:   "RAC",
  Fighting: "FGT",
  Shooter:  "GUN",
  Rhythm:   "RHY",
  Flying:   "FLY",
  Sports:   "SPT",
  Pinball:  "PIN",
  Other:    "OTH",
}

const CONTROLLERS = [
  { id: "auto",     label: "Auto",         icon: "A",  desc: "Use genre default" },
  { id: "wheel",    label: "Racing Wheel",  icon: "W",  desc: "DirectInput wheel" },
  { id: "lightgun", label: "Light Gun",     icon: "G",  desc: "Sinden / GUN4IR" },
  { id: "gamepad",  label: "Xbox Gamepad",  icon: "GP", desc: "XInput controller" },
]

function getControls(genre) {
  const maps = {
    Racing:   [
      { icon: "W",   label: "Steering wheel" },
      { icon: "GAS", label: "Gas pedal" },
      { icon: "BRK", label: "Brake pedal" },
      { icon: "S+",  label: "Shift up" },
      { icon: "S-",  label: "Shift down" },
      { icon: "CAM", label: "View change" },
    ],
    Shooter:  [
      { icon: "AIM", label: "Light gun aim" },
      { icon: "FIRE",label: "Trigger - fire" },
      { icon: "RLD", label: "Reload" },
      { icon: "ST",  label: "Start" },
    ],
    Fighting: [
      { icon: "LS",  label: "Left stick - move" },
      { icon: "A",   label: "A - punch" },
      { icon: "B",   label: "B - kick" },
      { icon: "X",   label: "X - heavy" },
      { icon: "Y",   label: "Y - special" },
    ],
    Rhythm:   [
      { icon: "BTN", label: "Face buttons - notes" },
      { icon: "NAV", label: "Stick - navigation" },
      { icon: "ST",  label: "Start" },
    ],
    Flying:   [
      { icon: "LS",  label: "Left stick - pitch/roll" },
      { icon: "RT",  label: "RT - fire" },
      { icon: "LT",  label: "LT - afterburner" },
    ],
    Pinball:  [
      { icon: "LB",  label: "LB - left flipper" },
      { icon: "RB",  label: "RB - right flipper" },
      { icon: "UP",  label: "Up - plunge" },
    ],
  }
  return maps[genre] || [
    { icon: "LS",  label: "Left stick - move" },
    { icon: "A",   label: "A - confirm" },
    { icon: "B",   label: "B - back" },
    { icon: "ST",  label: "Start" },
  ]
}

export default function GameDetail({ game, onClose, onLaunch, launching, artwork, games = [], onSelectGame }) {
  const [imgError, setImgError] = useState(false)
  const [controllerOverride, setControllerOverride] = useState("auto")
  const [savingController, setSavingController] = useState(false)

  const { getNote, saveNote, getRating, saveRating } = useGameNotes()
  const { getPlaytime, getLaunches, formatTime, formatLastPlayed } = usePlaytime()
  const { getCollections, addToCollection, removeFromCollection } = useCollections()
  const [note, setNote] = useState("")
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [collections, setCollections] = useState(() => getCollections())
  const noteTimer = useRef(null)
  const colors = GENRE_COLORS[game.genre] || GENRE_COLORS.Other
  const statusColor = STATUS_COLORS[game.status] || "#888888"
  const imgUrl = game.id && !game.isPinball ? THUMBNAIL_BASE + game.id + ".png" : null
  const fallbackIcon = game.icon || GENRE_ICONS[game.genre] || "--"

  const gameId  = game.id || game.profile
  const pt      = getPlaytime(gameId)
  const lc      = getLaunches(gameId)
  const lastDate = lc.last || pt.last || null

  // Artwork from cache (SteamGridDB / ScreenScraper)
  const gameArt   = artwork?.[gameId] || null
  const heroUrl   = gameArt?.hero    || null
  const capsuleUrl= gameArt?.capsule || null
  const logoUrl   = gameArt?.logo    || null

  useEffect(() => {
    loadControllerOverride()
    setNote(getNote(game))
    setRating(getRating(game))
  }, [game.id])

  const handleRating = (stars) => {
    const newRating = stars === rating ? 0 : stars // tap same star to clear
    setRating(newRating)
    saveRating(game, newRating)
  }

  const loadControllerOverride = async () => {
    if (window.nuarcade && game.id) {
      const override = await window.nuarcade.getControllerOverride(game.id)
      setControllerOverride(override || "auto")
    }
  }

  const handleControllerChange = async (ctrlId) => {
    setControllerOverride(ctrlId)
    setSavingController(true)
    if (window.nuarcade && game.id) {
      await window.nuarcade.setControllerOverride(
        game.id,
        ctrlId === "auto" ? null : ctrlId
      )
    }
    setTimeout(() => setSavingController(false), 800)
  }

  const handleNoteChange = (val) => {
    setNote(val)
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => saveNote(game, val), 800)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        style={{ background: colors.bg }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.bgGlow} style={{ background: "radial-gradient(ellipse 60% 60% at 30% 50%, " + colors.accent + "18 0%, transparent 70%)" }} />

        <button className={styles.backBtn} onClick={onClose}>Back</button>

        <div className={styles.content}>
          <div className={styles.artSide}>
            {heroUrl && (
              <div className={styles.heroBackground} style={{ backgroundImage: "url(" + heroUrl + ")" }} />
            )}
            <div className={styles.artWrap} style={{ borderColor: colors.accent + "44", boxShadow: "0 0 40px " + colors.accent + "22" }}>
              {capsuleUrl ? (
                <img
                  src={capsuleUrl}
                  alt={game.title}
                  className={styles.artImg}
                  onError={() => {}}
                />
              ) : imgUrl && !imgError ? (
                <img
                  src={imgUrl}
                  alt={game.title}
                  className={styles.artImg}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className={styles.artFallback}>
                  <div className={styles.fallbackIcon}>{fallbackIcon}</div>
                </div>
              )}
              {logoUrl && (
                <img src={logoUrl} alt="" className={styles.logoOverlay} />
              )}
            </div>

            <button
              className={styles.launchBtn}
              style={{ borderColor: colors.accent, color: colors.accent, boxShadow: "0 0 20px " + colors.accent + "33" }}
              onClick={onLaunch}
              disabled={launching}
            >
              {launching ? "Launching..." : game.isPinball ? "Launch Table" : "Launch Game"}
            </button>
            {lc.count > 0 && (
              <button
                className={styles.playAgainBtn}
                style={{ borderColor: colors.accent + "44", color: colors.accent + "99" }}
                onClick={onLaunch}
                disabled={launching}
              >
                Play Again
              </button>
            )}
          </div>

          <div className={styles.infoSide}>
            <div className={styles.genre} style={{ color: colors.accent }}>
              {game.genre ? game.genre.toUpperCase() : ""}
            </div>

            <div className={styles.title}>{game.title}</div>

            <div className={styles.statusRow}>
              {lc.count > 0 && (
                <span className={styles.statusBadge} style={{ borderColor: "rgba(0,200,255,0.3)", color: "#00c8ff", background: "rgba(0,200,255,0.08)" }}>
                  Launched {lc.count}x
                </span>
              )}
              {pt.total > 0 && (
                <span className={styles.statusBadge} style={{ borderColor: "rgba(0,200,255,0.2)", color: "rgba(0,200,255,0.7)", background: "rgba(0,200,255,0.05)" }}>
                  {formatTime(pt.total)} total
                </span>
              )}
              {pt.best > 0 && pt.best !== pt.total && (
                <span className={styles.statusBadge} style={{ borderColor: "rgba(250,204,21,0.2)", color: "rgba(250,204,21,0.7)", background: "rgba(250,204,21,0.05)" }}>
                  Best: {formatTime(pt.best)}
                </span>
              )}
              {lastDate && (
                <span className={styles.statusBadge} style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}>
                  {formatLastPlayed(lastDate)}
                </span>
              )}
              <span
                className={styles.statusBadge}
                style={{ borderColor: statusColor + "66", color: statusColor, background: statusColor + "11" }}
              >
                {game.status}
              </span>
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <div className={styles.metaLabel}>System</div>
                <div className={styles.metaVal}>{game.system || "-"}</div>
              </div>
              <div className={styles.metaItem}>
                <div className={styles.metaLabel}>Genre</div>
                <div className={styles.metaVal}>{game.genre || "-"}</div>
              </div>
              <div className={styles.metaItem}>
                <div className={styles.metaLabel}>Profile</div>
                <div className={styles.metaVal}>{game.profile || "-"}</div>
              </div>
              <div className={styles.metaItem}>
                <div className={styles.metaLabel}>Status</div>
                <div className={styles.metaVal} style={{ color: statusColor }}>{game.status || "-"}</div>
              </div>
              {game.year && (
                <div className={styles.metaItem}>
                  <div className={styles.metaLabel}>Year</div>
                  <div className={styles.metaVal}>{game.year}</div>
                </div>
              )}
              {game.manufacturer && (
                <div className={styles.metaItem}>
                  <div className={styles.metaLabel}>Manufacturer</div>
                  <div className={styles.metaVal}>{game.manufacturer}</div>
                </div>
              )}
              {game.players && (
                <div className={styles.metaItem}>
                  <div className={styles.metaLabel}>Players</div>
                  <div className={styles.metaVal}>{game.players}P</div>
                </div>
              )}
            </div>

            <div className={styles.exeSection}>
              <div className={styles.exeLabel}>Launch command</div>
              <div className={styles.exeBox}>
                {game.isPinball ? "VPX: " : "TeknoParrotUi.exe --profile="}
                <span style={{ color: colors.accent }}>{game.profile}</span>
              </div>
            </div>

            <div className={styles.exeSection}>
              <div className={styles.exeLabel}>
                Controller override
                {savingController && <span style={{ color: "#00ff88", marginLeft: 8, fontSize: 10 }}>Saved!</span>}
              </div>
              <ControllerBadge game={game} size="large" />
              <div className={styles.controllerGrid}>
                {CONTROLLERS.map(c => (
                  <button
                    key={c.id}
                    className={styles.controllerBtn + (controllerOverride === c.id ? " " + styles.controllerActive : "")}
                    style={controllerOverride === c.id ? { borderColor: colors.accent, color: colors.accent, background: colors.accent + "15" } : {}}
                    onClick={() => handleControllerChange(c.id)}
                    title={c.desc}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.controlsSection}>
              <div className={styles.exeLabel}>Default controls</div>
              <div className={styles.controlsGrid}>
                {getControls(game.genre).map((c, i) => (
                  <div key={i} className={styles.controlItem}>
                    <span className={styles.controlIcon}>{c.icon}</span>
                    <span className={styles.controlLabel}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.exeSection}>
              <div className={styles.exeLabel}>Your rating</div>
              <div className={styles.starRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    className={styles.starBtn}
                    onClick={() => handleRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ color: star <= (hoverRating || rating) ? "#facc15" : "rgba(255,255,255,0.15)" }}
                  >
                    *
                  </button>
                ))}
                {rating > 0 && (
                  <span className={styles.ratingLabel}>{["", "Poor", "Fair", "Good", "Great", "Perfect"][rating]}</span>
                )}
              </div>
            </div>
            <div className={styles.exeSection}>
              <div className={styles.exeLabel}>Collections</div>
              {Object.values(collections).length === 0 ? (
                <div className={styles.collectionsEmpty}>No collections yet -- create one in the Collections panel (N)</div>
              ) : (
                <div className={styles.collectionChips}>
                  {Object.values(collections).map(col => {
                    const inCol = col.games.includes(gameId)
                    return (
                      <button
                        key={col.id}
                        className={styles.collectionChip + (inCol ? " " + styles.collectionChipOn : "")}
                        onClick={() => {
                          if (inCol) removeFromCollection(col.id, gameId)
                          else addToCollection(col.id, game)
                          setCollections(getCollections())
                        }}
                      >
                        {inCol ? "- " : "+ "}{col.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className={styles.exeSection}>
              <div className={styles.exeLabel}>Personal notes <span style={{color:"rgba(255,255,255,0.2)",fontSize:9}}>(auto-saved)</span></div>
              <textarea
                className={styles.noteArea}
                value={note}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder="Add notes about this game..."
                rows={3}
              />
            </div>

            {/* Similar games */}
            {(() => {
              const similar = games
                .filter(g => {
                  const id = g.id || g.profile
                  if (id === gameId) return false
                  return g.genre === game.genre || g.system === game.system
                })
                .sort(() => Math.random() - 0.5)
                .slice(0, 5)
              if (similar.length === 0) return null
              return (
                <div className={styles.exeSection}>
                  <div className={styles.exeLabel}>Similar games</div>
                  <div className={styles.similarList}>
                    {similar.map(g => {
                      const gArt = artwork?.[g.id || g.profile] || null
                      const thumb = gArt?.capsule || gArt?.hero || null
                      return (
                        <button
                          key={g.id || g.profile}
                          className={styles.similarCard}
                          onClick={() => onSelectGame?.(g)}
                          title={g.title}
                        >
                          {thumb ? (
                            <img src={thumb} alt={g.title} className={styles.similarThumb} />
                          ) : (
                            <div className={styles.similarFallback} style={{ background: "rgba(255,255,255,0.05)" }}>
                              <span style={{ fontSize: 18 }}>{g.icon || "--"}</span>
                            </div>
                          )}
                          <div className={styles.similarTitle}>{g.title}</div>
                          <div className={styles.similarSys}>{g.system}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
