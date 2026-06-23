import { useState } from 'react'
import styles from './Screen.module.css'

const PATH_FIELDS = [
  { key: 'teknoparrot',  label: 'TeknoParrot',      default: 'F:\\TeknoParrot\\' },
  { key: 'arcadeGames',  label: 'Arcade Games',     default: 'F:\\ArcadeGames\\' },
  { key: 'rpcs3',        label: 'RPCS3 (PS3)',      default: 'F:\\RPCS3\\' },
  { key: 'ps3Games',     label: 'PS3 Games',        default: 'F:\\PS3Games\\' },
  { key: 'xenia',        label: 'Xenia (Xbox 360)', default: 'F:\\Xenia\\' },
  { key: 'xbox360Games', label: 'Xbox 360 Games',   default: 'F:\\Xbox360Games\\' },
  { key: 'dolphin',      label: 'Dolphin (GC/Wii)', default: 'F:\\Dolphin\\' },
  { key: 'gcGames',      label: 'GC/Wii Games',    default: 'F:\\GCGames\\' },
  { key: 'pcsx2',        label: 'PCSX2 (PS2)',      default: 'F:\\PCSX2\\' },
  { key: 'ps2Games',     label: 'PS2 Games',        default: 'F:\\PS2Games\\' },
  { key: 'ryujinx',      label: 'Ryujinx (Switch)', default: 'F:\\Ryujinx\\' },
  { key: 'switchGames',  label: 'Switch Games',     default: 'F:\\SwitchGames\\' },
]

export default function PathsScreen({ config, updateConfig, next, prev }) {
  const [paths, setPaths] = useState(() => {
    const saved = config.paths || {}
    return PATH_FIELDS.map(f => ({ ...f, value: saved[f.key] || f.default }))
  })

  const handleBrowse = async (idx) => {
    try {
      const result = await window.nuarcade?.browseFolder?.()
      if (result) setPaths(p => p.map((x, i) => i === idx ? { ...x, value: result } : x))
    } catch (e) { console.error('[PathsScreen]', e) }
  }

  const handleContinue = () => {
    const saved = {}
    paths.forEach(p => { saved[p.key] = p.value })
    updateConfig({ paths: saved })
    next()
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 3 -- Paths</div>
      <div className={styles.title}>Where are your files?</div>
      <div className={styles.sub}>
        Point NuArcade to each emulator and its games folder. All paths
        default to your F: drive -- browse or type to update.
      </div>

      <div className={styles.pathList}>
        {paths.map((p, i) => (
          <div key={p.key} className={styles.pathRow}>
            <div className={styles.pathLabel}>{p.label}</div>
            <input
              className={styles.pathInput}
              value={p.value}
              onChange={e => setPaths(prev => prev.map((x, j) => j===i ? {...x, value: e.target.value} : x))}
            />
            <button className={styles.pathBtn} onClick={() => handleBrowse(i)}>Browse</button>
          </div>
        ))}
      </div>

      <div className={styles.infoBar}>
        Only install the emulators you plan to use -- empty folders are fine
        and can be set up later via Settings.
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={handleContinue}>Continue</button>
      </div>
    </div>
  )
}
