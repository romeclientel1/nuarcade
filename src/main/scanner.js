const fs = require('fs')
const path = require('path')
const { XMLParser } = require('fast-xml-parser')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
})

const GENRE_MAP = {
  'Racer':      'Racing',
  'Racing':     'Racing',
  'Fighter':    'Fighting',
  'Fighting':   'Fighting',
  'Shooter':    'Shooter',
  'Shoot':      'Shooter',
  "Shoot 'Em Up": 'Shooter',
  'Shooting':   'Shooter',
  'Rhythm':     'Rhythm',
  'Music':      'Rhythm',
  'Flying':     'Flying',
  'Sports':     'Sports',
  'Action':     'Action',
  'Platform':   'Action',
  'Puzzle':     'Puzzle',
  'Multiplayer':'Multiplayer',
  'Strategy':   'Strategy',
}

const ALLOWED_STATUS = ['Perfect', 'Great']

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
    const title     = profile.GameName || profile.Description || fileName.replace('.xml', '')
    const gamePath  = profile.GamePath || profile.ExecutablePath || ''
    const exeName   = profile.ExecutableName || profile.Executable || ''
    const status    = profile.GameStatus || profile.Status || 'Unknown'
    const genre     = normalizeGenre(profile.Genre || profile.GameType || '')
    const system    = profile.EmulationProfile || profile.System || 'Unknown'
    const isSubscription = profile.RequiresSubscription === true ||
                           profile.Patreon === true ||
                           SUBSCRIPTION_PROFILES.has(fileName)

    const exePath = gamePath ||
                    (profile.GameLocation ? path.join(profile.GameLocation, exeName) : '')

    return {
      id: fileName.replace('.xml', ''),
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
    reasons: { subscription: 0, badStatus: 0, missingFiles: 0, parseError: 0 }
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

    if (!ALLOWED_STATUS.includes(game.status)) {
      stats.hidden++
      stats.reasons.badStatus++
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

  games.sort((a, b) => {
    if (a.status === 'Perfect' && b.status !== 'Perfect') return -1
    if (a.status !== 'Perfect' && b.status === 'Perfect') return 1
    return a.title.localeCompare(b.title)
  })

  return { games, stats }
}

module.exports = { scanGames, parseProfile }