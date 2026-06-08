const fs = require('fs')
const path = require('path')
const { XMLParser } = require('fast-xml-parser')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
})

const GENRE_MAP = {
  'Racer':        'Racing',
  'Racing':       'Racing',
  'Fighter':      'Fighting',
  'Fighting':     'Fighting',
  'Shooter':      'Shooter',
  'Shoot':        'Shooter',
  "Shoot 'Em Up": 'Shooter',
  'Shooting':     'Shooter',
  'Rhythm':       'Rhythm',
  'Music':        'Rhythm',
  'Flying':       'Flying',
  'Sports':       'Sports',
  'Action':       'Action',
  'Platform':     'Action',
  'Puzzle':       'Puzzle',
  'Multiplayer':  'Multiplayer',
  'Strategy':     'Strategy',
}

const BROKEN_STATUS = ['Broken', 'Nothing', 'DoesNotBoot']

const SUBSCRIPTION_PROFILES = new Set([
  'SWDC.xml', 'Wangan6R.xml', 'MK11.xml', 'DOA6.xml',
  'Tekken7.xml', 'SoulCalibur6.xml', 'GundamExVs2.xml',
  'GundamExVs2XBoost.xml', 'Persona4UA.xml', 'MVC3.xml',
])

function parseProfile(xmlPath) {
  try {
    const raw = fs.readFileSync(xmlPath, 'utf8')
    const data = parser.parse(raw)
    const profile = data?.GameProfile || data?.UserProfile
    if (!profile) return null

    const fileName = path.basename(xmlPath)
    const title    = profile.GameName || profile.Description || fileName.replace('.xml', '')
    const gamePath = profile.GamePath || profile.ExecutablePath || ''
    const exeName  = profile.ExecutableName || profile.Executable || ''
    const rawStatus = profile.GameStatus || profile.Status || 'Unknown'
    const genre    = normalizeGenre(profile.Genre || profile.GameType || '')
    const system   = profile.EmulationProfile || profile.System || 'Unknown'
    const year       = profile.Year || profile.ReleaseYear || ''
    const manufacturer = profile.Manufacturer || profile.Developer || ''
    const players    = profile.MaxPlayers || profile.Players || 1
    const description = profile.Description2 || profile.Notes || ''
    const isSubscription = profile.RequiresSubscription === true ||
                           profile.Patreon === true ||
                           SUBSCRIPTION_PROFILES.has(fileName)

    let status = rawStatus
    if (BROKEN_STATUS.includes(status)) {
      status = 'Broken'
    } else if (!['Perfect', 'Great', 'Playable'].includes(status)) {
      status = 'Unverified'
    }

    const exePath = gamePath ||
      (profile.GameLocation ? path.join(profile.GameLocation, exeName) : '')

    return {
      id: fileName.replace('.xml', ''),
      year, manufacturer, players, description,
      profile: fileName,
      profilePath: xmlPath,
      title, exePath, exeName,
      status, genre, system,
      isSubscription,
      visible: false,
    }
  } catch (err) {
    return null
  }
}

function normalizeGenre(raw) {
  if (!raw) return 'Other'
  return GENRE_MAP[raw.trim()] || raw.trim() || 'Other'
}

function findExeInFolder(rootFolder, exeName, depth = 0) {
  if (depth > 4) return false
  try {
    const entries = fs.readdirSync(rootFolder, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(rootFolder, entry.name)
      if (entry.isFile() && entry.name.toLowerCase() === exeName.toLowerCase()) {
        return fullPath
      }
      if (entry.isDirectory()) {
        const found = findExeInFolder(fullPath, exeName, depth + 1)
        if (found) return found
      }
    }
  } catch (e) {}
  return false
}

function resolveExePath(game, gamesFolderPath) {
  if (game.exePath && fs.existsSync(game.exePath)) return game.exePath
  if (gamesFolderPath && game.exeName) {
    const found = findExeInFolder(gamesFolderPath, game.exeName)
    if (found) return found
  }
  return game.exePath || ''
}

function scanGames(teknoParrotPath, gamesFolderPath) {
  const profilesDir = path.join(teknoParrotPath, 'GameProfiles')

  if (!fs.existsSync(profilesDir)) {
    return {
      games: [],
      stats: { total: 0, visible: 0, hidden: 0, reasons: {} },
      error: `GameProfiles folder not found at: ${profilesDir}`
    }
  }

  const xmlFiles = fs.readdirSync(profilesDir)
    .filter(f => f.toLowerCase().endsWith('.xml'))

  const stats = {
    total: xmlFiles.length,
    visible: 0,
    hidden: 0,
    reasons: { subscription: 0, broken: 0, missingFiles: 0, parseError: 0 }
  }

  const games = []

  for (const xmlFile of xmlFiles) {
    const xmlPath = path.join(profilesDir, xmlFile)
    const game = parseProfile(xmlPath)

    if (!game) {
      stats.hidden++
      stats.reasons.parseError++
      continue
    }

    if (game.isSubscription) {
      stats.hidden++
      stats.reasons.subscription++
      continue
    }

    if (game.status === 'Broken') {
      stats.hidden++
      stats.reasons.broken++
      continue
    }

    const resolvedPath = resolveExePath(game, gamesFolderPath)
    if (!resolvedPath) {
      stats.hidden++
      stats.reasons.missingFiles++
      continue
    }

    game.exePath = resolvedPath
    game.visible = true
    stats.visible++
    games.push(game)
  }

  stats.hidden = stats.total - stats.visible

  const statusOrder = { Perfect: 0, Great: 1, Playable: 2, Unverified: 3 }
  games.sort((a, b) => {
    const diff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
    return diff !== 0 ? diff : a.title.localeCompare(b.title)
  })

  return { games, stats }
}

function scanPinballTables(tablesPath) {
  if (!fs.existsSync(tablesPath)) {
    return {
      games: [],
      stats: { total: 0, visible: 0 },
      error: `Pinball tables folder not found at: ${tablesPath}`
    }
  }

  const vpxFiles = fs.readdirSync(tablesPath)
    .filter(f => f.toLowerCase().endsWith('.vpx'))

  const games = vpxFiles.map(file => {
    const title = file
      .replace('.vpx', '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim()

    return {
      id: file.replace('.vpx', ''),
      profile: file,
      profilePath: path.join(tablesPath, file),
      title,
      exePath: path.join(tablesPath, file),
      genre: 'Pinball',
      system: 'Visual Pinball X',
      status: 'Perfect',
      isSubscription: false,
      visible: true,
      icon: 'VPX',
      isPinball: true,
    }
  })

  games.sort((a, b) => a.title.localeCompare(b.title))

  return {
    games,
    stats: { total: games.length, visible: games.length }
  }
}

module.exports = { scanGames, parseProfile, scanPinballTables }

// -- RPCS3 Game Scanner ------------------------------------------------------
// RPCS3 stores games in folders named by their serial (e.g. BLES01807)
// Each folder contains a PS3_GAME subfolder with PARAM.SFO holding the title
async function scanPs3Games(ps3GamesPath) {
  const fs = require('fs')
  const path = require('path')

  const games = []

  if (!fs.existsSync(ps3GamesPath)) {
    return { games, count: 0, path: ps3GamesPath, error: 'Folder not found' }
  }

  let entries
  try {
    entries = fs.readdirSync(ps3GamesPath, { withFileTypes: true })
  } catch (e) {
    return { games, count: 0, error: e.message }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const gameDir = path.join(ps3GamesPath, entry.name)
    const paramSfo = path.join(gameDir, 'PS3_GAME', 'PARAM.SFO')
    const paramSfoAlt = path.join(gameDir, 'PARAM.SFO')

    // Try to read game title from PARAM.SFO (binary format - extract ASCII title)
    let title = entry.name
    const sfoPath = fs.existsSync(paramSfo) ? paramSfo : fs.existsSync(paramSfoAlt) ? paramSfoAlt : null
    if (sfoPath) {
      try {
        const buf = fs.readFileSync(sfoPath)
        // PARAM.SFO: find TITLE key - it's a UTF-8 string after the data table
        const titleMatch = buf.toString('latin1').match(/TITLE\x00[\s\S]{4,20}([A-Za-z0-9][\x20-\x7E]{2,80})/)
        if (titleMatch) title = titleMatch[1].replace(/\x00.*/, '').trim()
      } catch (e) {}
    }

    games.push({
      id: 'ps3_' + entry.name,
      title,
      serial: entry.name,
      path: gameDir,
      emulator: 'rpcs3',
      genre: 'PS3',
      artwork: null,
    })
  }

  return { games, count: games.length, path: ps3GamesPath }
}

module.exports = { ...module.exports, scanPs3Games }


// -- Xenia / Xbox 360 Scanner ------------------------------------------------
async function scanXbox360Games(xbox360GamesPath) {
  const fs = require('fs')
  const path = require('path')
  const games = []

  if (!fs.existsSync(xbox360GamesPath)) {
    return { games, count: 0, path: xbox360GamesPath, error: 'Folder not found' }
  }

  const EXTS = ['.iso', '.xex', '.zar']
  let entries
  try { entries = fs.readdirSync(xbox360GamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Folder-based game - look for default.xex inside
      const xex = path.join(xbox360GamesPath, entry.name, 'default.xex')
      if (fs.existsSync(xex)) {
        games.push({
          id: 'xbox360_' + entry.name.replace(/\s+/g, '_'),
          title: entry.name,
          path: xex,
          emulator: 'xenia',
          genre: 'Xbox360',
          system: 'Xbox 360',
          status: 'Playable',
          icon: 'GP',
          artwork: null,
        })
      }
    } else if (EXTS.includes(path.extname(entry.name).toLowerCase())) {
      const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')
      games.push({
        id: 'xbox360_' + title.replace(/\s+/g, '_'),
        title,
        path: path.join(xbox360GamesPath, entry.name),
        emulator: 'xenia',
        genre: 'Xbox360',
        system: 'Xbox 360',
        status: 'Playable',
        icon: 'GP',
        artwork: null,
      })
    }
  }
  return { games, count: games.length, path: xbox360GamesPath }
}

// -- Dolphin / GameCube + Wii Scanner ----------------------------------------
async function scanGCWiiGames(gcWiiGamesPath) {
  const fs = require('fs')
  const path = require('path')
  const games = []

  if (!fs.existsSync(gcWiiGamesPath)) {
    return { games, count: 0, path: gcWiiGamesPath, error: 'Folder not found' }
  }

  const EXTS = ['.iso', '.gcm', '.rvz', '.wbfs', '.wad', '.gcz']
  let entries
  try { entries = fs.readdirSync(gcWiiGamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')
    const isWii = ['.wbfs', '.wad'].includes(ext)
    games.push({
      id: 'gcwii_' + title.replace(/\s+/g, '_'),
      title,
      path: path.join(gcWiiGamesPath, entry.name),
      emulator: 'dolphin',
      genre: 'GCWii',
      system: isWii ? 'Nintendo Wii' : 'GameCube',
      status: 'Playable',
      icon: isWii ? 'gamepad' : 'switch',
      artwork: null,
    })
  }
  return { games, count: games.length, path: gcWiiGamesPath }
}

// -- PCSX2 / PS2 Scanner -----------------------------------------------------
async function scanPs2Games(ps2GamesPath) {
  const fs = require('fs')
  const path = require('path')
  const games = []

  if (!fs.existsSync(ps2GamesPath)) {
    return { games, count: 0, path: ps2GamesPath, error: 'Folder not found' }
  }

  const EXTS = ['.iso', '.bin', '.img', '.mdf', '.chd']
  let entries
  try { entries = fs.readdirSync(ps2GamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')
    games.push({
      id: 'ps2_' + title.replace(/\s+/g, '_'),
      title,
      path: path.join(ps2GamesPath, entry.name),
      emulator: 'pcsx2',
      genre: 'PS2',
      system: 'PlayStation 2',
      status: 'Playable',
      icon: 'PS2',
      artwork: null,
    })
  }
  return { games, count: games.length, path: ps2GamesPath }
}

module.exports = { ...module.exports, scanXbox360Games, scanGCWiiGames, scanPs2Games }


// -- Ryujinx / Nintendo Switch Scanner ---------------------------------------
async function scanSwitchGames(switchGamesPath) {
  const fs = require('fs')
  const path = require('path')
  const games = []

  if (!fs.existsSync(switchGamesPath)) {
    return { games, count: 0, path: switchGamesPath, error: 'Folder not found' }
  }

  const EXTS = ['.nsp', '.xci', '.nca', '.nsz', '.xcz']
  let entries
  try { entries = fs.readdirSync(switchGamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/\s*\[.*?\]/g, '').trim()
    games.push({
      id: 'switch_' + title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
      title,
      path: path.join(switchGamesPath, entry.name),
      emulator: 'ryujinx',
      genre: 'Switch',
      system: 'Nintendo Switch',
      status: 'Playable',
      icon: 'NSW',
      artwork: null,
    })
  }
  return { games, count: games.length, path: switchGamesPath }
}

module.exports = { ...module.exports, scanSwitchGames }


// -- MAME Scanner ------------------------------------------------------------
// Scans a folder for .zip and .chd ROM files
async function scanMameGames(mameGamesPath) {
  const games = []
  if (!fs.existsSync(mameGamesPath)) {
    return { games, count: 0, path: mameGamesPath, error: 'Folder not found' }
  }
  const EXTS = ['.zip', '.chd']
  let entries
  try { entries = fs.readdirSync(mameGamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const romName = entry.name.replace(/\.[^.]+$/, '')
    // Friendly title: uppercase first letter, keep romset name as-is
    const title = romName.charAt(0).toUpperCase() + romName.slice(1)
    games.push({
      id: 'mame_' + romName,
      title,
      romName,
      path: path.join(mameGamesPath, entry.name),
      emulator: 'mame',
      genre: 'Arcade',
      system: 'MAME',
      status: 'Playable',
      icon: 'M',
      artwork: null,
    })
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: mameGamesPath }
}

module.exports = { ...module.exports, scanMameGames }


// -- RetroArch Scanner -------------------------------------------------------
// Scans a games folder for common ROM extensions across all classic systems
async function scanRetroArchGames(retroarchGamesPath) {
  const games = []
  if (!fs.existsSync(retroarchGamesPath)) {
    return { games, count: 0, path: retroarchGamesPath, error: 'Folder not found' }
  }

  // Extension -> system display name
  const EXT_MAP = {
    '.nes':  'NES',
    '.fds':  'NES',
    '.sfc':  'SNES',
    '.smc':  'SNES',
    '.md':   'Genesis',
    '.gen':  'Genesis',
    '.smd':  'Genesis',
    '.gba':  'GBA',
    '.gbc':  'GBC',
    '.gb':   'Game Boy',
    '.n64':  'N64',
    '.z64':  'N64',
    '.v64':  'N64',
    '.ndd':  'N64',
    '.bin':  'PS1',
    '.cue':  'PS1',
    '.iso':  'PS1',
    '.chd':  'Multi',
    '.zip':  'Multi',
    '.pce':  'PC Engine',
    '.ngp':  'Neo Geo Pocket',
    '.ngc':  'Neo Geo Pocket',
    '.ws':   'WonderSwan',
    '.wsc':  'WonderSwan',
    '.a26':  'Atari 2600',
    '.a78':  'Atari 7800',
    '.lnx':  'Atari Lynx',
    '.32x':  '32X',
    '.gg':   'Game Gear',
    '.sms':  'Master System',
    '.col':  'ColecoVision',
    '.vec':  'Vectrex',
  }

  let entries
  try { entries = fs.readdirSync(retroarchGamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  const seen = new Set()
  for (const entry of entries) {
    // Recurse one level into system subfolders
    if (entry.isDirectory()) {
      const subPath = path.join(retroarchGamesPath, entry.name)
      let subEntries
      try { subEntries = fs.readdirSync(subPath, { withFileTypes: true }) }
      catch (e) { continue }
      for (const sub of subEntries) {
        if (!sub.isFile()) continue
        const ext = path.extname(sub.name).toLowerCase()
        if (!EXT_MAP[ext]) continue
        const fullPath = path.join(subPath, sub.name)
        if (seen.has(fullPath)) continue
        seen.add(fullPath)
        const title = sub.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
        games.push({
          id: 'ra_' + title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '_' + games.length,
          title,
          path: fullPath,
          emulator: 'retroarch',
          genre: 'Retro',
          system: EXT_MAP[ext] || 'RetroArch',
          status: 'Playable',
          icon: 'R',
          artwork: null,
        })
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (!EXT_MAP[ext]) continue
      const fullPath = path.join(retroarchGamesPath, entry.name)
      if (seen.has(fullPath)) continue
      seen.add(fullPath)
      const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
      games.push({
        id: 'ra_' + title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '_' + games.length,
        title,
        path: fullPath,
        emulator: 'retroarch',
        genre: 'Retro',
        system: EXT_MAP[ext] || 'RetroArch',
        status: 'Playable',
        icon: 'R',
        artwork: null,
      })
    }
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: retroarchGamesPath }
}

module.exports = { ...module.exports, scanRetroArchGames }


// -- Project64 / N64 Scanner ------------------------------------------------
async function scanN64Games(n64GamesPath) {
  const games = []
  if (!fs.existsSync(n64GamesPath)) {
    return { games, count: 0, path: n64GamesPath, error: 'Folder not found' }
  }
  const EXTS = ['.n64', '.z64', '.v64', '.ndd']
  let entries
  try { entries = fs.readdirSync(n64GamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
    games.push({
      id: 'n64_' + title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
      title,
      path: path.join(n64GamesPath, entry.name),
      emulator: 'project64',
      genre: 'N64',
      system: 'Nintendo 64',
      status: 'Playable',
      icon: '64',
      artwork: null,
    })
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: n64GamesPath }
}

module.exports = { ...module.exports, scanN64Games }


// -- DuckStation / PS1 Scanner -----------------------------------------------
async function scanPs1Games(ps1GamesPath) {
  const games = []
  if (!fs.existsSync(ps1GamesPath)) {
    return { games, count: 0, path: ps1GamesPath, error: 'Folder not found' }
  }
  const EXTS = ['.bin', '.iso', '.chd', '.cue', '.img', '.pbp', '.ecm', '.mdf']
  let entries
  try { entries = fs.readdirSync(ps1GamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  const seen = new Set()
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    // Skip .bin files that have a matching .cue (avoid duplicates)
    if (ext === '.bin') {
      const cue = path.join(ps1GamesPath, entry.name.replace(/\.bin$/i, '.cue'))
      if (fs.existsSync(cue)) continue
    }
    const baseName = entry.name.replace(/\.[^.]+$/, '')
    if (seen.has(baseName)) continue
    seen.add(baseName)
    const title = baseName.replace(/_/g, ' ').trim()
    games.push({
      id: 'ps1_' + baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
      title,
      path: path.join(ps1GamesPath, entry.name),
      emulator: 'duckstation',
      genre: 'PS1',
      system: 'PlayStation',
      status: 'Playable',
      icon: 'DS',
      artwork: null,
    })
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: ps1GamesPath }
}

module.exports = { ...module.exports, scanPs1Games }


// -- Flycast / Dreamcast Scanner ---------------------------------------------
async function scanDreamcastGames(dreamcastGamesPath) {
  const games = []
  if (!fs.existsSync(dreamcastGamesPath)) {
    return { games, count: 0, path: dreamcastGamesPath, error: 'Folder not found' }
  }
  const EXTS = ['.gdi', '.cdi', '.chd', '.lst', '.m3u']
  let entries
  try { entries = fs.readdirSync(dreamcastGamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    // GDI games often live in their own subfolder
    if (entry.isDirectory()) {
      const subPath = path.join(dreamcastGamesPath, entry.name)
      let subEntries
      try { subEntries = fs.readdirSync(subPath, { withFileTypes: true }) }
      catch (e) { continue }
      const gdi = subEntries.find(f => f.isFile() && path.extname(f.name).toLowerCase() === '.gdi')
      if (gdi) {
        games.push({
          id: 'dc_' + entry.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
          title: entry.name.replace(/_/g, ' ').trim(),
          path: path.join(subPath, gdi.name),
          emulator: 'flycast',
          genre: 'Dreamcast',
          system: 'Dreamcast',
          status: 'Playable',
          icon: 'DC',
          artwork: null,
        })
      }
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
    games.push({
      id: 'dc_' + title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
      title,
      path: path.join(dreamcastGamesPath, entry.name),
      emulator: 'flycast',
      genre: 'Dreamcast',
      system: 'Dreamcast',
      status: 'Playable',
      icon: 'DC',
      artwork: null,
    })
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: dreamcastGamesPath }
}

module.exports = { ...module.exports, scanDreamcastGames }
