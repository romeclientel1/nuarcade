const fs = require('fs')
const path = require('path')
const { app } = require('electron')
const { resolveInstallContentRoot, defaultContentPaths } = require('./contentProvisioning')

const CONFIG_PATH = path.join(app.getPath('userData'), 'nuarcade-config.json')

const LEGACY_DEFAULTS = {
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
  bezelSourcePath:    '',
  hideNotWorkingMame: true,
  retroarchPath:      'C:\\RetroArch\\',
  retroarchGamesPath: '',
  project64Path:      'C:\\Project64\\',
  n64GamesPath:       'C:\\N64Games\\',
  duckstationPath:    'C:\\DuckStation\\',
  ps1GamesPath:       'C:\\PS1Games\\',
  flycastPath:        'C:\\Flycast\\',
  dreamcastGamesPath: 'C:\\DreamcastGames\\',
  xemuPath:           'C:\\Xemu\\',
  cxbxPath:           'C:\\Cxbx-Reloaded\\',
  xboxGamesPath:      'C:\\XboxGames\\',
  model2Path:         'C:\\Model2\\',
  model2GamesPath:    'C:\\Model2Games\\',
  model3Path:         'C:\\Supermodel\\',
  model3GamesPath:    'C:\\Model3Games\\',
  ppssppPath:         'C:\\PPSSPP\\',
  pspGamesPath:       'C:\\PSPGames\\',
  cemuPath:           'C:\\Cemu\\',
  wiiUGamesPath:      'C:\\WiiUGames\\',
  steamPath:          'C:\\Program Files (x86)\\Steam\\steamapps',
  pcGamesPath:        'C:\\PCGames\\',
  pinballPath:        'C:\\vPinball\\',
  tablesPath:         'C:\\PinballTables\\',
  steamGamesPath:     'C:\\SteamGames\\',
  pcGamesPath:        'C:\\PCGames\\',
  mediaPath:          '',
  ytdlpPath:          'C:\\Tools\\yt-dlp.exe',
  anthropicApiKey:    '',
  musicEnabled:       true,
  musicVolume:        60,
  enabledEmulators: {
    teknoparrot: true,
    rpcs3:       true,
    xenia:       true,
    dolphin:     true,
    pcsx2:       true,
    ryujinx:     true,
    mame:        true,
    retroarch:   true,
    project64:   true,
    duckstation: true,
    flycast:     true,
    xemu:        true,
    cxbx:        true,
    model2:      true,
    model3:      true,
    ppsspp:      true,
    cemu:        true,
    vpx:         true,
    steam:       true,
    pc:          true,
  },
  screenscraper: {
    user: '',
    pass: '',
  },
  pixelcade: {
    enabled: false,
    ip:      '192.168.1.100',
    port:    8080,
  },
  sgdbApiKey:         '8e15be83af3c9840a1a26987bdf6fd13',
  setupComplete:      false,
  displayMode:        'fullscreen',
  attractCycleSpeed:  6,
  attractPreferArt:   true,
  controllers: {
    wheel:    null,
    lightgun: null,
    gamepad:  null,
  },
  gameControllerOverrides: {},
  genreControllers: {
    Racing:    'wheel',
    Shooter:   'lightgun',
    Fighting:  'gamepad',
    Rhythm:    'gamepad',
    Flying:    'gamepad',
    Pinball:   'gamepad',
    Arcade:    'gamepad',
    Retro:     'gamepad',
    N64:       'gamepad',
    PS1:       'gamepad',
    Dreamcast: 'gamepad',
    Other:     'gamepad',
  }
}

// Content defaults are derived from the executable's directory for packaged
// installs. Development uses an isolated userData child, never the checkout.
// Existing config values are merged over these defaults and therefore remain
// authoritative across upgrades.
const INSTALL_CONTENT_ROOT = resolveInstallContentRoot({ appRef: app })
const DEFAULTS = { ...LEGACY_DEFAULTS, ...defaultContentPaths(INSTALL_CONTENT_ROOT) }

function load() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
      return { ...DEFAULTS, ...JSON.parse(raw) }
    }
  } catch (e) {}
  return { ...DEFAULTS }
}

function exists() {
  return fs.existsSync(CONFIG_PATH)
}

function hasExplicitContentPaths() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    const excluded = new Set(['steamPath', 'ytdlpPath', 'bezelSourcePath', 'emuMoviesPath'])
    return Object.keys(raw).some(key => !excluded.has(key) && /Path$/.test(key) && typeof raw[key] === 'string' && raw[key].length > 0)
  } catch (e) { return false }
}

function save(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
    return true
  } catch (e) {
    return false
  }
}

function get(key) {
  const config = load()
  return key ? config[key] : config
}

function set(key, value) {
  const config = load()
  config[key] = value
  return save(config)
}

function update(updates) {
  const config = load()
  Object.assign(config, updates)
  return save(config)
}

module.exports = { load, save, get, set, update, exists, hasExplicitContentPaths, CONFIG_PATH, INSTALL_CONTENT_ROOT, DEFAULTS }
