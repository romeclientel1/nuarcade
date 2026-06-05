import { useState, useEffect } from 'react'
import styles from './Settings.module.css'

export default function Settings({ onClose }) {
  const [config, setConfig] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    if (window.nuarcade) {
      const cfg = await window.nuarcade.getConfig()
      setConfig(cfg)
    } else {
      setConfig({
        teknoParrotPath: 'F:\\TeknoParrot\\',
        gamesFolderPath: 'F:\\ArcadeGames\\',
        pinballPath:     'F:\\vPinball\\',
        tablesPath:      'F:\\PinballTables\\',
        mediaPath:       'F:\\Media\\',
        displayMode:     'fullscreen',
        attractTimeout:  120,
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

  const update = (key, val) => setConfig(c => ({ ...c, [key]: val }))

  if (!config) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>Settings</div>
            <div className={styles.sub}>NuArcade configuration</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Paths</div>
            {[
              { key: 'teknoParrotPath', label: 'TeknoParrot' },
              { key: 'gamesFolderPath', label: 'Games folder' },
              { key: 'pinballPath',     label: 'VPX engine' },
              { key: 'tablesPath',      label: 'Pinball tables' },
              { key: 'mediaPath',       label: 'Media folder' },
            ].map(p => (
              <div key={p.key} className={styles.inputRow}>
                <label className={styles.inputLabel}>{p.label}</label>
                <input
                  className={styles.input}
                  value={config[p.key] || ''}
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
                {['fullscreen', 'windowed'].map(m => (
                  <button
                    key={m}
                    className={`${styles.toggleBtn} ${config.displayMode === m ? styles.toggleActive : ''}`}
                    onClick={() => update('displayMode', m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
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
                  onChange={e => update('attractTimeout', parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.sliderVal}>
                  {config.attractTimeout || 120}s
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>About</div>
            <div className={styles.aboutGrid}>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>Version</span>
                <span className={styles.aboutVal}>1.0.0</span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutLabel}>Platform</span>
                <span className={styles.aboutVal}>{window.nuarcade?.platform || 'mac (dev)'}</span>
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
            if (window.confirm('Reset all settings to defaults?')) loadConfig()
          }}>
            Reset to defaults
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            {saved ? '✓ Saved!' : 'Save settings'}
          </button>
        </div>

      </div>
    </div>
  )
}