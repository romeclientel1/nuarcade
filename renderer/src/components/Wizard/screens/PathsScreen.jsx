import { useState } from 'react'
import styles from './Screen.module.css'

const PATHS = [
  { key: 'teknoParrotPath', label: 'TeknoParrot', placeholder: 'F:\\TeknoParrot\\' },
  { key: 'gamesFolderPath', label: 'Games folder', placeholder: 'F:\\ArcadeGames\\' },
  { key: 'rpcs3Path', label: 'RPCS3', placeholder: 'F:\\RPCS3\\' },
  { key: 'ps3GamesPath', label: 'PS3 Games folder', placeholder: 'F:\\PS3Games\\' },
  { key: 'pinballPath', label: 'VPX engine', placeholder: 'F:\\vPinball\\' },
  { key: 'tablesPath', label: 'Pinball tables', placeholder: 'F:\\PinballTables\\' },
]

export default function PathsScreen({ config, updateConfig, next, prev }) {
  const [values, setValues] = useState({
    teknoParrotPath: config.teknoParrotPath || 'F:\\TeknoParrot\\',
    gamesFolderPath: config.gamesFolderPath || 'F:\\ArcadeGames\\',
    rpcs3Path: config.rpcs3Path || 'F:\\RPCS3\\',
    ps3GamesPath: config.ps3GamesPath || 'F:\\PS3Games\\',
    pinballPath: config.pinballPath || 'F:\\vPinball\\',
    tablesPath: config.tablesPath || 'F:\\PinballTables\\',
  })

  const handleChange = (key, val) => {
    setValues(v => ({ ...v, [key]: val }))
  }

  const handleBrowse = async (key) => {
    if (window.nuarcade?.browseFolder) {
      const result = await window.nuarcade.browseFolder()
      if (result) handleChange(key, result)
    }
  }

  const handleContinue = () => {
    updateConfig(values)
    next()
  }

  const mode = config.mode || 'arcade+pinball'
  const showPinball = mode !== 'arcade'
  const showRpcs3 = mode !== 'pinball'

  const visiblePaths = PATHS.filter(p => {
    if ((p.key === 'pinballPath' || p.key === 'tablesPath') && !showPinball) return false
    if ((p.key === 'rpcs3Path' || p.key === 'ps3GamesPath') && !showRpcs3) return false
    return true
  })

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 3 — Paths</div>
      <div className={styles.title}>Where are your files?</div>
      <div className={styles.sub}>
        Point NuArcade to your emulator folders and game libraries.
        It will find and configure every game automatically.
      </div>

      {visiblePaths.map(p => (
        <div key={p.key} className={styles.pathRow}>
          <div className={styles.pathLabel}>{p.label}</div>
          <input
            className={styles.pathInput}
            value={values[p.key] || ''}
            onChange={e => handleChange(p.key, e.target.value)}
            placeholder={p.placeholder}
            spellCheck={false}
          />
          <button className={styles.pathBtn} onClick={() => handleBrowse(p.key)}>
            📁 Browse
          </button>
        </div>
      ))}

      <div className={styles.infoNote}>
        💡 All paths default to your F: drive. Use Browse or type manually to update.
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>← Back</button>
        <button className={styles.btnNext} onClick={handleContinue}>Continue →</button>
      </div>
    </div>
  )
}
