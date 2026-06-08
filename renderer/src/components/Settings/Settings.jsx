import { useState, useEffect } from "react"
import ControllerTest from "../ControllerTest/ControllerTest"
import { usePlaytime } from "../../hooks/usePlaytime"
import ArtworkManager from "../ArtworkManager/ArtworkManager"
import styles from "./Settings.module.css"
import { useVersionCheck } from "../../hooks/useVersionCheck"
import { THEMES } from "../../hooks/useTheme"

export default function Settings({ onClose, onCRTChange, crtEnabled, themeId, onThemeChange }) {
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
    const counts = []
    const scan = async (label, fn) => {
      try { const r = await fn(); const n = r.games?.length || 0; if (n > 0) counts.push(label + ": " + n); return n }
      catch { return 0 }
    }
    let total = 0
    total += await scan("TeknoParrot", () => window.nuarcade.scanGames(cfg.teknoParrotPath, cfg.gamesFolderPath))
    total += await scan("MAME",        () => window.nuarcade.scanMameGames(cfg.mameGamesPath))
    total += await scan("Model 2",     () => window.nuarcade.scanModel2Games(cfg.model2GamesPath))
    total += await scan("Model 3",     () => window.nuarcade.scanModel3Games(cfg.model3GamesPath))
    total += await scan("RetroArch",   () => window.nuarcade.scanRetroArchGames(cfg.retroarchGamesPath))
    total += await scan("Project64",   () => window.nuarcade.scanN64Games(cfg.n64GamesPath))
    total += await scan("DuckStation", () => window.nuarcade.scanPs1Games(cfg.ps1GamesPath))
    total += await scan("Flycast",     () => window.nuarcade.scanDreamcastGames(cfg.dreamcastGamesPath))
    total += await scan("PPSSPP",      () => window.nuarcade.scanPspGames(cfg.pspGamesPath))
    total += await scan("PCSX2",       () => window.nuarcade.scanPs2Games(cfg.ps2GamesPath))
    total += await scan("RPCS3",       () => window.nuarcade.scanPs3Games(cfg.ps3GamesPath))
    total += await scan("Xenia",       () => window.nuarcade.scanXbox360Games(cfg.xbox360GamesPath))
    total += await scan("Dolphin",     () => window.nuarcade.scanGCWiiGames(cfg.gcWiiGamesPath))
    total += await scan("Cemu",        () => window.nuarcade.scanWiiUGames(cfg.wiiUGamesPath))
    total += await scan("Ryujinx",     () => window.nuarcade.scanSwitchGames(cfg.switchGamesPath))
    total += await scan("Pinball",     () => window.nuarcade.scanPinball(cfg.tablesPath))
    const breakdown = counts.length ? "\n" + counts.join(" | ") : ""
    setRescanResult(total + " games found" + breakdown)
  } catch (e) { setRescanResult("Scan error: " + e.message) }
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
      const recent   = JSON.parse(localStorage.getItem("nuarcade_recent")   || "[]")
      const playtime = JSON.parse(localStorage.getItem("nuarcade_playtime") || "{}")
      const ratings  = JSON.parse(localStorage.getItem("nuarcade_ratings")  || "{}")
      const notes    = JSON.parse(localStorage.getItem("nuarcade_notes")    || "{}")
      const lines = [
        "NuArcade Game List",
        "Generated: " + new Date().toLocaleString(),
        "=".repeat(60),
        "",
        ...recent.map((g, i) => {
          const id    = g.id || g.profile
          const mins  = Math.round((playtime[id]?.total || 0) / 60000)
          const stars = "*".repeat(ratings[id] || 0) || "-"
          const note  = notes[id] ? " | Note: " + notes[id].slice(0, 60) : ""
          return (i+1) + ". " + g.title + " (" + (g.system||"") + ") | " + mins + " min | " + stars + note
        })
      ]
      const text = lines.join("\n")
      if (window.nuarcade?.saveTxt) {
        await window.nuarcade.saveTxt({ content: text, defaultName: "nuarcade-games.txt" })
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
                  type="range"
                  min="30"
                  max="600"
                  step="30"
                  value={config.attractTimeout || 120}
                  onChange={e => update("attractTimeout", parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>{config.attractTimeout || 120}s</span>
              </div>
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
              games={[]}
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
                {rescanResult.split("\n").map((line, i) => (
                  <div key={i} style={{ fontSize: i === 0 ? "12px" : "10px", color: i === 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}>{line}</div>
                ))}
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
            <div className={styles.sectionTitle}>About</div>
            <div className={styles.aboutGrid}>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>Version</span>
                <span className={styles.aboutVal}>v2.0.0 {newVersion ? "(v" + newVersion + " available)" : "(latest)"}</span>
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
