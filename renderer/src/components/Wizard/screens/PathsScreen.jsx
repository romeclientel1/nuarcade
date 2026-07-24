import { useState } from 'react'
import styles from './Screen.module.css'

const PATH_FIELDS = [
  // -- TeknoParrot (defaults to F: convention) --
  { key: 'teknoparrot',  label: 'TeknoParrot',          default: 'F:\\TeknoParrot\\',  hint: 'Folder containing TeknoParrotUI.exe' },
  { key: 'arcadeGames',  label: 'Arcade Games',          default: 'F:\\ArcadeGames\\',  hint: 'Root folder containing your TP game subfolders' },
  // -- Xbox 360 --
  { key: 'xenia',        label: 'Xenia (emulator)',     default: '',  hint: 'Folder containing xenia.exe -- leave blank to skip' },
  { key: 'xbox360Games', label: 'Xbox 360 Games',        default: '',  hint: 'Folder containing Xbox 360 game subfolders -- leave blank to skip' },
  // -- PS3 --
  { key: 'rpcs3',        label: 'RPCS3 (emulator)',      default: '',  hint: 'Folder containing rpcs3.exe -- leave blank to skip' },
  { key: 'ps3Games',     label: 'PS3 Games',             default: '',  hint: 'Folder containing PS3 game subfolders (BLUS/BLES serials)' },
  // -- GameCube / Wii --
  { key: 'dolphin',      label: 'Dolphin (emulator)',    default: '',  hint: 'Folder containing Dolphin.exe -- leave blank to skip' },
  { key: 'gcGames',      label: 'GC / Wii Games',        default: '',  hint: 'Folder containing GameCube and Wii game files' },
  // -- PS2 --
  { key: 'pcsx2',        label: 'PCSX2 (emulator)',      default: '',  hint: 'Folder containing pcsx2.exe -- leave blank to skip' },
  { key: 'ps2Games',     label: 'PS2 Games',             default: '',  hint: 'Folder containing PS2 ISO files' },
  // -- Switch --
  { key: 'ryujinx',      label: 'Ryujinx (emulator)',    default: '',  hint: 'Folder containing Ryujinx.exe -- leave blank to skip' },
  { key: 'switchGames',  label: 'Switch Games',          default: '',  hint: 'Folder containing Switch NSP/XCI files' },
  // -- Dreamcast --
  { key: 'redream',      label: 'Redream (emulator)',    default: '',  hint: 'Folder containing redream.exe -- leave blank to skip' },
  { key: 'dreamcastGames', label: 'Dreamcast Games',    default: '',  hint: 'Folder containing Dreamcast game files (GDI/CHD/CDI)' },
  // -- PSP --
  { key: 'ppsspp',       label: 'PPSSPP (emulator)',     default: '',  hint: 'Folder containing PPSSPPWindows64.exe -- leave blank to skip' },
  { key: 'pspGames',     label: 'PSP Games',             default: '',  hint: 'Folder containing PSP ISO/CSO files' },
  // -- Wii U --
  { key: 'cemu',         label: 'Cemu (emulator)',       default: '',  hint: 'Folder containing Cemu.exe -- leave blank to skip' },
  { key: 'wiiuGames',    label: 'Wii U Games',           default: '',  hint: 'Folder containing Wii U game folders (rpx/wud/wux)' },
  // -- MAME --
  { key: 'mame',         label: 'MAME',                  default: '',  hint: 'Folder containing mame.exe and roms/ subfolder -- leave blank to skip' },
  // -- Sega Model 2 --
  { key: 'model2',       label: 'Model 2 Emulator',      default: '',  hint: 'Folder containing m2emulator.exe -- leave blank to skip' },
  // -- Sega Model 3 --
  { key: 'model3',       label: 'Supermodel (Model 3)',  default: '',  hint: 'Folder containing Supermodel.exe -- leave blank to skip' },
  // -- Pinball --
  { key: 'pinball',      label: 'Pinball Tables',        default: '',  hint: 'Visual Pinball X tables folder -- leave blank to skip' },
  // -- Steam --
  { key: 'steam',        label: 'Steam (steamapps)',     default: '',  hint: 'Path to your steamapps folder e.g. C:\\Steam\\steamapps -- leave blank to skip' },
  // -- RetroArch (launch only -- no scan) --
  { key: 'retroarch',    label: 'RetroArch (launch only)', default: '', hint: 'Path to retroarch.exe -- Vespara will launch RetroArch directly' },
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
        for any system you don't use -- Vespara will skip those automatically.
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
