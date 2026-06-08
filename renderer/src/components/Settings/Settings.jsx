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
    let total = 0
    const tp = await window.nuarcade.scanGames(cfg.teknoParrotPath, cfg.gamesFolderPath)
    total += tp.games?.length || 0
    if (cfg.ps3GamesPath)       { const r = await window.nuarcade.scanPs3Games(cfg.ps3GamesPath); total += r.games?.length || 0 }
    if (cfg.xbox360GamesPath)   { const r = await window.nuarcade.scanXbox360Games(cfg.xbox360GamesPath); total += r.games?.length || 0 }
    if (cfg.gcWiiGamesPath)     { const r = await window.nuarcade.scanGCWiiGames(cfg.gcWiiGamesPath); total += r.games?.length || 0 }
    if (cfg.ps2GamesPath)       { const r = await window.nuarcade.scanPs2Games(cfg.ps2GamesPath); total += r.games?.length || 0 }
    if (cfg.switchGamesPath)    { const r = await window.nuarcade.scanSwitchGames(cfg.switchGamesPath); total += r.games?.length || 0 }
    if (cfg.mameGamesPath)      { const r = await window.nuarcade.scanMameGames(cfg.mameGamesPath); total += r.games?.length || 0 }
    if (cfg.retroarchGamesPath) { const r = await window.nuarcade.scanRetroArchGames(cfg.retroarchGamesPath); total += r.games?.length || 0 }
    if (cfg.n64GamesPath)       { const r = await window.nuarcade.scanN64Games(cfg.n64GamesPath); total += r.games?.length || 0 }
    if (cfg.ps1GamesPath)       { const r = await window.nuarcade.scanPs1Games(cfg.ps1GamesPath); total += r.games?.length || 0 }
    if (cfg.dreamcastGamesPath) { const r = await window.nuarcade.scanDreamcastGames(cfg.dreamcastGamesPath); total += r.games?.length || 0 }
    if (cfg.pspGamesPath)       { const r = await window.nuarcade.scanPspGames(cfg.pspGamesPath); total += r.games?.length || 0 }
    if (cfg.wiiUGamesPath)      { const r = await window.nuarcade.scanWiiUGames(cfg.wiiUGamesPath); total += r.games?.length || 0 }
    if (cfg.tablesPath)         { const r = await window.nuarcade.scanPinball(cfg.tablesPath); total += r.games?.length || 0 }
    setRescanResult(total + " games found")
  } catch (e) { setRescanResult("Scan error: " + e.message) }
  setRescanning(false)
}

const handleBackup = async () => {
  setBackingUp(true)
  const result = await window.nuarcade?.backupConfig()
  setBackingUp(false)
  if (result?.success) alert("Backup saved to " + result.path)
}

const handleRestore = async () => {
  setRestoring(true)
  const result = await window.nuarcade?.restoreConfig()
  setRestoring(false)
  if (result?.success) {
    alert("Config restored from backup dated " + new Date(result.date).toLocaleDateString())
    loadConfig()
  }
}

const handleSave = async () => {
    if (window.nuarcade) await window.nuarcade.setConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const recent = JSON.parse(localStorage.getItem("nuarcade_recent") || "[]")
      const counts = JSON.parse(localStorage.getItem("nuarcade_play_counts") || "{}")
      const lines = [
        "NuArcade Game List",
        "Generated: " + new Date().toLocaleDateString(),
        "=".repeat(50),
        "",
        ...recent.map((g, i) => (i+1) + ". " + g.title + " (" + (g.system||"") + ") - played " + (counts[g.id||g.profile]||0) + "x")
      ]
      const blob = new Blob([lines.join("\n")], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "nuarcade-games.txt"
      a.click()
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
              <a href={releaseUrl} target="_blank" rel="noreferrer" className={styles.updateLink}>Download</a>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Paths</div>
            {[
              { key: "teknoParrotPath", label: "TeknoParrot" },
              { key: "gamesFolderPath", label: "Games folder" },
              { key: "pinballPath",     label: "VPX engine" },
              { key: "tablesPath",      label: "Pinball tables" },
              { key: "mediaPath",       label: "Media folder" },
            ].map(p => (
              <div key={p.key} className={styles.inputRow}>
                <label className={styles.inputLabel}>{p.label}</label>
                <input
                  className={styles.input}
                  value={config[p.key] || ""}
                  onChange={e => update(p.key, e.target.value)}
                  spellCheck={false}
                />
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
            <div className={styles.sectionTitle}>Community</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Discord</label>
              <a href="https://discord.gg/nuarcade" target="_blank" rel="noreferrer" className={styles.communityLink}>
                Join NuArcade Discord
              </a>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>GitHub</label>
              <a href="https://github.com/romeclientel1/nuarcade" target="_blank" rel="noreferrer" className={styles.communityLink}>
                Star on GitHub
              </a>
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
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Library</div>
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
                <span className={styles.aboutVal}>1.0.0 {newVersion ? "(update available)" : "(latest)"}</span>
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
