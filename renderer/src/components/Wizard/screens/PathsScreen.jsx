import { useState, useEffect, useCallback } from 'react'
import styles from './Screen.module.css'

const ALL_PATHS = [
  { key: 'teknoParrotPath',    label: 'TeknoParrot',         placeholder: 'C:\\TeknoParrot\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'gamesFolderPath',    label: 'Arcade Games',        placeholder: 'C:\\ArcadeGames\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'rpcs3Path',          label: 'RPCS3 (PS3)',         placeholder: 'C:\\RPCS3\\',             emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ps3GamesPath',       label: 'PS3 Games',           placeholder: 'C:\\PS3Games\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'xeniaPath',          label: 'Xenia (Xbox 360)',    placeholder: 'C:\\Xenia\\',             emulators: ['arcade', 'arcade+pinball'] },
  { key: 'xbox360GamesPath',   label: 'Xbox 360 Games',      placeholder: 'C:\\Xbox360Games\\',      emulators: ['arcade', 'arcade+pinball'] },
  { key: 'dolphinPath',        label: 'Dolphin (GC/Wii)',    placeholder: 'C:\\Dolphin\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'gcWiiGamesPath',     label: 'GameCube/Wii Games',  placeholder: 'C:\\GCWiiGames\\',        emulators: ['arcade', 'arcade+pinball'] },
  { key: 'pcsx2Path',          label: 'PCSX2 (PS2)',         placeholder: 'C:\\PCSX2\\',             emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ps2GamesPath',       label: 'PS2 Games',           placeholder: 'C:\\PS2Games\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ryujinxPath',        label: 'Ryujinx (Switch)',    placeholder: 'C:\\Ryujinx\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'switchGamesPath',    label: 'Switch Games',        placeholder: 'C:\\SwitchGames\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'mamePath',           label: 'MAME',                placeholder: 'C:\\MAME\\',              emulators: ['arcade', 'arcade+pinball'] },
  { key: 'mameGamesPath',      label: 'MAME ROMs',           placeholder: 'C:\\MAME\\roms\\',        emulators: ['arcade', 'arcade+pinball'] },
  { key: 'retroarchPath',      label: 'RetroArch',           placeholder: 'C:\\RetroArch\\',         emulators: ['arcade', 'arcade+pinball'] },
  { key: 'retroarchGamesPath', label: 'RetroArch Games',     placeholder: 'C:\\RetroArch\\roms\\',    emulators: ['arcade', 'arcade+pinball'] },
  { key: 'project64Path',      label: 'Project64 (N64)',     placeholder: 'C:\\Project64\\',         emulators: ['arcade', 'arcade+pinball'] },
  { key: 'n64GamesPath',       label: 'N64 Games',           placeholder: 'C:\\N64Games\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'duckstationPath',    label: 'DuckStation (PS1)',   placeholder: 'C:\\DuckStation\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ps1GamesPath',       label: 'PS1 Games',           placeholder: 'C:\\PS1Games\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'flycastPath',        label: 'Flycast (Dreamcast)', placeholder: 'C:\\Flycast\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'dreamcastGamesPath', label: 'Dreamcast Games',     placeholder: 'C:\\DreamcastGames\\',    emulators: ['arcade', 'arcade+pinball'] },
  { key: 'model2Path',        label: 'Model 2 Emulator',    placeholder: 'C:\\Model2\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'model2GamesPath',    label: 'Model 2 Games',        placeholder: 'C:\\Model2Games\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'model3Path',        label: 'Supermodel (Model 3)', placeholder: 'C:\\Supermodel\\',        emulators: ['arcade', 'arcade+pinball'] },
  { key: 'model3GamesPath',    label: 'Model 3 Games',        placeholder: 'C:\\Model3Games\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ppssppPath',         label: 'PPSSPP (PSP)',         placeholder: 'C:\\PPSSPP\\',             emulators: ['arcade', 'arcade+pinball'] },
  { key: 'pspGamesPath',       label: 'PSP Games',            placeholder: 'C:\\PSPGames\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'cemuPath',           label: 'Cemu (Wii U)',         placeholder: 'C:\\Cemu\\',               emulators: ['arcade', 'arcade+pinball'] },
  { key: 'wiiUGamesPath',      label: 'Wii U Games',          placeholder: 'C:\\WiiUGames\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'pinballPath',        label: 'VPX Engine',          placeholder: 'C:\\vPinball\\',          emulators: ['pinball', 'arcade+pinball'] },
  { key: 'tablesPath',         label: 'Pinball Tables',      placeholder: 'C:\\PinballTables\\',     emulators: ['pinball', 'arcade+pinball'] },
  { key: 'steamPath',          label: 'Steam (steamapps)',   placeholder: 'C:\\Program Files (x86)\\Steam\\steamapps', emulators: ['arcade', 'arcade+pinball'] },
  { key: 'pcGamesPath',        label: 'PC Games',            placeholder: 'C:\\PCGames\\',            emulators: ['arcade', 'arcade+pinball'] },
]

export default function PathsScreen({ config, updateConfig, next, prev }) {
  const mode = config.mode || 'arcade+pinball'

  const defaults = {
    teknoParrotPath:    'C:\\TeknoParrot\\',
    gamesFolderPath:    'C:\\ArcadeGames\\',
    rpcs3Path:          'C:\\RPCS3\\',
    ps3GamesPath:       'C:\\PS3Games\\',
    xeniaPath:          'C:\\Xenia\\',
    xbox360GamesPath:   'C:\\Xbox360Games\\',
    dolphinPath:        'C:\\Dolphin\\',
    gcWiiGamesPath:     'C:\\GCWiiGames\\',
    pcsx2Path:          'C:\\PCSX2\\',
    ps2GamesPath:       'C:\\PS2Games\\',
    ryujinxPath:        'C:\\Ryujinx\\',
    switchGamesPath:    'C:\\SwitchGames\\',
    mamePath:           'C:\\MAME\\',
    mameGamesPath:      'C:\\MAME\\roms\\',
    retroarchPath:      'C:\\RetroArch\\',
    retroarchGamesPath: 'C:\\RetroArch\\roms\\',
    project64Path:      'C:\\Project64\\',
    n64GamesPath:       'C:\\N64Games\\',
    duckstationPath:    'C:\\DuckStation\\',
    ps1GamesPath:       'C:\\PS1Games\\',
    flycastPath:        'C:\\Flycast\\',
    dreamcastGamesPath: 'C:\\DreamcastGames\\',
    model2Path:        'C:\\Model2\\',
    model2GamesPath:   'C:\\Model2Games\\',
    model3Path:        'C:\\Supermodel\\',
    model3GamesPath:   'C:\\Model3Games\\',
    ppssppPath:        'C:\\PPSSPP\\',
    pspGamesPath:      'C:\\PSPGames\\',
    cemuPath:          'C:\\Cemu\\',
    wiiUGamesPath:     'C:\\WiiUGames\\',
    pinballPath:        'C:\\vPinball\\',
    tablesPath:         'C:\\PinballTables\\',
    steamPath:          'C:\\Program Files (x86)\\Steam\\steamapps',
    pcGamesPath:        'C:\\PCGames\\',
  }

  const [values, setValues] = useState(() => {
    const v = {}
    Object.keys(defaults).forEach(k => { v[k] = config[k] || defaults[k] })
    return v
  })

  const handleChange = (key, val) => setValues(v => ({ ...v, [key]: val }))

  const handleBrowse = async (key) => {
    if (window.nuarcade?.browseFolder) {
      const result = await window.nuarcade.browseFolder()
      if (result) handleChange(key, result)
    }
  }

  const [pathStatus, setPathStatus] = useState({})

  const checkPath = useCallback(async (key, val) => {
    if (!window.nuarcade?.checkPath || !val) return
    const { exists } = await window.nuarcade.checkPath(val)
    setPathStatus(s => ({ ...s, [key]: exists }))
  }, [])

  // Check all visible paths on mount and when values change
  useEffect(() => {
    visiblePaths.forEach(p => checkPath(p.key, values[p.key]))
  }, [])

  const handleChangeWithCheck = (key, val) => {
    handleChange(key, val)
    clearTimeout(window._pathCheckTimer)
    window._pathCheckTimer = setTimeout(() => checkPath(key, val), 600)
  }

  const handleBrowseWithCheck = async (key) => {
    if (window.nuarcade?.browseFolder) {
      const result = await window.nuarcade.browseFolder()
      if (result) { handleChange(key, result); checkPath(key, result) }
    }
  }

  const visiblePaths = ALL_PATHS.filter(p => p.emulators.includes(mode))

  const handleContinue = () => {
    updateConfig(values)
    next()
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 3 -- Paths</div>
      <div className={styles.title}>Where are your files?</div>
      <div className={styles.sub}>
        Point NuArcade to each emulator and its games folder.
        All paths default to your F: drive -- browse or type to update.
      </div>

      <div className={styles.pathsScroll}>
        {visiblePaths.map(p => (
          <div key={p.key} className={styles.pathRow}>
            <div className={styles.pathLabel}>{p.label}</div>
            <input
              className={styles.pathInput}
              value={values[p.key] || ''}
              onChange={e => handleChangeWithCheck(p.key, e.target.value)}
              placeholder={p.placeholder}
              spellCheck={false}
            />
            <button className={styles.pathBtn} onClick={() => handleBrowseWithCheck(p.key)}>
              Browse
            </button>
            {pathStatus[p.key] === true  && <span className={styles.pathOk}>OK</span>}
            {pathStatus[p.key] === false && <span className={styles.pathBad}>!</span>}
          </div>
        ))}
      </div>

      <div className={styles.infoNote}>
        Only install the emulators you plan to use -- empty folders are fine and can be set up later via Settings > Rescan.
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btnNext} onClick={handleContinue}>Continue -></button>
      </div>
    </div>
  )
}
