const fs = require('fs')
const path = require('path')

// ---
// mediaScanner.js
// Scans F:\Media\ folder tree and patches media paths onto game objects.
//
// Media folder layout (created by ensure-media-folders IPC handler):
//   F:\Media\{System}\Video\{name}.mp4
//   F:\Media\{System}\Images\Snap\{name}.png/.jpg
//   F:\Media\{System}\Images\Box Art\{name}.png/.jpg
//   F:\Media\{System}\Images\Marquee\{name}.png/.jpg
//   F:\Media\{System}\Images\Wheel\{name}.png/.jpg
// ---

// Map emulator IDs to media folder names
const EMULATOR_FOLDER = {
  TeknoParrot: 'TeknoParrot',
  MAME:        'MAME',
  RPCS3:       'RPCS3',
  Xenia:       'Xenia',
  Dolphin:     'Dolphin',
  PCSX2:       'PCSX2',
  Ryujinx:     'Ryujinx',
  Ryubing:     'Ryujinx',
  DuckStation: 'DuckStation',
  Flycast:     'Flycast',
  PPSSPP:      'PPSSPP',
  Cemu:        'Cemu',
  Model2:      'Model2',
  Model3:      'Model3',
  RetroArch:   'RetroArch',
  Steam:       'Steam',
  PC:          'PC',
}


// EmuMovies system name mapping (their folder names differ from ours)
const EMUMOVIES_FOLDER = {
  teknoparrot: 'MAME',
  mame:        'MAME 2003',
  rpcs3:       'Sony Playstation 3',
  xenia:       'Microsoft XBOX 360',
  dolphin:     'Nintendo GameCube',
  pcsx2:       'Sony Playstation 2',
  ryujinx:     'Nintendo Switch',
  duckstation: 'Sony Playstation',
  flycast:     'Sega Dreamcast',
  ppsspp:      'Sony PSP',
  cemu:        'Nintendo Wii U',
  model2:      'Model2',
  model3:      'Model3',
  retroarch:   'RetroArch',
  steam:       'Steam',
  pc:          'PC',
}

const VIDEO_EXTS   = ['.mp4', '.avi', '.mkv', '.webm']
const IMAGE_EXTS   = ['.png', '.jpg', '.jpeg', '.webp']

// Sanitize a string into a bare filename stem for matching
function sanitize(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// Build a lookup map: sanitizedStem -> fullFilePath
function buildLookup(dir, exts) {
  const map = {}
  if (!fs.existsSync(dir)) return map
  try {
    for (const file of fs.readdirSync(dir)) {
      const ext = path.extname(file).toLowerCase()
      if (!exts.includes(ext)) continue
      const stem = sanitize(path.basename(file, ext))
      if (stem) map[stem] = path.join(dir, file)
    }
  } catch (e) {
    // unreadable dir - skip
  }
  return map
}

// Get the match key for a game object
function gameKey(game) {
  // Priority: romName (MAME) > profile base (TeknoParrot) > sanitized title
  if (game.romName) return sanitize(game.romName)
  if (game.profile) return sanitize(path.basename(game.profile, path.extname(game.profile)))
  return sanitize(game.title)
}

// Main export: patch media paths onto all game objects
function scanMedia(games, mediaRoot) {
  if (!mediaRoot || !fs.existsSync(mediaRoot)) return games

  // Build lookup tables per system per asset type
  const cache = {}

  function getEmMoviesLookup(emulatorKey, assetType, exts, mediaRoot) {
    const sysName = EMUMOVIES_FOLDER[emulatorKey?.toLowerCase()] || ''
    if (!sysName) return {}
    const emDir = path.join(mediaRoot, 'EmuMovies', sysName, assetType)
    return buildLookup(emDir, exts)
  }

  function getLookup(system, subFolder, exts) {
    const key = system + '|' + subFolder
    if (!cache[key]) {
      cache[key] = buildLookup(path.join(mediaRoot, system, subFolder), exts)
    }
    return cache[key]
  }

  return games.map(game => {
    const emulator = game.emulator || 'PC'
    const system = EMULATOR_FOLDER[emulator] || emulator
    const key = gameKey(game)

    if (!key) return game

    const videos   = getLookup(system, 'Video',           VIDEO_EXTS)
    const snaps    = getLookup(system, 'Images\\Snap',      IMAGE_EXTS)
    const boxart   = getLookup(system, 'Images\\Box Art',   IMAGE_EXTS)
    const marquees = getLookup(system, 'Images\\Marquee',   IMAGE_EXTS)
    const wheels   = getLookup(system, 'Images\\Wheel',     IMAGE_EXTS)

    const patch = {}
    if (videos[key]   && !game.videoPath)    patch.videoPath    = videos[key]
    if (snaps[key]    && !game.snapPath)     patch.snapPath     = snaps[key]
    if (boxart[key]   && !game.boxArtPath)   patch.boxArtPath   = boxart[key]
    if (marquees[key] && !game.marqueePath)  patch.marqueePath  = marquees[key]
    if (wheels[key]   && !game.wheelPath)    patch.wheelPath    = wheels[key]

    return Object.keys(patch).length ? { ...game, ...patch } : game
  })
}

module.exports = { scanMedia }
