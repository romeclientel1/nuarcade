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
      icon: '🎱',
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

// ── RPCS3 Game Scanner ──────────────────────────────────────────────────────
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

    // Try to read game title from PARAM.SFO (binary format — extract ASCII title)
    let title = entry.name
    const sfoPath = fs.existsSync(paramSfo) ? paramSfo : fs.existsSync(paramSfoAlt) ? paramSfoAlt : null
    if (sfoPath) {
      try {
        const buf = fs.readFileSync(sfoPath)
        // PARAM.SFO: find TITLE key — it's a UTF-8 string after the data table
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


// ── Xenia / Xbox 360 Scanner ────────────────────────────────────────────────
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
      // Folder-based game — look for default.xex inside
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
          icon: '🎮',
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
        icon: '🎮',
        artwork: null,
      })
    }
  }
  return { games, count: games.length, path: xbox360GamesPath }
}

// ── Dolphin / GameCube + Wii Scanner ────────────────────────────────────────
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
      icon: isWii ? '🎮' : '🟣',
      artwork: null,
    })
  }
  return { games, count: games.length, path: gcWiiGamesPath }
}

// ── PCSX2 / PS2 Scanner ─────────────────────────────────────────────────────
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
      icon: '💿',
      artwork: null,
    })
  }
  return { games, count: games.length, path: ps2GamesPath }
}

module.exports = { ...module.exports, scanXbox360Games, scanGCWiiGames, scanPs2Games }
