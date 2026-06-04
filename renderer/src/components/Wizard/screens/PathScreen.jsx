import { useState } from 'react'
import styles from './Screen.module.css'

const PATHS = [
  { key: 'teknoParrotPath', label: 'TeknoParrot',    placeholder: 'C:\\TeknoParrot\\' },
  { key: 'gamesFolderPath', label: 'Games folder',   placeholder: 'D:\\ArcadeGames\\' },
  { key: 'pinballPath',     label: 'VPX engine',     placeholder: 'C:\\vPinball\\' },
  { key: 'tablesPath',      label: 'Pinball tables', placeholder: 'D:\\PinballTables\\' },
]

export default function PathsScreen({ config, updateConfig, next, prev }) {
  const [values, setValues] = useState({
    teknoParrotPath: config.teknoParrotPath,
    gamesFolderPath: config.gamesFolderPath,
    pinballPath:     config.pinballPath,
    tablesPath:      config.tablesPath,
  })

  const handleChange = (key, val) => {
    setValues(v => ({ ...v, [key]: val }))
  }

  const handleContinue = () => {
    updateConfig(values)
    next()
  }

  const showPinball = config.mode !== 'arcade'

  const visiblePaths = showPinball
    ? PATHS
    : PATHS.filter(p => p.key !== 'pinballPath' && p.key !== 'tablesPath')

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 2 — Paths</div>
      <div className={styles.title}>Where are your files?</div>
      <div className={styles.sub}>
        Point NuArcade to your TeknoParrot installation and games folder.
        It will find and configure every game automatically — no manual
        entry needed per game.
      </div>

      {visiblePaths.map(p => (
        <div key={p.key} className={styles.pathRow}>
          <div className={styles.pathLabel}>{p.label}</div>
          <input
            className={styles.pathInput}
            value={values[p.key]}
            onChange={e => handleChange(p.key, e.target.value)}
            placeholder={p.placeholder}
            spellCheck={false}
          />
          <button className={styles.pathBtn}>📁 Browse</button>
        </div>
      ))}

      <div className={styles.infoNote}>
        💡 NuArcade auto-detected TeknoParrot at the default path.
        Confirm or update any folder above before continuing.
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btnNext} onClick={handleContinue}>Continue →</button>
      </div>
    </div>
  )
}