import { useState, useEffect } from "react"
import styles from "./Settings.module.css"
import { useVersionCheck } from "../../hooks/useVersionCheck"
import { THEMES } from "../../hooks/useTheme"

export default function Settings({ onClose, onCRTChange, crtEnabled, themeId, onThemeChange }) {
  const [config, setConfig] = useState(null)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { newVersion, releaseUrl } = useVersionCheck()

  useEffect(() => {
    loadConfig()
  }, [])

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
      })
    }
  }

  const handleSave = async () => {
    if (window.nuarcade) {
      await window.nuarcade.setConfig(config)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const games = JSON.parse(localStorage.getItem("nuarcade_games") || "[]")
      const lines = [
        "NuArcade Game List",
        "Generated: " + new Date().toLocaleDateString(),
        "=".repeat(50),
        "",
        ...games.map((g, i) => i + 1 + ". " + g.title + " (" + g.system + ") - " + g.status)
      ]
      const blob = new Blob([lines.join("\n")], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "nuarcade-games.txt"
      a.click()
    } catch (e) {
      console.error("Export failed:", e)
    }
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
              <label className={styles.inputLabel}>Auto-launch last game</label>
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
            <div className={styles.sectionTitle}>Community</div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>Discord</label>
              
                href="https://discord.gg/nuarcade"
                target="_blank"
                rel="noreferrer"
                className={styles.communityLink}
              >
                Join NuArcade Discord
              </a>
            </div>
            <div className={styles.inputRow}>
              <label className={styles.inputLabel}>GitHub</label>
              
                href="https://github.com/romeclientel1/nuarcade"
                target="_blank"
                rel="noreferrer"
                className={styles.communityLink}
              >
                Star on GitHub
              </a>
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
