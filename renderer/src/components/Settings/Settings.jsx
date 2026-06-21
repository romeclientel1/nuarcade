import { useState, useEffect, useRef } from "react"
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import ControllerTest from "../ControllerTest/ControllerTest"
import { usePlaytime } from "../../hooks/usePlaytime"
import ArtworkManager from "../ArtworkManager/ArtworkManager"
import styles from "./Settings.module.css"
import { useVersionCheck } from "../../hooks/useVersionCheck"
import { THEMES } from "../../hooks/useTheme"

export default function Settings({ games = [], onClose, onCRTChange, crtEnabled, themeId, onThemeChange, onSetupWizard }) {
  const scrollRef = useRef(null)
  useOverlayGamepad({
    onClose,
    onUp:   () => scrollRef.current?.scrollBy({ top: -200, behavior: 'smooth' }),
    onDown: () => scrollRef.current?.scrollBy({ top:  200, behavior: 'smooth' }),
  })

  const [config, setConfig] = useState(null)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { newVersion, releaseUrl } = useVersionCheck()
const { getAllPlaytime, formatTime } = usePlaytime()
const [showControllerTest, setShowControllerTest] = useState(false)
const [rescanning, setRescanning] = useState(false)
const [backingUp, setBackingUp] = useState(false)
const [restoring, setRestoring] = useState(false)
  const [artPref, setArtPref] = useState(() => localStorage.getItem('nuarcade_art_pref') || 'sgdb')
  const updateArtPref = (val) => { setArtPref(val); localStorage.setItem('nuarcade_art_pref', val) }
const [rescanResult, setRescanResult] = useState(null)
const [tpConfiguring, setTpConfiguring] = useState(false)
const [tpResult, setTpResult] = useState(null)
const [showArtworkMgr, setShowArtworkMgr] = useState(false)
const [biosResult, setBiosResult] = useState(null)
const [checkingBios, setCheckingBios] = useState(false)
const [marqueeOpen, setMarqueeOpen] = useState(false)
const [ytdlpStatus, setYtdlpStatus] = useState(null) // null=unchecked, 'present', 'missing', 'installing', 'error'

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    if (window.nuarcade) {
      const cfg = await window.nuarcade.getConfig()
      setConfig(cfg)
      // Check if yt-dlp is already present
      if (window.nuarcade.checkPath && cfg.ytdlpPath) {
        window.nuarcade.checkPath(cfg.ytdlpPath)
          .then(r => setYtdlpStatus(r?.exists ? 'present' : 'missing'))
          .catch(() => setYtdlpStatus('missing'))
      }
    } else {
      setConfig({
        teknoParrotPath: "F:/TeknoParrot/",
        gamesFolderPath: "F:/ArcadeGames/",
        steamPath:       "C:/Program Files (x86)/Steam/steamapps",
        pcGamesPath:     "F:/PCGames/",
        pinballPath:     "F:/vPinball/",
        tablesPath:      "F:/PinballTables/",
        mediaPath:       "F:/Media/",
        displayMode:     "fullscreen",
        attractTimeout:  120,
        ambientVolume:   35,
        crtEffect:       false,
        autoLaunchLast:  false,
      })
    }
  }

  const handleMarquee = async () => {
  if (marqueeOpen) {
    await window.nuarcade?.closeMarquee()
    setMarqueeOpen(false)
  } else {
    await window.nuarcade?.openMarquee()
    setMarqueeOpen(true)
  }
}

const handleRescan = async () => {
  if (!window.nuarcade) return
  setRescanning(true)
  setRescanResult(null)
  try {
    const cfg = config
    const results = []
    const scan = async (label, fn) => {
      try {
        const r = await fn()
        const n = r.games?.length || 0
        results.push({ label, count: n, error: null })
        return n
      } catch (e) {
        results.push({ label, count: 0, error: e.message })
        return 0
      }
    }
    await scan("TeknoParrot", () => window.nuarcade.scanGames({ teknoParrotPath: cfg.teknoParrotPath, gamesFolderPath: cfg.gamesFolderPath }))
    await scan("MAME",        () => window.nuarcade.scanMameGames(cfg.mameGamesPath))
    await scan("Model 2",     () => window.nuarcade.scanModel2Games(cfg.model2GamesPath))
    await scan("Model 3",     () => window.nuarcade.scanModel3Games(cfg.model3GamesPath))
    await scan("RetroArch",   () => window.nuarcade.scanRetroArchGames(cfg.retroarchGamesPath))
    await scan("Project64",   () => window.nuarcade.scanN64Games(cfg.n64GamesPath))
    await scan("DuckStation", () => window.nuarcade.scanPs1Games(cfg.ps1GamesPath))
    await scan("Flycast",     () => window.nuarcade.scanDreamcastGames(cfg.dreamcastGamesPath))
    await scan("PPSSPP",      () => window.nuarcade.scanPspGames(cfg.pspGamesPath))
    await scan("PCSX2",       () => window.nuarcade.scanPs2Games(cfg.ps2GamesPath))
    await scan("RPCS3",       () => window.nuarcade.scanPs3Games(cfg.ps3GamesPath))
    await scan("Xenia",       () => window.nuarcade.scanXbox360Games(cfg.xbox360GamesPath))
    await scan("Dolphin",     () => window.nuarcade.scanGCWiiGames(cfg.gcWiiGamesPath))
    await scan("Cemu",        () => window.nuarcade.scanWiiUGames(cfg.wiiUGamesPath))
    await scan("Ryujinx",     () => window.nuarcade.scanSwitchGames(cfg.switchGamesPath))
    await scan("Pinball",     () => window.nuarcade.scanPinball(cfg.tablesPath))
    await scan("Steam",       () => window.nuarcade.scanSteamGames(cfg.steamPath))
    await scan("PC Games",    () => window.nuarcade.scanPcGames(cfg.pcGamesPath))
    const total = results.reduce((s, r) => s + r.count, 0)
    setRescanResult({ total, results })
  } catch (e) { setRescanResult({ total: 0, results: [], error: e.message }) }
  setRescanning(false)
}

const LS_BACKUP_KEYS = [
  "nuarcade_favorites", "nuarcade_recent", "nuarcade_artwork",
  "nuarcade_ratings", "nuarcade_notes", "nuarcade_first_seen",
  "nuarcade_playtime", "nuarcade_launches", "nuarcade_last_game_count", "nuarcade_collections",
]

const handleBackup = async () => {
  setBackingUp(true)
  try {
    const lsData = {}
    LS_BACKUP_KEYS.forEach(key => {
      const val = localStorage.getItem(key)
      if (val) lsData[key] = val
    })
    const result = await window.nuarcade?.backupLocalStorage(lsData)
    if (result?.success) alert("Full backup saved to " + result.path + "\n\nIncludes: config, favorites, ratings, notes, playtime, artwork, collections.")
  } catch (e) { alert("Backup failed: " + e.message) }
  setBackingUp(false)
}

const handleRestore = async () => {
  setRestoring(true)
  try {
    const result = await window.nuarcade?.restoreConfig()
    if (result?.success) {
      // Restore localStorage keys if present in backup
      if (result.localStorage) {
        Object.entries(result.localStorage).forEach(([key, val]) => {
          if (LS_BACKUP_KEYS.includes(key)) localStorage.setItem(key, val)
        })
      }
      const keys = Object.keys(result.localStorage || {})
      alert(
        "Restored from backup dated " + new Date(result.date).toLocaleDateString() +
        (keys.length ? "\n\nAlso restored: " + keys.map(k => k.replace("nuarcade_","")).join(", ") : "")
      )
      loadConfig()
    } else if (result?.error) {
      alert("Restore failed: " + result.error)
    }
  } catch (e) { alert("Restore failed: " + e.message) }
  setRestoring(false)
}

const handleSave = async () => {
    if (window.nuarcade) await window.nuarcade.setConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const playtime = JSON.parse(localStorage.getItem("nuarcade_playtime") || "{}")
      const launches = JSON.parse(localStorage.getItem("nuarcade_launches")  || "{}")
      const ratings  = JSON.parse(localStorage.getItem("nuarcade_ratings")   || "{}")
      const notes    = JSON.parse(localStorage.getItem("nuarcade_notes")     || "{}")
      const favs     = JSON.parse(localStorage.getItem("nuarcade_favorites") || "[]")

      const sorted = [...games].sort((a, b) => {
        const at = playtime[a.id||a.profile]?.total || 0
        const bt = playtime[b.id||b.profile]?.total || 0
        if (bt !== at) return bt - at
        return a.title.localeCompare(b.title)
      })

      const lines = [
        "NuArcade Game Library",
        "Generated: " + new Date().toLocaleString(),
        "Total games: " + sorted.length,
        "=".repeat(70),
        "",
        ...sorted.map((g, i) => {
          const id    = g.id || g.profile
          const secs  = playtime[id]?.total || 0
          const mins  = Math.round(secs / 60)
          const h     = Math.floor(mins / 60)
          const m     = mins % 60
          const time  = secs > 0 ? (h > 0 ? h + "h " + m + "m" : m + "m") : "-"
          const lc    = launches[id]?.count || 0
          const stars = "*".repeat(ratings[id] || 0) || "-"
          const fav   = favs.includes(id) ? " [FAV]" : ""
          const note  = notes[id] ? "\n   Note: " + notes[id].slice(0, 100) : ""
          return (i+1) + ". " + g.title + fav +
            "\n   System: " + (g.system||g.genre||"-") + " | Emulator: " + (g.emulator||"-") +
            "\n   Playtime: " + time + " | Launched: " + lc + "x | Rating: " + stars +
            note
        })
      ]
      const text = lines.join("\n")
      if (window.nuarcade?.saveTxt) {
        await window.nuarcade.saveTxt({ content: text, defaultName: "nuarcade-library.txt" })
      } else {
        console.log(text)
      }
    } catch (e) { console.error(e) }
    setTimeout(() => setExporting(false), 1000)
  }

  const update = (key, val) => {
    setConfig(c => ({ ...c, [key]: val }))
    if (key === "crtEffect") onCRTChange?.(val)
  }

  if (!config) return null

  return (
    <div className={styles.overlay} ref={scrollRef}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>Settings</div>
            <div className={styles.sub}>NuArcade configuration</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        <div className={styles.body}>

          {newVersion && (
            <div className={styles.updateBanner}>
              <span>NuArcade {newVersion} is available!</span>
              <button className={styles.updateLink} onClick={() => window.open(releaseUrl, '_blank')}>Download</button>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Paths</div>
            <div className={styles.pathsNote}>
              All paths default to F: drive. Browse or type to update, then Save Settings.
            </div>
            {[
              { key: "teknoParrotPath",    label: "TeknoParrot",         sub: "Folder containing TeknoParrotUi.exe" },
              { key: "gamesFolderPath",    label: "Arcade Games",         sub: "Folder containing your TP game subfolders" },
              { key: "mamePath",           label: "MAME",                 sub: "Folder containing mame.exe" },
              { key: "mameGamesPath",      label: "MAME ROMs",            sub: "Folder containing .zip ROM files" },
              { key: "model2Path",         label: "Model 2",              sub: "Folder containing Model2Emulator.exe" },
              { key: "model2GamesPath",    label: "Model 2 Games",        sub: "Folder containing Model 2 game folders" },
              { key: "model3Path",         label: "Supermodel (M3)",      sub: "Folder containing Supermodel.exe" },
              { key: "model3GamesPath",    label: "Model 3 Games",        sub: "Folder containing Model 3 ROM files" },
              { key: "retroarchPath",      label: "RetroArch",            sub: "Folder containing retroarch.exe" },
              { key: "retroarchGamesPath", label: "RetroArch Games",      sub: "Folder containing your ROM files" },
              { key: "project64Path",      label: "Project64",            sub: "Folder containing Project64.exe" },
              { key: "n64GamesPath",       label: "N64 Games",            sub: "Folder containing .n64 / .z64 ROMs" },
              { key: "duckstationPath",    label: "DuckStation",          sub: "Folder containing duckstation-qt-x64-RelWithDebInfo.exe" },
              { key: "ps1GamesPath",       label: "PS1 Games",            sub: "Folder containing .bin/.cue/.iso files" },
              { key: "flycastPath",        label: "Flycast",              sub: "Folder containing flycast.exe" },
              { key: "dreamcastGamesPath", label: "Dreamcast Games",      sub: "Folder containing .gdi/.cdi/.chd files" },
              { key: "ppssppPath",         label: "PPSSPP",               sub: "Folder containing PPSSPPWindows64.exe" },
              { key: "pspGamesPath",       label: "PSP Games",            sub: "Folder containing .iso/.cso files" },
              { key: "pcsx2Path",          label: "PCSX2",                sub: "Folder containing pcsx2-qt.exe" },
              { key: "ps2GamesPath",       label: "PS2 Games",            sub: "Folder containing .iso/.bin files" },
              { key: "rpcs3Path",          label: "RPCS3",                sub: "Folder containing rpcs3.exe" },
              { key: "ps3GamesPath",       label: "PS3 Games",            sub: "Folder containing PS3_GAME subfolders" },
              { key: "xeniaPath",          label: "Xenia",                sub: "Folder containing xenia.exe" },
              { key: "xbox360GamesPath",   label: "Xbox 360 Games",       sub: "Folder containing .iso/.xex files" },
              { key: "dolphinPath",        label: "Dolphin",              sub: "Folder containing Dolphin.exe" },
              { key: "gcWiiGamesPath",     label: "GC/Wii Games",         sub: "Folder containing .iso/.rvz/.gcm files" },
              { key: "cemuPath",           label: "Cemu",                 sub: "Folder containing Cemu.exe" },
              { key: "wiiUGamesPath",      label: "Wii U Games",          sub: "Folder containing .rpx game folders" },
              { key: "ryujinxPath",        label: "Ryujinx",              sub: "Folder containing Ryujinx.exe" },
              { key: "switchGamesPath",    label: "Switch Games",         sub: "Folder containing .nsp/.xci files" },
              { key: "pinballPath",        label: "VPX Engine",           sub: "Folder containing VPinballX64.exe" },
              { key: "tablesPath",         label: "Pinball Tables",       sub: "Folder containing .vpx table files" },
              { key: "steamPath",          label: "Steam",                sub: "steamapps folder (e.g. Steam/steamapps)" },
              { key: "pcGamesPath",        label: "PC Games",             sub: "Folder containing PC game subfolders" },
              { key: "mediaPath",          label: "Media folder",         sub: "Folder for downloaded artwork/videos" },
            ].map(p => (
              <div key={p.key} className={styles.inputRow}>
                <div className={styles.inputLabelStack}>
                  <label className={styles.inputLabel}>{p.label}</label>
                  {p.sub && <span className={styles.inputSub}>{p.sub}</span>}
                </div>
                <input
                  className={styles.input}
                  value={config[p.key] || ""}
                  onChange={e => update(p.key, e.target.value)}
                  spellCheck={false}
                />
                <button className={styles.browseBtn} onClick={async () => {
                  const result = await window.nuarcade?.browseFolder()
                  if (result) update(p.key, result)
                }}>Browse</button>
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Display</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Mode</label>
              <div className={styles.toggleGroup}>
                {["fullscreen", "windowed"].map(m => (
                  <button
                    key={m}
                    className={styles.toggleBtn + (config.displayMode === m ? " " + styles.toggleActive : "")}
                    onClick={() => update("displayMode", m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>CRT effect</label>
              <div className={styles.toggleGroup}>
                {["off", "on"].map(m => (
                  <button
                    key={m}
                    className={styles.toggleBtn + (!!config.crtEffect === (m === "on") ? " " + styles.toggleActive : "")}
                    onClick={() => update("crtEffect", m === "on")}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Auto-launch last</label>
              <div className={styles.toggleGroup}>
                {["off", "on"].map(m => (
                  <button
                    key={m}
                    className={styles.toggleBtn + (!!config.autoLaunchLast === (m === "on") ? " " + styles.toggleActive : "")}
                    onClick={() => update("autoLaunchLast", m === "on")}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Theme color</div>
            <div className={styles.themeGrid}>
              {Object.entries(THEMES).map(([id, t]) => (
                <button
                  key={id}
                  className={styles.themeBtn + (themeId === id ? " " + styles.themeBtnActive : "")}
                  style={{ borderColor: themeId === id ? t.accent : "rgba(255,255,255,0.1)", color: t.accent }}
                  onClick={() => onThemeChange?.(id)}
                >
                  <span className={styles.themeDot} style={{ background: t.accent }} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Audio</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Attract volume</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={config.ambientVolume ?? 35}
                  onChange={e => update("ambientVolume", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.ambientVolume ?? 35}%</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Card art type</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>What shows on wheel cards</label>
              <div className={styles.toggleGroup}>
                {['snap','boxart','sgdb','none'].map(opt => (
                  <button
                    key={opt}
                    className={styles.toggleBtn + (artPref === opt ? ' ' + styles.toggleBtnActive : '')}
                    onClick={() => updateArtPref(opt)}
                  >
                    {opt === 'snap' ? 'SNAP' : opt === 'boxart' ? 'BOX' : opt === 'sgdb' ? 'SGDB' : 'OFF'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Background music</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Music</label>
              <div className={styles.toggleRow}>
                {["on","off"].map(m => (
                  <button
                    key={m}
                    className={styles.toggleBtn + (((config.musicEnabled !== false) === (m === "on")) ? " " + styles.toggleActive : "")}
                    onClick={() => update("musicEnabled", m === "on")}
                  >{m.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Music volume</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={config.musicVolume ?? 60}
                  onChange={e => update("musicVolume", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.musicVolume ?? 60}%</span>
              </div>
            </div>
            <div className={styles.emuNote}>
              Drop .mp3 files into F:/Media/Music/ -- NuArcade shuffles and plays them while you browse. Music fades when gameplay video is active. Click the Now Playing badge to skip tracks.
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Attract mode</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Idle timeout</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range" min="30" max="600" step="30"
                  value={config.attractTimeout || 120}
                  onChange={e => update("attractTimeout", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.attractTimeout || 120}s</span>
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Cycle speed</label>
              <div className={styles.sliderWrap}>
                <input
                  type="range" min="2" max="15" step="1"
                  value={config.attractCycleSpeed || 6}
                  onChange={e => update("attractCycleSpeed", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.attractCycleSpeed || 6}s</span>
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Prefer artwork</label>
              <div className={styles.toggleGroup}>
                {["yes", "no"].map(m => (
                  <button key={m}
                    className={styles.toggleBtn + ((config.attractPreferArt !== false) === (m === "yes") ? " " + styles.toggleActive : "")}
                    onClick={() => update("attractPreferArt", m === "yes")}
                  >{m.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Pixelcade</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Enable</label>
              <div className={styles.toggleGroup}>
                {["off", "on"].map(m => (
                  <button key={m}
                    className={styles.toggleBtn + (!!config.pixelcade?.enabled === (m === "on") ? " " + styles.toggleActive : "")}
                    onClick={() => update("pixelcade", { ...config.pixelcade, enabled: m === "on" })}
                  >{m.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>IP address</label>
              <input
                className={styles.input}
                value={config.pixelcade?.ip || "192.168.1.100"}
                onChange={e => update("pixelcade", { ...config.pixelcade, ip: e.target.value })}
                placeholder="192.168.1.100"
                spellCheck={false}
              />
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Port</label>
              <input
                className={styles.input}
                value={config.pixelcade?.port || 8080}
                onChange={e => update("pixelcade", { ...config.pixelcade, port: parseInt(e.target.value) || 8080 })}
                placeholder="8080"
                spellCheck={false}
              />
            </div>
            <div className={styles.emuNote}>
              Pixelcade receives game art automatically on navigation and launch.
              Find your device IP in the Pixelcade app settings.
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Links</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>GitHub</label>
              <button className={styles.communityLink} onClick={() => window.open('https://github.com/romeclientel1/nuarcade', '_blank')}>
                romeclientel1/nuarcade
              </button>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Website</label>
              <button className={styles.communityLink} onClick={() => window.open('https://romeclientel1.github.io/nuarcade/', '_blank')}>
                romeclientel1.github.io/nuarcade
              </button>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Report a bug</label>
              <button className={styles.communityLink} onClick={() => window.open('https://github.com/romeclientel1/nuarcade/issues', '_blank')}>
                GitHub Issues
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Emulators</div>
            {onSetupWizard && (
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>Add or configure emulators</label>
                <button className={styles.exportBtn} onClick={() => { onClose(); onSetupWizard() }}>
                  Open Setup Wizard
                </button>
              </div>
            )}
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Auto-configure TeknoParrot</label>
              <button
                className={styles.exportBtn}
                disabled={tpConfiguring}
                onClick={async () => {
                  setTpConfiguring(true)
                  setTpResult(null)
                  try {
                    const r = await window.nuarcade.tpAutoConfigure()
                    setTpResult(r)
                  } catch (e) {
                    setTpResult({ success: false, error: e.message })
                  }
                  setTpConfiguring(false)
                }}
              >
                {tpConfiguring ? 'Scanning...' : 'Find & Wire Games'}
              </button>
            </div>
            {tpResult && (
              <div className={styles.rescanResult}>
                {tpResult.error ? (
                  <div style={{ color: '#ef4444', fontSize: 11 }}>{tpResult.error}</div>
                ) : (
                  <div className={styles.rescanTotal}>
                    {tpResult.configured} game{tpResult.configured !== 1 ? 's' : ''} configured
                    {tpResult.notFound > 0 ? ` (${tpResult.notFound} not found -- check F:\\ArcadeGames\\)` : ' -- hit Rescan to load them'}
                  </div>
                )}
              </div>
            )}
            <div className={styles.emuToggles}>
              {[
                { id: 'teknoparrot', label: 'TeknoParrot' },
                { id: 'mame',        label: 'MAME' },
                { id: 'retroarch',   label: 'RetroArch' },
                { id: 'project64',   label: 'Project64 (N64)' },
                { id: 'duckstation', label: 'DuckStation (PS1)' },
                { id: 'flycast',     label: 'Flycast (DC)' },
                { id: 'model2',      label: 'Model 2 (Sega)' },
                { id: 'model3',      label: 'Model 3 (Supermodel)' },
                { id: 'ppsspp',      label: 'PPSSPP (PSP)' },
                { id: 'pcsx2',       label: 'PCSX2 (PS2)' },
                { id: 'rpcs3',       label: 'RPCS3 (PS3)' },
                { id: 'xenia',       label: 'Xenia (Xbox 360)' },
                { id: 'dolphin',     label: 'Dolphin (GC/Wii)' },
                { id: 'cemu',        label: 'Cemu (Wii U)' },
                { id: 'ryujinx',     label: 'Ryujinx (Switch)' },
                { id: 'vpx',         label: 'Visual Pinball X' },
                { id: 'steam',       label: 'Steam' },
                { id: 'pc',          label: 'PC Games' },
              ].map(emu => {
                const enabled = config.enabledEmulators?.[emu.id] !== false
                return (
                  <button
                    key={emu.id}
                    className={styles.emuToggle + (enabled ? " " + styles.emuToggleOn : "")}
                    onClick={() => {
                      const cur = config.enabledEmulators || {}
                      update("enabledEmulators", { ...cur, [emu.id]: !enabled })
                    }}
                  >
                    <span className={styles.emuDot} style={{ background: enabled ? "var(--accent, #00ff88)" : "rgba(255,255,255,0.15)" }} />
                    {emu.label}
                  </button>
                )
              })}
            </div>
            <div className={styles.emuNote}>
              Disabled emulators are hidden from the wheel. Re-enable anytime.
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Artwork</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>ScreenScraper user</label>
              <input
                className={styles.input}
                value={config.screenscraper?.user || ""}
                onChange={e => update("screenscraper", { ...config.screenscraper, user: e.target.value })}
                placeholder="your screenscraper.fr username"
                spellCheck={false}
              />
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>ScreenScraper pass</label>
              <input
                className={styles.input}
                type="password"
                value={config.screenscraper?.pass || ""}
                onChange={e => update("screenscraper", { ...config.screenscraper, pass: e.target.value })}
                placeholder="your screenscraper.fr password"
              />
            </div>
            <div className={styles.emuNote}>
              Free account at screenscraper.fr -- covers MAME, retro, and all classic systems.
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>yt-dlp path</label>
              <input
                className={styles.textInput}
                value={config.ytdlpPath || "F:/Tools/yt-dlp.exe"}
                onChange={e => update("ytdlpPath", e.target.value)}
                placeholder="F:/Tools/yt-dlp.exe"
              />
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>yt-dlp status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: ytdlpStatus === 'present' ? 'rgba(0,255,136,0.4)' : ytdlpStatus === 'installing' ? 'rgba(0,200,255,0.4)' : 'rgba(255,170,0,0.4)',
                  color: ytdlpStatus === 'present' ? '#00ff88' : ytdlpStatus === 'installing' ? '#00c8ff' : '#ffaa00',
                  background: ytdlpStatus === 'present' ? 'rgba(0,255,136,0.08)' : ytdlpStatus === 'installing' ? 'rgba(0,200,255,0.08)' : 'rgba(255,170,0,0.08)',
                }}>
                  {ytdlpStatus === 'present' ? 'Installed' : ytdlpStatus === 'installing' ? 'Downloading...' : ytdlpStatus === 'error' ? 'Error' : ytdlpStatus === 'missing' ? 'Not installed' : 'Checking...'}
                </span>
                <button
                  className={styles.exportBtn}
                  disabled={ytdlpStatus === 'installing'}
                  onClick={async () => {
                    setYtdlpStatus('installing')
                    try {
                      const r = await window.nuarcade.ensureYtdlp()
                      setYtdlpStatus(r.success ? 'present' : 'error')
                    } catch { setYtdlpStatus('error') }
                  }}
                >
                  {ytdlpStatus === 'present' ? 'Re-download' : 'Install now'}
                </button>
              </div>
            </div>
            <div className={styles.emuNote}>
              YouTube video fallback -- auto-installs on first use. Videos are trimmed to 40s and saved to F:/Media/Videos/.
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Anthropic API key</label>
              <input
                className={styles.textInput}
                type="password"
                value={config.anthropicApiKey || ""}
                onChange={e => update("anthropicApiKey", e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>
            <div className={styles.emuNote}>
              Optional -- enables AI-powered YouTube search query refinement. The AI Game Coach (press C) works without a key. Get one at console.anthropic.com.
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Bulk fetch</label>
              <button className={styles.exportBtn} onClick={() => setShowArtworkMgr(true)}>
                Open Artwork Manager
              </button>
            </div>
          </div>

          {showArtworkMgr && (
            <ArtworkManager
              games={games}
              apiKey={config?.sgdbApiKey}
              ssUser={config?.screenscraper?.user}
              ssPass={config?.screenscraper?.pass}
              onClose={() => setShowArtworkMgr(false)}
              onArtworkUpdate={() => {}}
            />
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Library</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Rescan games</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.exportBtn} onClick={handleRescan} disabled={rescanning}>
                  {rescanning ? "Scanning..." : "Rescan all emulators"}
                </button>
                <button className={styles.exportBtn} style={{ borderColor: 'rgba(255,170,0,0.4)', color: '#ffaa00' }} onClick={() => {
                  localStorage.removeItem('nuarcade_game_cache')
                  localStorage.removeItem('nuarcade_game_cache_ts')
                  alert('Cache cleared -- close Settings and reopen NuArcade to fresh scan')
                }}>
                  Clear cache
                </button>
              </div>
            </div>
            {rescanResult && (
              <div className={styles.rescanResult}>
                {rescanResult.error ? (
                  <div style={{ color: "#ef4444", fontSize: 11 }}>Scan error: {rescanResult.error}</div>
                ) : (
                  <>
                    <div className={styles.rescanTotal}>{rescanResult.total} games found</div>
                    <div className={styles.rescanGrid}>
                      {rescanResult.results?.map(r => (
                        <div key={r.label} className={styles.rescanRow}>
                          <span className={styles.rescanLabel}>{r.label}</span>
                          <span className={styles.rescanCount + (r.count > 0 ? " " + styles.rescanCountHit : "")}>
                            {r.error ? "ERR" : r.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Backup</label>
              <button className={styles.exportBtn} onClick={handleBackup} disabled={backingUp}>
                {backingUp ? "Saving..." : "Save full backup"}
              </button>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Restore</label>
              <button className={styles.exportBtn} onClick={handleRestore} disabled={restoring}>
                {restoring ? "Restoring..." : "Restore from backup"}
              </button>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Export game list</label>
              <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
                {exporting ? "Exporting..." : "Export to .txt"}
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>BIOS Status</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Check BIOS files</label>
              <button className={styles.exportBtn} onClick={async () => {
                setCheckingBios(true)
                setBiosResult(null)
                try { setBiosResult(await window.nuarcade.checkBios()) }
                catch (e) { setBiosResult({ error: e.message }) }
                setCheckingBios(false)
              }} disabled={checkingBios}>
                {checkingBios ? "Checking..." : "Check BIOS"}
              </button>
            </div>
            {biosResult && !biosResult.error && (
              <div className={styles.biosGrid}>
                {[
                  { key: "pcsx2",      label: "PCSX2 (PS2)",      note: ".bin files in bios/" },
                  { key: "duckstation",label: "DuckStation (PS1)", note: "scph*.bin in bios/" },
                  { key: "flycast",    label: "Flycast (DC)",      note: "dc_boot.bin in data/" },
                  { key: "ryujinx",   label: "Ryujinx (Switch)",  note: "prod.keys in system/" },
                ].map(({ key, label, note }) => {
                  const b = biosResult[key]
                  if (!b) return null
                  return (
                    <div key={key} className={styles.biosRow}>
                      <div className={styles.biosLeft}>
                        <span className={b.found ? styles.biosOk : styles.biosMissing}>
                          {b.found ? "OK" : "MISSING"}
                        </span>
                        <span className={styles.biosLabel}>{label}</span>
                      </div>
                      <div className={styles.biosRight}>
                        {b.found
                          ? <span className={styles.biosFiles}>{b.files.join(", ")}</span>
                          : <span className={styles.biosNote}>{note}</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {biosResult?.error && (
              <div style={{ fontSize: 10, color: "#ef4444", marginTop: 6 }}>Error: {biosResult.error}</div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>About</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Setup Wizard</label>
              <button className={styles.exportBtn} onClick={async () => {
                await window.nuarcade?.resetSetup?.()
                onClose()
                window.location.reload()
              }}>
                Re-run Setup Wizard
              </button>
            </div>
            <div className={styles.aboutGrid}>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>Version</span>
                <span className={styles.aboutVal}>{window.nuarcade?.version || 'v4.0.7'} {newVersion ? '(v' + newVersion + ' available)' : '(latest)'}</span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>Platform</span>
                <span className={styles.aboutVal}>{window.nuarcade?.platform || "mac (dev)"}</span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>Built by</span>
                <span className={styles.aboutVal}>Rome Clientel</span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>GitHub</span>
                <span className={styles.aboutVal}>romeclientel1/nuarcade</span>
              </div>
            </div>
          </div>

        </div>

        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={() => {
            if (window.confirm("Reset all settings to defaults?")) loadConfig()
          }}>
            Reset to defaults
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            {saved ? "Saved!" : "Save settings"}
          </button>
        </div>

      </div>
    </div>
  )
}
