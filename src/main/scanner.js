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