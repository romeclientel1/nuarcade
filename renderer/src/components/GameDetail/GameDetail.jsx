import { useState, useEffect, useRef } from "react"
import { useGameNotes } from "../../hooks/useGameNotes"
import styles from "./GameDetail.module.css"

const GENRE_COLORS = {
  Racing:   { bg: "#001a33", accent: "#0066cc" },
  Fighting: { bg: "#1a001a", accent: "#9900cc" },
  Shooter:  { bg: "#1a0000", accent: "#cc0000" },
  Rhythm:   { bg: "#0a001a", accent: "#6600cc" },
  Flying:   { bg: "#000d1a", accent: "#0099cc" },
  Sports:   { bg: "#001a00", accent: "#009900" },
  Pinball:  { bg: "#1a0a00", accent: "#ff6600" },
  Other:    { bg: "#0a0a0a", accent: "#444444" },
}

const STATUS_COLORS = {
  Perfect:    "#00ff88",
  Great:      "#ffaa00",
  Playable:   "#ffaa00",
  Unverified: "#888888",
}

const THUMBNAIL_BASE = "https://raw.githubusercontent.com/teknogods/TeknoParrotUIThumbnails/master/Icons/"

const GENRE_ICONS = {
  Racing:   "??",
  Fighting: "??",
  Shooter:  "?",
  Rhythm:   "?",
  Flying:   "??",
  Sports:   "?",
  Pinball:  "?",
  Other:    "?",
}

const CONTROLLERS = [
  { id: "auto",     label: "Auto",         icon: "?", desc: "Use genre default" },
  { id: "wheel",    label: "Racing Wheel",  icon: "??", desc: "DirectInput wheel" },
  { id: "lightgun", label: "Light Gun",     icon: "?", desc: "Sinden / GUN4IR" },
  { id: "gamepad",  label: "Xbox Gamepad",  icon: "?", desc: "XInput controller" },
]

function getControls(genre) {
  const maps = {
    Racing:   [
      { icon: "??", label: "Steering wheel" },
      { icon: "?", label: "Gas pedal" },
      { icon: "?", label: "Brake pedal" },
      { icon: "??", label: "Shift up" },
      { icon: "??", label: "Shift down" },
      { icon: "??", label: "View change" },
    ],
    Shooter:  [
      { icon: "?", label: "Light gun aim" },
      { icon: "?", label: "Trigger - fire" },
      { icon: "??", label: "Reload" },
      { icon: "??", label: "Start" },
    ],
    Fighting: [
      { icon: "??", label: "Left stick - move" },
      { icon: "??", label: "A - punch" },
      { icon: "??", label: "B - kick" },
      { icon: "?", label: "X - heavy" },
      { icon: "?", label: "Y - special" },
    ],
    Rhythm:   [
      { icon: "?", label: "Face buttons - notes" },
      { icon: "??", label: "Stick - navigation" },
      { icon: "??", label: "Start" },
    ],
    Flying:   [
      { icon: "??", label: "Left stick - pitch/roll" },
      { icon: "?", label: "RT - fire" },
      { icon: "?", label: "LT - afterburner" },
    ],
    Pinball:  [
      { icon: "??", label: "LB - left flipper" },
      { icon: "??", label: "RB - right flipper" },
      { icon: "??", label: "Up - plunge" },
    ],
  }
  return maps[genre] || [
    { icon: "??", label: "Left stick - move" },
    { icon: "??", label: "A - confirm" },
    { icon: "??", label: "B - back" },
    { icon: "??", label: "Start" },
  ]
}

export default function GameDetail({ game, onClose, onLaunch, launching, playCount, lastPlayed }) {
  const [imgError, setImgError] = useState(false)
  const [controllerOverride, setControllerOverride] = useState("auto")
  const [savingController, setSavingController] = useState(false)

  const { getNote, saveNote } = useGameNotes()
  const [note, setNote] = useState("")
  const noteTimer = useRef(null)
  const colors = GENRE_COLORS[game.genre] || GENRE_COLORS.Other
  const statusColor = STATUS_COLORS[game.status] || "#888888"
  const imgUrl = game.id && !game.isPinball ? THUMBNAIL_BASE + game.id + ".png" : null
  const fallbackIcon = game.icon || GENRE_ICONS[game.genre] || "?"

  useEffect(() => {
    loadControllerOverride()
    setNote(getNote(game))
  }, [game.id])

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
            <div className={styles.artWrap} style={{ borderColor: colors.accent + "44", boxShadow: "0 0 40px " + colors.accent + "22" }}>
              {imgUrl && !imgError ? (
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
            </div>

            <button
              className={styles.launchBtn}
              style={{ borderColor: colors.accent, color: colors.accent, boxShadow: "0 0 20px " + colors.accent + "33" }}
              onClick={onLaunch}
              disabled={launching}
            >
              {launching ? "Launching..." : game.isPinball ? "Launch Table" : "Launch Game"}
            </button>
          </div>

          <div className={styles.infoSide}>
            <div className={styles.genre} style={{ color: colors.accent }}>
              {game.genre ? game.genre.toUpperCase() : ""}
            </div>

            <div className={styles.title}>{game.title}</div>

            <div className={styles.statusRow}>
              {playCount !== undefined && playCount > 0 && (
                <span className={styles.statusBadge} style={{ borderColor: "rgba(0,200,255,0.3)", color: "#00c8ff", background: "rgba(0,200,255,0.08)" }}>
                  Played {playCount}x
                </span>
              )}
              {lastPlayed && (
                <span className={styles.statusBadge} style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}>
                  {lastPlayed}
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
              <div className={styles.exeLabel}>Personal notes <span style={{color:"rgba(255,255,255,0.2)",fontSize:9}}>(auto-saved)</span></div>
              <textarea
                className={styles.noteArea}
                value={note}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder="Add notes about this game..."
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
