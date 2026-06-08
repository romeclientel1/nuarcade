import { useState, useEffect } from "react"
import ControllerTest from "../ControllerTest/ControllerTest"
import { usePlaytime } from "../../hooks/usePlaytime"
import ArtworkManager from "../ArtworkManager/ArtworkManager"
import styles from "./Settings.module.css"
import { useVersionCheck } from "../../hooks/useVersionCheck"
import { THEMES } from "../../hooks/useTheme"

export default function Settings({ games = [], onClose, onCRTChange, crtEnabled, themeId, onThemeChange }) {
  const [config, setConfig] = useState(null)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { newVersion, releaseUrl } = useVersionCheck()
const { getAllPlaytime, formatTime } = usePlaytime()
const [showControllerTest, setShowControllerTest] = useState(false)
const [rescanning, setRescanning] = useState(false)
const [backingUp, setBackingUp] = useState(false)
const [restoring, setRestoring] = useState(false)
const [rescanResult, setRescanResult] = useState(null)
const [showArtworkMgr, setShowArtworkMgr] = useState(false)
const [biosResult, setBiosResult] = useState(null)
const [checkingBios, setCheckingBios] = useState(false)
const [marqueeOpen, setMarqueeOpen] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    if (window.nuarcade) {
      const cfg = await window.nuarcade.getConfig()
      setConfig(cfg)
    } else {
      setConfig({
        teknoParrotPath: "F:/TeknoParrot/",
        gamesFolderPath: "F:/ArcadeGames/",
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
    await scan("TeknoParrot", () => window.nuarcade.scanGames(cfg.teknoParrotPath, cfg.gamesFolderPath))
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
    <div className={styles.overlay}>
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
              { key: "teknoParrotPath",    label: "TeknoParrot" },
              { key: "gamesFolderPath",    label: "Arcade Games" },
              { key: "mamePath",           label: "MAME" },
              { key: "mameGamesPath",      label: "MAME ROMs" },
              { key: "model2Path",         label: "Model 2" },
              { key: "model2GamesPath",    label: "Model 2 Games" },
              { key: "model3Path",         label: "Supermodel (M3)" },
              { key: "model3GamesPath",    label: "Model 3 Games" },
              { key: "retroarchPath",      label: "RetroArch" },
              { key: "retroarchGamesPath", label: "RetroArch Games" },
              { key: "project64Path",      label: "Project64" },
              { key: "n64GamesPath",       label: "N64 Games" },
              { key: "duckstationPath",    label: "DuckStation" },
              { key: "ps1GamesPath",       label: "PS1 Games" },
              { key: "flycastPath",        label: "Flycast" },
              { key: "dreamcastGamesPath", label: "Dreamcast Games" },
              { key: "ppssppPath",         label: "PPSSPP" },
              { key: "pspGamesPath",       label: "PSP Games" },
              { key: "pcsx2Path",          label: "PCSX2" },
              { key: "ps2GamesPath",       label: "PS2 Games" },
              { key: "rpcs3Path",          label: "RPCS3" },
              { key: "ps3GamesPath",       label: "PS3 Games" },
              { key: "xeniaPath",          label: "Xenia" },
              { key: "xbox360GamesPath",   label: "Xbox 360 Games" },
              { key: "dolphinPath",        label: "Dolphin" },
              { key: "gcWiiGamesPath",     label: "GC/Wii Games" },
              { key: "cemuPath",           label: "Cemu" },
              { key: "wiiUGamesPath",      label: "Wii U Games" },
              { key: "ryujinxPath",        label: "Ryujinx" },
              { key: "switchGamesPath",    label: "Switch Games" },
              { key: "pinballPath",        label: "VPX Engine" },
              { key: "tablesPath",         label: "Pinball Tables" },
              { key: "mediaPath",          label: "Media folder" },
            ].map(p => (
              <div key={p.key} className={styles.inputRow}>
                <label className={styles.inputLabel}>{p.label}</label>
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
              <button className={styles.exportBtn} onClick={handleRescan} disabled={rescanning}>
                {rescanning ? "Scanning..." : "Rescan all emulators"}
              </button>
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
            <div className={styles.aboutGrid}>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>Version</span>
                <span className={styles.aboutVal}>v2.9.0 {newVersion ? "(v" + newVersion + " available)" : "(latest)"}</span>
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
