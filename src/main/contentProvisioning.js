const fs = require('fs')
const path = require('path')

const FOLDER_SCHEMA_VERSION = '6.0.6'

const RETROARCH_SYSTEMS = [
  'nes', 'snes', 'n64', 'gba', 'gbc', 'gb', 'nds', 'virtualboy', 'gamecube', 'wii',
  'genesis', 'megadrive', 'mastersystem', 'gamegear', 'saturn', 'segacd', 'sega32x',
  'psx', 'psp', 'atari2600', 'atari7800', 'atarijaguar', 'atarilynx', 'pcengine',
  'neogeo', 'neogeopocket', 'arcade', 'fba', 'dos', 'scummvm', 'amstradcpc',
  'zxspectrum', 'c64', 'amiga', 'vectrex', 'wonderswan',
]

// This is the only structural schema. Installer and renderer callers use the
// same main-process planner; it intentionally contains directories only.
const ROOT_DIRECTORIES = [
  'TeknoParrot', 'MAME', 'MAME/roms', 'Model2', 'Supermodel', 'RetroArch',
  'RetroArch/system', 'Project64', 'DuckStation', 'Flycast', 'Xemu', 'Cxbx-Reloaded',
  'PPSSPP', 'PCSX2', 'RPCS3', 'Xenia', 'Dolphin', 'Cemu', 'Ryujinx', 'vPinball',
  'ArcadeGames', 'RetroArchGames', 'N64Games', 'PS1Games', 'DreamcastGames',
  'XboxGames', 'PSPGames', 'PS2Games', 'PS3Games', 'Xbox360Games', 'GCWiiGames',
  'WiiUGames', 'SwitchGames', 'Model2Games', 'Model3Games', 'PinballTables', 'PCGames', 'SteamGames',
  'Media', 'Media/Videos', 'Media/Artwork', 'Media/EmuMovies', 'RetroArchGames/roms',
]

function assertContentRoot(root) {
  const value = path.resolve(root)
  const lower = value.toLowerCase().replace(/\\/g, '/')
  if (lower.includes('/resources/app.asar') || lower.endsWith('/resources') || lower.includes('.asar/')) {
    throw new Error('Refusing content root inside Electron resources/app.asar: ' + value)
  }
  return value
}

function resolveInstallDirectory({ appRef, execPath, isPackaged, appPath, developmentRoot } = {}) {
  const packaged = isPackaged ?? appRef?.isPackaged
  if (packaged) return assertContentRoot(path.dirname(execPath || process.execPath))
  if (developmentRoot) return assertContentRoot(developmentRoot)
  const userData = appRef?.getPath?.('userData')
  return assertContentRoot(path.join(userData || path.join(process.cwd(), '.nuarcade-test-data'), 'dev-content'))
}

function resolveInstallContentRoot(options = {}) {
  return resolveInstallDirectory(options)
}

function planRequiredDirectories(root, { includeMedia = true, includeRetroArch = true } = {}) {
  const base = assertContentRoot(root)
  const relative = [...ROOT_DIRECTORIES]
  if (!includeMedia) relative.splice(relative.indexOf('Media'), 1)
  const dirs = relative.map(item => path.join(base, item))
  if (includeRetroArch) {
    for (const system of RETROARCH_SYSTEMS) dirs.push(path.join(base, 'RetroArchGames', 'roms', system))
  }
  return [...new Set(dirs)]
}

function planMediaDirectories(root) {
  const base = assertContentRoot(root)
  return [base, path.join(base, 'Videos'), path.join(base, 'Artwork'), path.join(base, 'EmuMovies')]
}

function planRetroArchDirectories(root) {
  const base = assertContentRoot(root)
  return [base, ...RETROARCH_SYSTEMS.map(system => path.join(base, system))]
}

function provisionDirectories(root, options = {}) {
  const fsImpl = options.fsImpl || fs
  const logger = options.logger || console
  const dirs = options.profile === 'media'
    ? planMediaDirectories(root)
    : options.profile === 'retroarch' ? planRetroArchDirectories(root) : planRequiredDirectories(root, options)
  const created = [], skipped = [], failures = []
  for (const dir of dirs) {
    try {
      if (fsImpl.existsSync(dir)) {
        skipped.push(dir)
      } else {
        fsImpl.mkdirSync(dir, { recursive: true })
        created.push(dir)
      }
    } catch (error) {
      failures.push({ path: dir, error: error.message })
      logger.error('[content-provisioning] failed:', dir, error.message)
    }
  }
  return { success: failures.length === 0, root: path.resolve(root), created, skipped, failures, version: FOLDER_SCHEMA_VERSION }
}

function provisionConfiguredRoots(config, options = {}) {
  const fsImpl = options.fsImpl || fs
  const logger = options.logger || console
  const created = [], skipped = [], failures = []
  const excluded = new Set(['steamPath', 'ytdlpPath', 'bezelSourcePath', 'mediaPath', 'retroarchGamesPath'])
  for (const [key, value] of Object.entries(config || {})) {
    if (excluded.has(key) || !/Path$/.test(key) || typeof value !== 'string' || !value) continue
    try {
      const root = assertContentRoot(value)
      if (fsImpl.existsSync(root)) skipped.push(root)
      else { fsImpl.mkdirSync(root, { recursive: true }); created.push(root) }
    } catch (error) {
      failures.push({ path: value, error: error.message })
      logger.error('[content-provisioning] configured root failed:', value, error.message)
    }
  }
  return { success: failures.length === 0, created, skipped, failures }
}

function ensureDirectory(root, options = {}) {
  const fsImpl = options.fsImpl || fs
  const logger = options.logger || console
  try {
    const value = assertContentRoot(root)
    if (fsImpl.existsSync(value)) return { success: true, created: false, path: value }
    fsImpl.mkdirSync(value, { recursive: true })
    return { success: true, created: true, path: value }
  } catch (error) {
    logger.error('[content-provisioning] directory failed:', root, error.message)
    return { success: false, created: false, path: root, error: error.message }
  }
}

function defaultContentPaths(root) {
  const r = assertContentRoot(root)
  const p = name => path.join(r, name) + path.sep
  return {
    teknoParrotPath: p('TeknoParrot'), gamesFolderPath: p('ArcadeGames'), rpcs3Path: p('RPCS3'),
    ps3GamesPath: p('PS3Games'), xeniaPath: p('Xenia'), xbox360GamesPath: p('Xbox360Games'),
    dolphinPath: p('Dolphin'), gcWiiGamesPath: p('GCWiiGames'), pcsx2Path: p('PCSX2'),
    ps2GamesPath: p('PS2Games'), ryujinxPath: p('Ryujinx'), switchGamesPath: p('SwitchGames'),
    mamePath: p('MAME'), mameGamesPath: p('MAME/roms'), retroarchPath: p('RetroArch'),
    retroarchGamesPath: p('RetroArchGames'), project64Path: p('Project64'), n64GamesPath: p('N64Games'),
    duckstationPath: p('DuckStation'), ps1GamesPath: p('PS1Games'), flycastPath: p('Flycast'),
    dreamcastGamesPath: p('DreamcastGames'), xemuPath: p('Xemu'), cxbxPath: p('Cxbx-Reloaded'),
    xboxGamesPath: p('XboxGames'), model2Path: p('Model2'), model2GamesPath: p('Model2Games'),
    model3Path: p('Supermodel'), model3GamesPath: p('Model3Games'), ppssppPath: p('PPSSPP'),
    pspGamesPath: p('PSPGames'), cemuPath: p('Cemu'), wiiUGamesPath: p('WiiUGames'),
    pcGamesPath: p('PCGames'), pinballPath: p('vPinball'), tablesPath: p('PinballTables'),
    steamGamesPath: p('SteamGames'), mediaPath: p('Media'), emuMoviesPath: p('Media/EmuMovies'),
  }
}

module.exports = {
  FOLDER_SCHEMA_VERSION, RETROARCH_SYSTEMS,
  ROOT_DIRECTORIES, resolveInstallDirectory, resolveInstallContentRoot,
  planRequiredDirectories, planMediaDirectories, planRetroArchDirectories,
  provisionDirectories, provisionConfiguredRoots, ensureDirectory, defaultContentPaths, assertContentRoot,
}
