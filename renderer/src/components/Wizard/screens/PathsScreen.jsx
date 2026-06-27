import { useState } from 'react'
import styles from './Screen.module.css'

// TeknoParrot is the primary system -- default to F: since that's the NuArcade convention
// All other systems default to empty -- user fills in only what they have
const PATH_FIELDS = [
  { key: 'teknoparrot',  label: 'TeknoParrot',       default: 'F:\\TeknoParrot\\',  hint: 'Folder containing TeknoParrotUI.exe' },
  { key: 'arcadeGames',  label: 'Arcade Games',       default: 'F:\\ArcadeGames\\',  hint: 'Root folder containing your TP game subfolders' },
  { key: 'rpcs3',        label: 'RPCS3 (emulator)',   default: '',                       hint: 'Folder containing rpcs3.exe -- leave blank if not installed' },
  { key: 'ps3Games',     label: 'PS3 Games',          default: '',                       hint: 'Folder containing PS3 game subfolders (BLUS/BLES serials)' },
  { key: 'xenia',        label: 'Xenia (emulator)',   default: '',                       hint: 'Folder containing xenia.exe -- leave blank if not installed' },
  { key: 'xbox360Games', label: 'Xbox 360 Games',     default: '',                       hint: 'Folder containing Xbox 360 game subfolders' },
  { key: 'dolphin',      label: 'Dolphin (emulator)', default: '',                       hint: 'Folder containing Dolphin.exe -- leave blank if not installed' },
  { key: 'gcGames',      label: 'GC / Wii Games',     default: '',                       hint: 'Folder containing GameCube and Wii game files' },
  { key: 'pcsx2',        label: 'PCSX2 (emulator)',   default: '',                       hint: 'Folder containing pcsx2.exe -- leave blank if not installed' },
  { key: 'ps2Games',     label: 'PS2 Games',          default: '',                       hint: 'Folder containing PS2 ISO files' },
  { key: 'ryujinx',      label: 'Ryujinx (emulator)', default: '',                       hint: 'Folder containing Ryujinx.exe -- leave blank if not installed' },
  { key: 'switchGames',  label: 'Switch Games',       default: '',                       hint: 'Folder containing Switch NSP/XCI files' },
  { key: 'pinball',      label: 'Pinball Tables',     default: '',                       hint: 'Visual Pinball X tables folder -- leave blank if not installed' },
]

export default function PathsScreen({ config, updateConfig, next, prev }) {
  const [paths, setPaths] = useState(() => {
    const saved = config.paths || {}
    return PATH_FIELDS.map(f => ({
      ...f,
      value: saved[f.key] !== undefined ? saved[f.key] : f.default,
    }))
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
        Configure paths for systems you have installed. Leave blank
        for any system you don't use -- NuArcade will skip those automatically.
      </div>

      <div className={styles.pathList}>
        {paths.map((p, i) => (
          <div key={p.key} className={styles.pathRow}>
            <div className={styles.pathLabel}>
              <div className={styles.pathLabelName}>{p.label}</div>
              <div className={styles.pathLabelHint}>{p.hint}</div>
            </div>
            <input
              className={styles.pathInput}
              value={p.value}
              placeholder={'leave blank to skip'}
              onChange={e => setPaths(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
            />
            <button className={styles.pathBtn} onClick={() => handleBrowse(i)}>Browse</button>
          </div>
        ))}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={handleContinue}>Continue</button>
      </div>
    </div>
  )
}
