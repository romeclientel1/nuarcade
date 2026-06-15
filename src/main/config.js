const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const CONFIG_PATH = path.join(app.getPath('userData'), 'nuarcade-config.json')

const DEFAULTS = {
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
  model2Path:         'F:\\Model2\\',
  model2GamesPath:    'F:\\Model2Games\\',
  model3Path:         'F:\\Supermodel\\',
  model3GamesPath:    'F:\\Model3Games\\',
  ppssppPath:         'F:\\PPSSPP\\',
  pspGamesPath:       'F:\\PSPGames\\',
  cemuPath:           'F:\\Cemu\\',
  wiiUGamesPath:      'F:\\WiiUGames\\',
  steamPath:          'C:\\Program Files (x86)\\Steam\\steamapps',
  pcGamesPath:        'F:\\PCGames\\',
  pinballPath:        'F:\\vPinball\\',
  tablesPath:         'F:\\PinballTables\\',
  mediaPath:          'F:\\Media\\',
  ytdlpPath:          'F:\\Tools\\yt-dlp.exe',
  anthropicApiKey:    '',
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

function load() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
      return { ...DEFAULTS, ...JSON.parse(raw) }
    }
  } catch (e) {}
  return { ...DEFAULTS }
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

module.exports = { load, save, get, set, update, CONFIG_PATH }
