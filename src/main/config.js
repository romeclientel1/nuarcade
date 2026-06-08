const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const CONFIG_PATH = path.join(app.getPath('userData'), 'nuarcade-config.json')

const DEFAULTS = {
  teknoParrotPath:  'F:\\TeknoParrot\\',
  gamesFolderPath:  'F:\\ArcadeGames\\',
  pinballPath:      'F:\\vPinball\\',
  tablesPath:       'F:\\PinballTables\\',
  mediaPath:        'F:\\Media\\',
  sgdbApiKey:       '8e15be83af3c9840a1a26987bdf6fd13',
  setupComplete:    false,
  displayMode:      'fullscreen',
  controllers: {
    wheel:    null,
    lightgun: null,
    gamepad:  null,
  },
  gameControllerOverrides: {},
  genreControllers: {
    Racing:   'wheel',
    Shooter:  'lightgun',
    Fighting: 'gamepad',
    Rhythm:   'gamepad',
    Flying:   'gamepad',
    Pinball:  'gamepad',
    Other:    'gamepad',
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
