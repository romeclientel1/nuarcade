import { useState, useEffect, useCallback } from 'react'
import styles from './Screen.module.css'

const ALL_PATHS = [
  { key: 'teknoParrotPath',    label: 'TeknoParrot',         placeholder: 'F:\\TeknoParrot\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'gamesFolderPath',    label: 'Arcade Games',        placeholder: 'F:\\ArcadeGames\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'rpcs3Path',          label: 'RPCS3 (PS3)',         placeholder: 'F:\\RPCS3\\',             emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ps3GamesPath',       label: 'PS3 Games',           placeholder: 'F:\\PS3Games\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'xeniaPath',          label: 'Xenia (Xbox 360)',    placeholder: 'F:\\Xenia\\',             emulators: ['arcade', 'arcade+pinball'] },
  { key: 'xbox360GamesPath',   label: 'Xbox 360 Games',      placeholder: 'F:\\Xbox360Games\\',      emulators: ['arcade', 'arcade+pinball'] },
  { key: 'dolphinPath',        label: 'Dolphin (GC/Wii)',    placeholder: 'F:\\Dolphin\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'gcWiiGamesPath',     label: 'GameCube/Wii Games',  placeholder: 'F:\\GCWiiGames\\',        emulators: ['arcade', 'arcade+pinball'] },
  { key: 'pcsx2Path',          label: 'PCSX2 (PS2)',         placeholder: 'F:\\PCSX2\\',             emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ps2GamesPath',       label: 'PS2 Games',           placeholder: 'F:\\PS2Games\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ryujinxPath',        label: 'Ryujinx (Switch)',    placeholder: 'F:\\Ryujinx\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'switchGamesPath',    label: 'Switch Games',        placeholder: 'F:\\SwitchGames\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'mamePath',           label: 'MAME',                placeholder: 'F:\\MAME\\',              emulators: ['arcade', 'arcade+pinball'] },
  { key: 'mameGamesPath',      label: 'MAME ROMs',           placeholder: 'F:\\MAME\\roms\\',        emulators: ['arcade', 'arcade+pinball'] },
  { key: 'retroarchPath',      label: 'RetroArch',           placeholder: 'F:\\RetroArch\\',         emulators: ['arcade', 'arcade+pinball'] },
  { key: 'retroarchGamesPath', label: 'RetroArch Games',     placeholder: 'F:\\RetroArchGames\\',    emulators: ['arcade', 'arcade+pinball'] },
  { key: 'project64Path',      label: 'Project64 (N64)',     placeholder: 'F:\\Project64\\',         emulators: ['arcade', 'arcade+pinball'] },
  { key: 'n64GamesPath',       label: 'N64 Games',           placeholder: 'F:\\N64Games\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'duckstationPath',    label: 'DuckStation (PS1)',   placeholder: 'F:\\DuckStation\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ps1GamesPath',       label: 'PS1 Games',           placeholder: 'F:\\PS1Games\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'flycastPath',        label: 'Flycast (Dreamcast)', placeholder: 'F:\\Flycast\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'dreamcastGamesPath', label: 'Dreamcast Games',     placeholder: 'F:\\DreamcastGames\\',    emulators: ['arcade', 'arcade+pinball'] },
  { key: 'model2Path',        label: 'Model 2 Emulator',    placeholder: 'F:\\Model2\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'model2GamesPath',    label: 'Model 2 Games',        placeholder: 'F:\\Model2Games\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'model3Path',        label: 'Supermodel (Model 3)', placeholder: 'F:\\Supermodel\\',        emulators: ['arcade', 'arcade+pinball'] },
  { key: 'model3GamesPath',    label: 'Model 3 Games',        placeholder: 'F:\\Model3Games\\',       emulators: ['arcade', 'arcade+pinball'] },
  { key: 'ppssppPath',         label: 'PPSSPP (PSP)',         placeholder: 'F:\\PPSSPP\\',             emulators: ['arcade', 'arcade+pinball'] },
  { key: 'pspGamesPath',       label: 'PSP Games',            placeholder: 'F:\\PSPGames\\',           emulators: ['arcade', 'arcade+pinball'] },
  { key: 'cemuPath',           label: 'Cemu (Wii U)',         placeholder: 'F:\\Cemu\\',               emulators: ['arcade', 'arcade+pinball'] },
  { key: 'wiiUGamesPath',      label: 'Wii U Games',          placeholder: 'F:\\WiiUGames\\',          emulators: ['arcade', 'arcade+pinball'] },
  { key: 'pinballPath',        label: 'VPX Engine',          placeholder: 'F:\\vPinball\\',          emulators: ['pinball', 'arcade+pinball'] },
  { key: 'tablesPath',         label: 'Pinball Tables',      placeholder: 'F:\\PinballTables\\',     emulators: ['pinball', 'arcade+pinball'] },
  { key: 'steamPath',          label: 'Steam (steamapps)',   placeholder: 'C:\\Program Files (x86)\\Steam\\steamapps', emulators: ['arcade', 'arcade+pinball'] },
  { key: 'pcGamesPath',        label: 'PC Games',            placeholder: 'F:\\PCGames\\',            emulators: ['arcade', 'arcade+pinball'] },
]

export default function PathsScreen({ config, updateConfig, next, prev }) {
  const mode = config.mode || 'arcade+pinball'

  const defaults = {
    teknoParrotPath:    'F:\\TeknoParrot\\',
    gamesFolderPath:    'F:\\ArcadeGames\\',
    rpcs3Path:          'F:\\RPCS3\\',
    ps3GamesPath:       'F:\\PS3Games\\',
    xeniaPath:          'F:\\Xenia\\',
    xbox360GamesPath:   'F:\\Xbox360Games\\',
    dolphinPath:        'F:\\Dolphin\\',
    gcWiiGamesPath:     'F:\\GCWiiGames\\',
    pcsx2Path:          'F:\\PCSX2\\',
    ps2GamesPath:       'F:\\PS2Games\\',
    ryujinxPath:        'F:\\Ryujinx\\',
    switchGamesPath:    'F:\\SwitchGames\\',
    mamePath:           'F:\\MAME\\',
    mameGamesPath:      'F:\\MAME\\roms\\',
    retroarchPath:      'F:\\RetroArch\\',
    retroarchGamesPath: 'F:\\RetroArchGames\\',
    project64Path:      'F:\\Project64\\',
    n64GamesPath:       'F:\\N64Games\\',
    duckstationPath:    'F:\\DuckStation\\',
    ps1GamesPath:       'F:\\PS1Games\\',
    flycastPath:        'F:\\Flycast\\',
    dreamcastGamesPath: 'F:\\DreamcastGames\\',
    model2Path:        'F:\\Model2\\',
    model2GamesPath:   'F:\\Model2Games\\',
    model3Path:        'F:\\Supermodel\\',
    model3GamesPath:   'F:\\Model3Games\\',
    ppssppPath:        'F:\\PPSSPP\\',
    pspGamesPath:      'F:\\PSPGames\\',
    cemuPath:          'F:\\Cemu\\',
    wiiUGamesPath:     'F:\\WiiUGames\\',
    pinballPath:        'F:\\vPinball\\',
    tablesPath:         'F:\\PinballTables\\',
    steamPath:          'C:\\Program Files (x86)\\Steam\\steamapps',
    pcGamesPath:        'F:\\PCGames\\',
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
      <div className={styles.eyebrow}>Step 3 ? Paths</div>
      <div className={styles.title}>Where are your files?</div>
      <div className={styles.sub}>
        Point NuArcade to each emulator and its games folder.
        All paths default to your F: drive ? browse or type to update.
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
        ? Only install the emulators you plan to use ? empty folders are fine and can be set up later via Settings ? Rescan.
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>? Back</button>
        <button className={styles.btnNext} onClick={handleContinue}>Continue ?</button>
      </div>
    </div>
  )
}
