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


// TeknoParrot game title lookup (filename -> proper title)
const TP_TITLES = {
  'Daytona3': 'Daytona Championship USA',
  'Daytona3NSE': 'Daytona Championship USA (NSE)',
  'DealOrNoDeal': 'Deal or No Deal',
  'DOA5': 'Dead or Alive 5',
  'DoNotFallRunforYourDrink': 'Do Not Fall: Run for Your Drink',
  'KADP': 'Knuckle Dash',
  'EnEinsPerfektewelt': 'Ein Perfektes Leben',
  'WanganMidnightMaximumTune5DX': 'Wangan Midnight Maximum Tuning 5DX',
  'WanganMidnightMaximumTune5DXPlus': 'Wangan Midnight Maximum Tuning 5DX+',
  'WanganMidnightMaximumTune6': 'Wangan Midnight Maximum Tuning 6',
  'WanganMidnightMaximumTune6RR': 'Wangan Midnight Maximum Tuning 6RR',
  'CruisnBlast': "Cruis'n Blast",
  'AliensArmageddon': 'Aliens Armageddon',
  'DariusBurst': 'Darius Burst Another Chronicle',
  'CrossbeatsRev': 'Crossbeats Rev Sunrise',
  'BlazBlueCrossTagBattle': 'BlazBlue Cross Tag Battle',
  'Tekken7': 'Tekken 7',
  'StreetFighterV': 'Street Fighter V',
  'GuiltyGearXrd': 'Guilty Gear Xrd',
  'HouseOfTheDead4': 'The House of the Dead 4',
  'HouseOfTheDead3': 'The House of the Dead 3',
  'AfterBurnerClimax': 'After Burner Climax',
  'InitialD8': 'Initial D Arcade Stage 8',
  'InitialD9': 'Initial D Arcade Stage 9',
  'MarioKartArcadeGP': 'Mario Kart Arcade GP',
  'MarioKartArcadeGP2': 'Mario Kart Arcade GP 2',
  'MarioKartArcadeGPDX': 'Mario Kart Arcade GP DX',
  'PokkenTournament': 'Pokken Tournament',
  'StarWars': 'Star Wars Battle Pod',
  'TheCrew': 'The Crew',
  'RidgeRacer': 'Ridge Racer',
  'TimecrisisRazing': 'Time Crisis: Razing Storm',
  'GunSurvivor': 'Resident Evil: Survivor',
  'VirtuaFighter5': 'Virtua Fighter 5',
  'VirtuaCop3': 'Virtua Cop 3',
  'Ringedge2': 'Ringedge 2',
  'AkaiKatanaShinNesica': 'Akai Katana Shin',
  'GaiaAttack4': 'Gaia Attack 4',
  'GalagaAssault': 'Galaga Assault',
  'GGXrd': 'Guilty Gear Xrd',
  'GGXrdAPM3': 'Guilty Gear Xrd APM3',
  'GGXrdSIGN': 'Guilty Gear Xrd SIGN',
  'GigaWingGenerations': 'Giga Wing Generations',
  'MillionArthurArcanaBlood': 'Million Arthur Arcana Blood',
  'MKDX': 'Mario Kart Arcade GP DX',
  'MKDX118': 'Mario Kart Arcade GP DX 1.18',
  'MKDXUSA': 'Mario Kart Arcade GP DX (USA)',
  'MKDXUSA106': 'Mario Kart Arcade GP DX (USA) 1.06',
  'MusicGunGun2': 'Music Gun Gun 2',
  'NFSHeatTakedown': 'Need for Speed Heat Takedown',
  'ShiningForceCross': 'Shining Force Cross',
  'ShiningForceCrossElysion': 'Shining Force Cross Elysion',
  'ShiningForceCrossRaid': 'Shining Force Cross Raid',
  'SRG': 'Super Robot Wars',
  'StarTrekVoyager': 'Star Trek Voyager',
  'StraniaTheStellaMachina': 'Strania The Stella Machina',
  'StreetFighterIII3rdStrike': 'Street Fighter III 3rd Strike',
  'EnEinsPerfektewelt': 'Ein Perfektes Leben',
  'AquapazzaAquaplusDreamMatch': 'AquaPazza Dream Match',
  'ActionDeka': 'Action Deka',
  'AfterDark2': 'After Dark 2',
  'DealOrNoDeal': 'Deal or No Deal',
  'DOA5': 'Dead or Alive 5',
  'DoNotFallRunforYourDrink': 'Do Not Fall: Run for Your Drink',
  'KADP': 'Knuckle Dash',
  'YugiohDT6U': 'Yu-Gi-Oh Duel Terminal 6',
}

const SUBSCRIPTION_PROFILES = new Set([
  'SWDC.xml', 'Wangan6R.xml', 'MK11.xml', 'DOA6.xml',
  'Tekken7.xml', 'SoulCalibur6.xml', 'GundamExVs2.xml',
  'GundamExVs2XBoost.xml', 'Persona4UA.xml', 'MVC3.xml',
])

async function parseProfile(xmlPath) {
  try {
    const raw = await require('fs').promises.readFile(xmlPath, 'utf8')
    const data = parser.parse(raw)
    const profile = data?.GameProfile || data?.UserProfile
    if (!profile) return null

    const fileName = path.basename(xmlPath)
    const fileBase = fileName.replace('.xml', '')
    const title = profile.GameName ||
                  profile['@_GameName'] ||
                  profile.Description ||
                  profile['@_Description'] ||
                  profile.GameDescription ||
                  profile['@_GameDescription'] ||
                  TP_TITLES[fileBase] ||
                  fileBase
    const gamePath       = profile.GamePath || profile['@_GamePath'] || profile.ExecutablePath || profile['@_ExecutablePath'] || ''
    const exeName        = profile.ExecutableName || profile['@_ExecutableName'] || profile.ExeName || profile['@_ExeName'] || ''
    const rawStatus      = profile.GameStatus || profile['@_GameStatus'] || profile.Status || profile['@_Status'] || 'Unknown'
    const genre          = normalizeGenre(profile.Genre || profile['@_Genre'] || profile.GameType || profile['@_GameType'] || '')
    const system         = profile.EmulationProfile || profile['@_EmulationProfile'] || profile.System || profile['@_System'] || 'Unknown'
    const year           = profile.Year || profile['@_Year'] || profile.ReleaseYear || ''
    const manufacturer   = profile.Manufacturer || profile['@_Manufacturer'] || profile.Developer || ''
    const players        = profile.MaxPlayers || profile['@_MaxPlayers'] || profile.Players || 1
    const description    = profile.Description2 || profile.Notes || ''
    const isSubscription = profile.RequiresSubscription === true ||
                           profile['@_RequiresSubscription'] === true ||
                           profile.Patreon === true ||
                           profile['@_Patreon'] === true
    const GameLocation   = profile.GameLocation || profile['@_GameLocation'] || ''

    const VALID_STATUSES = ['Perfect', 'Great', 'Playable', 'Ingame', 'Intro']
    const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'Unverified'

    const exePath = gamePath ||
      (GameLocation ? require('path').join(GameLocation, exeName) :
       profile['@_GameLocation'] ? require('path').join(profile['@_GameLocation'], exeName) : '')

    return {
      id: fileBase,
      year, manufacturer, players, description,
      profile: fileName,
      profilePath: xmlPath,
      gameLocation: GameLocation,
      title, exePath, exeName,
      status, genre, system,
      isSubscription,
      visible: false,
    }
  } catch (e) {
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

// Yield helper -- hands the event loop back for one tick so the main
// process stays responsive and Windows doesn't show "Not Responding"
const yieldToEventLoop = () => new Promise(r => setImmediate(r))

async function scanGames(teknoParrotPath, gamesFolderPath) {
  const fsP  = require('fs').promises
  const fsS  = require('fs')
  const path = require('path')

  const stats  = { total: 0, configured: 0, discovered: 0, hidden: 0 }
  const games  = []

  // --- Bail early if TP folder missing ---
  if (!teknoParrotPath || !fsS.existsSync(teknoParrotPath)) {
    return { games, stats, error: 'TeknoParrot path not found: ' + teknoParrotPath }
  }

  const userProfilesDir = path.join(teknoParrotPath, 'UserProfiles')
  const gameProfilesDir = path.join(teknoParrotPath, 'GameProfiles')
  const metadataDir     = path.join(teknoParrotPath, 'Metadata')

  // -----------------------------------------------------------------------
  // TIER 1: Read Metadata JSON files for rich game info (title, genre, desc)
  // -----------------------------------------------------------------------
  const metaMap = {}  // key = profile name (e.g. "WMMT6") -> metadata object
  if (fsS.existsSync(metadataDir)) {
    try {
      const metaFiles = fsS.readdirSync(metadataDir).filter(f => f.endsWith('.json'))
      for (const mf of metaFiles) {
        try {
          const raw  = fsS.readFileSync(path.join(metadataDir, mf), 'utf8')
          const data = JSON.parse(raw)
          const key  = path.basename(mf, '.json')
          metaMap[key] = data
        } catch (e) { /* skip bad JSON */ }
      }
    } catch (e) { /* skip if unreadable */ }
  }

  // -----------------------------------------------------------------------
  // TIER 2: Read GameProfiles XMLs for ExecutableName + GameName templates
  // -----------------------------------------------------------------------
  const profileMap = {}  // key = profile name -> { gameName, executableName, executableName2 }
  if (fsS.existsSync(gameProfilesDir)) {
    try {
      const profileFiles = fsS.readdirSync(gameProfilesDir).filter(f => f.toLowerCase().endsWith('.xml'))
      for (const pf of profileFiles) {
        try {
          const raw     = fsS.readFileSync(path.join(gameProfilesDir, pf), 'utf8')
          const parsed  = parser.parse(raw)
          const profile = parsed?.GameProfile || {}
          const key     = path.basename(pf, '.xml')
          profileMap[key] = {
            gameName:         profile.GameName         || key,
            executableName:   String(profile.ExecutableName  || ''),
            executableName2:  String(profile.ExecutableName2 || ''),
            emulatorType:     profile.EmulatorType     || 'TeknoParrot',
          }
        } catch (e) { /* skip bad XML */ }
      }
    } catch (e) { /* skip if unreadable */ }
  }

  // -----------------------------------------------------------------------
  // TIER 3: Read UserProfiles XMLs -- these have GamePath set by the user
  // -----------------------------------------------------------------------
  const configuredKeys = new Set()
  if (fsS.existsSync(userProfilesDir)) {
    try {
      const userFiles = fsS.readdirSync(userProfilesDir).filter(f => f.toLowerCase().endsWith('.xml'))
      stats.total = userFiles.length

      for (const uf of userFiles) {
        try {
          const raw      = fsS.readFileSync(path.join(userProfilesDir, uf), 'utf8')
          const parsed   = parser.parse(raw)
          const profile  = parsed?.GameProfile || {}
          const key      = path.basename(uf, '.xml')
          const gamePath = profile.GamePath || ''
          const gameName = profile.GameName || profileMap[key]?.gameName || key

          // Get metadata enrichment
          const meta  = metaMap[key] || {}
          const genre = GENRE_MAP[meta.Genre || ''] || meta.Genre || 'Arcade'

          configuredKeys.add(key)

          // Game is "configured" if GamePath is set and the exe exists
          const exeExists = gamePath && fsS.existsSync(gamePath)

          const game = {
            id:          key,
            title:       gameName,
            system:      'TeknoParrot',
            genre,
            gamePath,
            configured:  !!gamePath,
            exeFound:    exeExists,
            status:      exeExists ? 'ready' : (gamePath ? 'path-missing' : 'not-configured'),
            profilePath: path.join(userProfilesDir, uf),
            iconPath:    profile.IconName ? path.join(teknoParrotPath, profile.IconName) : null,
          }

          if (exeExists) {
            stats.configured++
            games.push(game)
          } else if (gamePath) {
            // Has path set but exe not found -- still show, user may have moved files
            stats.hidden++
            game.warning = 'Exe not found at: ' + gamePath
            games.push(game)
          }
          // If no GamePath at all -- skip (not yet configured in TP)
        } catch (e) { /* skip bad XML */ }
      }
    } catch (e) {
      return { games, stats, error: 'Error reading UserProfiles: ' + e.message }
    }
  }

  // -----------------------------------------------------------------------
  // DISCOVERY: Scan gamesFolderPath for unconfigured games
  // Match against GameProfiles ExecutableName by recursively finding exe files
  // -----------------------------------------------------------------------
  if (gamesFolderPath && fsS.existsSync(gamesFolderPath)) {
    // Build a reverse lookup: executableName -> profileKey
    const exeLookup = {}
    for (const [key, p] of Object.entries(profileMap)) {
      if (configuredKeys.has(key)) continue // already in UserProfiles
      if (p.executableName && typeof p.executableName === 'string') {
        exeLookup[p.executableName.toLowerCase()] = key
      }
      if (p.executableName2 && typeof p.executableName2 === 'string') {
        exeLookup[p.executableName2.toLowerCase()] = key
      }
    }

    // Walk gamesFolderPath up to 3 levels deep looking for matching exes
    const walkDir = (dir, depth) => {
      if (depth > 3) return
      let entries
      try { entries = fsS.readdirSync(dir, { withFileTypes: true }) } catch (e) { return }
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walkDir(fullPath, depth + 1)
        } else if (entry.name.toLowerCase().endsWith('.exe')) {
          const exeName = entry.name.toLowerCase()
          const matchedKey = exeLookup[exeName]
          if (matchedKey && !configuredKeys.has(matchedKey)) {
            const p    = profileMap[matchedKey] || {}
            const meta = metaMap[matchedKey]    || {}
            const genre = GENRE_MAP[meta.Genre || ''] || meta.Genre || 'Arcade'
            games.push({
              id:          matchedKey,
              title:       p.gameName || matchedKey,
              system:      'TeknoParrot',
              genre,
              gamePath:    fullPath,
              configured:  false,
              exeFound:    true,
              status:      'discovered',
              warning:     'Found on disk but not yet configured in TeknoParrot. Open TeknoParrot and add this game to set it up.',
            })
            configuredKeys.add(matchedKey) // don't add duplicates
            stats.discovered++
          }
        }
      }
    }
    walkDir(gamesFolderPath, 0)
  }

  stats.total = games.length
  console.log('[scanGames] configured:', stats.configured, 'discovered:', stats.discovered, 'path-missing:', stats.hidden)
  return { games, stats }
}


module.exports = { scanGames, parseProfile }

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


// -- MAME ROM title lookup map -----------------------------------------------
// Maps romset name -> friendly display title for the most common arcade ROMs
const MAME_TITLES = {
  '1942': '1942', '1943': '1943', '1944': '1944',
  'aburner': 'After Burner', 'aburner2': 'After Burner II',
  'aliens': 'Aliens', 'altbeast': 'Altered Beast',
  'area51': 'Area 51', 'area51mx': 'Area 51: Maximum Force',
  'arkanoid': 'Arkanoid', 'armora': 'Armor Attack',
  'asterix': 'Asterix', 'asteroids': 'Asteroids', 'astdelux': 'Asteroids Deluxe',
  'atetris': 'Tetris (Atari)', 'avsp': 'Alien vs. Predator',
  'badlands': 'Bad Lands', 'bagman': 'Bagman',
  'bankp': 'Bank Panic', 'berzerk': 'Berzerk',
  'blktiger': 'Black Tiger', 'blazstar': 'Blazing Star',
  'bsktball': 'Basketball', 'bublbobl': 'Bubble Bobble',
  'buckrog': 'Buck Rogers', 'burgertime': 'BurgerTime',
  'captcomm': 'Captain Commando', 'carnevil': 'CarnEvil',
  'centiped': 'Centipede', 'centiped2': 'Centipede (rev 2)',
  'chplft': 'Choplifter', 'ckongg': 'Crazy Kong',
  'clayfighter': 'ClayFighter', 'cloak': 'Cloak and Dagger',
  'cmania': 'Cosmo Mania', 'congo': 'Congo Bongo',
  'contra': 'Contra', 'contrab': 'Contra (bootleg)',
  'crystalg': 'Crystal Castles', 'cybots': 'Cyberbots',
  'darius': 'Darius', 'darius2': 'Darius II',
  'darkseal': 'Dark Seal', 'darkwing': 'Darkwing Duck',
  'dbz': 'Dragon Ball Z', 'dbz2': 'Dragon Ball Z 2',
  'ddribble': 'Double Dribble', 'defender': 'Defender',
  'dino': 'Cadillacs and Dinosaurs', 'dippy': 'Dippy Tomato',
  'dk': 'Donkey Kong', 'dkong': 'Donkey Kong',
  'dkjr': 'Donkey Kong Jr.', 'dkjunior': 'Donkey Kong Junior',
  'dkong3': 'Donkey Kong 3',
  'dkongx': 'Donkey Kong (hack)', 'dkongx11': 'Donkey Kong (hack)',
  'donpachi': 'DonPachi', 'dodonpachi': 'DoDonPachi',
  // Modern arcade / NESiCA / rhythm games
  'mamt6': 'Wangan Midnight Maximum Tuning 6',
  'mamt6r': 'Wangan Midnight Maximum Tuning 6R',
  'mamt6rr': 'Wangan Midnight Maximum Tuning 6RR',
  'wmmt5': 'Wangan Midnight Maximum Tuning 5',
  'wmmt5dx': 'Wangan Midnight Maximum Tuning 5DX',
  'wmmt5dxp': 'Wangan Midnight Maximum Tuning 5DX+',
  'fnfsb': 'Fast and Furious: Drift',
  'fnfsb2': 'Fast and Furious: SuperCars',
  'fnfsc': 'Fast and Furious: SuperCars',
  'fr': 'Fast and Furious',
  'frenzyexpress': 'Frenzy Express',
  'exceptionnesica': 'Exception NESiCA',
  'farcryparadiselost': 'Far Cry Paradise Lost',
  'bbtag': 'BlazBlue Cross Tag Battle',
  'bbcf': 'BlazBlue Central Fiction',
  'sfvae': 'Street Fighter V Arcade Edition',
  'tekken7': 'Tekken 7',
  'tekken7fr': 'Tekken 7 Fated Retribution',
  'ggxrd': 'Guilty Gear Xrd',
  'ggxrdr': 'Guilty Gear Xrd Revelator',
  'ggst': 'Guilty Gear Strive',
  'dariusburst': 'Darius Burst',
  'crossbeats': 'Crossbeats Rev',
  'groovecoaster': 'Groove Coaster',
  'ddr': 'Dance Dance Revolution',
  'iidx': 'Beatmania IIDX',
  'sdvx': 'Sound Voltex',
  'taiko': 'Taiko no Tatsujin',
  'divaac': 'Hatsune Miku Project DIVA Arcade',
  // NESiCA titles from user library
  'akaikatanashinnesica': 'Akai Katana Shin',
  'akaikatanashin': 'Akai Katana Shin',
  'akuma': 'Akuma',
  'aaa': 'Atomic Ace',
  'actiondeka': 'Action Deka',
  'afterdark2': 'After Dark 2',
  'aquapazzaaquaplusdreammatch': 'AquaPazza Dream Match',
  'aquapazza': 'AquaPazza',
  'daytona3': 'Daytona Championship USA',
  'daytona3nse': 'Daytona Championship USA (NSE)',
  'dealornodeal': 'Deal or No Deal',
  'doa5': 'Dead or Alive 5',
  'donotfallrunforyourdrink': 'Do Not Fall: Run for Your Drink',
  'kadp': 'Knuckle Dash',
  'gaiaattack4': 'Gaia Attack 4',
  'galagaassault': 'Galaga Assault',
  'gg': 'Guilty Gear',
  'ggxrdapm3': 'Guilty Gear Xrd APM3',
  'ggxrdsign': 'Guilty Gear Xrd SIGN',
  'gigawingsgenerations': 'Giga Wing Generations',
  'gigawings': 'Giga Wing Generations',
  'millionarthurarcanaBlood': 'Million Arthur Arcana Blood',
  'millionarthurarcana': 'Million Arthur Arcana Blood',
  'mkdx': 'Mario Kart DX',
  'mkdx118': 'Mario Kart DX 1.18',
  'mkdxusa': 'Mario Kart Arcade GP DX',
  'mkdxusa106': 'Mario Kart Arcade GP DX 1.06',
  'musicgungun2': 'Music Gun Gun 2',
  'nfsheatetakedown': 'Need for Speed Heat Takedown',
  'nfsheattakedown': 'Need for Speed Heat Takedown',
  'shiningforcecross': 'Shining Force Cross',
  'shiningforcecrosselysion': 'Shining Force Cross Elysion',
  'shiningforcecrossraid': 'Shining Force Cross Raid',
  'srg': 'Super Robot Wars',
  'startrekvoyager': 'Star Trek Voyager',
  'straniathestellamachina': 'Strania The Stella Machina',
  'streetfighteriii3rdstrike': 'Street Fighter III 3rd Strike',
  'sf33rdstrike': 'Street Fighter III 3rd Strike',
  'eneinsperfektewelt': 'Ein Perfektes Leben',
  'yugiohdt6u': 'Yu-Gi-Oh Duel Terminal 6',
  'yugioh': 'Yu-Gi-Oh',
  'farcryparadiselost': 'Far Cry Paradise Lost',
  'fnfsd': 'Fast and Furious: Drift',
  'frenzyexpress': 'Frenzy Express',
  'exception': 'Exception',
  'bladestrangers': 'Blade Strangers',
  'dengeki': 'Dengeki Bunko Fighting Climax',
  'gunslinger': 'Gunslinger Stratos',
  'gunslinger2': 'Gunslinger Stratos 2',
  'gunslinger3': 'Gunslinger Stratos 3',
  'lord': 'Lord of Vermilion',
  'p4u': 'Persona 4 Arena',
  'p4u2': 'Persona 4 Arena Ultimax',
  'chaos': 'Chaos Code',
  'kof13': 'King of Fighters XIII',
  'kof14': 'King of Fighters XIV',
  'kof15': 'King of Fighters XV',
  'under night': 'Under Night In-Birth',
  'unib': 'Under Night In-Birth',
  'uniclr': 'Under Night In-Birth EXE Late ClR',
  'marvelvscapcom': 'Marvel vs. Capcom',
  'mvc3': 'Marvel vs. Capcom 3',
  'umvc3': 'Ultimate Marvel vs. Capcom 3',
  'dragonballfz': 'Dragon Ball FighterZ',
  'dbfz': 'Dragon Ball FighterZ',
  'granblue': 'Granblue Fantasy Versus',
  'gbvs': 'Granblue Fantasy Versus',
  'samuraishodown': 'Samurai Shodown',
  'samsho': 'Samurai Shodown',
  'skullgirls': 'Skullgirls',
  'dissidia': 'Dissidia Final Fantasy NT',
  'doomarch': 'Doom (arcade)', 'doubldragon': 'Double Dragon',
  'ddragon': 'Double Dragon', 'ddragon2': 'Double Dragon II',
  'ddragon3': 'Double Dragon 3',
  'drgnbowl': 'Dragon Bowl', 'dungeonm': 'Dungeons and Dragons',
  'ddsom': 'D&D: Shadow over Mystara', 'ddtod': 'D&D: Tower of Doom',
  'dynwar': 'Dynasty Wars', 'elevator': 'Elevator Action',
  'elvira': 'Elvira and the Party Monsters',
  'emeralda': 'Emeralda', 'esb': 'Empire Strikes Back',
  'excitebk': 'Excite Bike', 'exerion': 'Exerion',
  'ferarri': 'Ferrari F355', 'ffight': 'Final Fight',
  'ffight2': 'Final Fight 2', 'ffighta': 'Final Fight (alt)',
  'finalbur': 'Final Burn', 'finalfght': 'Final Fight',
  'frogger': 'Frogger', 'froggera': 'Frogger (alt)',
  'frontline': 'Front Line', 'funkybee': 'Funky Bee',
  'gaaga': 'Gaaga', 'gaiden': 'Shadow of the Ninja',
  'galaga': 'Galaga', 'galagao': 'Galaga (old version)',
  'galaxian': 'Galaxian', 'galmidws': 'Galaga Midway',
  'gauntlet': 'Gauntlet', 'gaunt2': 'Gauntlet II',
  'gaunt2p': 'Gauntlet II (2-player)',
  'gberet': 'Green Beret', 'gbusters': 'Ghostbusters',
  'gemini': 'Gemini Wing', 'ghouls': 'Ghouls n Ghosts',
  'ghosts': 'Ghosts n Goblins', 'gng': 'Ghosts n Goblins',
  'goldnaxe': 'Golden Axe', 'goldnax2': 'Golden Axe II',
  'goldnax3': 'Golden Axe III',
  'gotcha': 'Gotcha', 'gradius': 'Gradius',
  'gradius2': 'Gradius II', 'gradius3': 'Gradius III',
  'gravitar': 'Gravitar', 'grdiusb': 'Gradius (bootleg)',
  'grobda': 'Grobda', 'gsword': 'Gold Silver',
  'gunbird': 'Gunbird', 'gunbird2': 'Gunbird 2',
  'gunfight': 'Gun Fight', 'gunsmoke': 'Gun.Smoke',
  'harddriv': 'Hard Drivin', 'harddrivb': 'Hard Drivin (bootleg)',
  'hatris': 'Hatris', 'hcastle': 'Haunted Castle',
  'higemaru': 'Pirate Ship Higemaru',
  'hopmappy': 'Hopping Mappy', 'hpuncher': 'Hyper Puncher',
  'hyperspt': 'Hyper Sports', 'ikari': 'Ikari Warriors',
  'ikari2': 'Victory Road', 'ikari3': 'Ikari III',
  'imsorry': "I'm Sorry", 'invaders': 'Space Invaders',
  'invadpt2': 'Space Invaders Part II',
  'ironclad': 'Iron Clad', 'jackal': 'Jackal',
  'jchan': 'Jackie Chan', 'jedi': 'Return of the Jedi',
  'joyfulr': 'Joyful Road', 'joust': 'Joust',
  'joust2': 'Joust 2', 'jungler': 'Jungler',
  'junofrst': 'Juno First', 'jurassicpark': 'Jurassic Park',
  'kangaroo': 'Kangaroo', 'kchamp': 'Karate Champ',
  'kinst': 'Killer Instinct', 'kinst2': 'Killer Instinct 2',
  'klax': 'Klax', 'knightsb': 'Knights of the Round (bootleg)',
  'knights': 'Knights of the Round',
  'kof94': 'King of Fighters 94', 'kof95': 'King of Fighters 95',
  'kof96': 'King of Fighters 96', 'kof97': 'King of Fighters 97',
  'kof98': 'King of Fighters 98', 'kof99': 'King of Fighters 99',
  'kof2000': 'King of Fighters 2000', 'kof2001': 'King of Fighters 2001',
  'kof2002': 'King of Fighters 2002', 'kof2003': 'King of Fighters 2003',
  'konamigt': 'Konami GT', 'kontest': 'Konami Test',
  'kungfum': 'Kung-Fu Master', 'ladybug': 'Lady Bug',
  'lasso': 'Lasso', 'lazarian': 'Lazarian',
  'lkage': 'Legend of Kage', 'llander': 'Lunar Lander',
  'locomotn': 'Loco-Motion', 'lresort': 'Last Resort',
  'luna': 'Luna Rescue', 'lwings': 'Legendary Wings',
  'm4': 'M-4', 'mappy': 'Mappy',
  'marble': 'Marble Madness', 'mario': 'Mario Bros.',
  'mariob': 'Mario Bros. (bootleg)', 'marvins': "Marvin's Maze",
  'matmania': 'Mat Mania', 'maxrpm': 'Max RPM',
  'maze': 'Amazing Maze', 'mc': 'Multi Champ',
  'mhavoc': 'Major Havoc', 'midres': 'Middle Earth',
  'millipede': 'Millipede', 'minvaders': 'Mini Invaders',
  'missile': 'Missile Command', 'mk': 'Mortal Kombat',
  'mk2': 'Mortal Kombat II', 'mk3': 'Mortal Kombat 3',
  'mk4': 'Mortal Kombat 4', 'umk3': 'Ultimate Mortal Kombat 3',
  'mkla4': 'Mortal Kombat (LA4)', 'mkr4': 'Mortal Kombat (R4)',
  'montecar': 'Monte Carlo', 'mooncrst': 'Moon Cresta',
  'moonwalk': 'Michael Jacksons Moonwalker',
  'mjw': "Michael Jackson's Moonwalker",
  'mpatrol': 'Moon Patrol', 'mrdo': "Mr. Do!",
  'mrfibble': 'Mr. Fibble', 'mrjong': 'Mr. Jong',
  'mrkougar': 'Mr. Kougar', 'mtrap': 'Mouse Trap',
  'mvc': 'Marvel vs. Capcom', 'mvc2': 'Marvel vs. Capcom 2',
  'mvsc': 'Marvel Super Heroes vs. Street Fighter',
  'msh': 'Marvel Super Heroes', 'msheroe': 'Marvel Super Heroes',
  'mslug': 'Metal Slug', 'mslug2': 'Metal Slug 2',
  'mslug3': 'Metal Slug 3', 'mslug4': 'Metal Slug 4',
  'mslug5': 'Metal Slug 5', 'mslugx': 'Metal Slug X',
  'mtrap4': 'Mouse Trap (4 players)',
  'nba': 'NBA Jam', 'nbajam': 'NBA Jam',
  'nbajamte': 'NBA Jam Tournament Edition',
  'nfl': 'NFL Blitz', 'nflblitz': 'NFL Blitz',
  'nflblitz99': 'NFL Blitz 99', 'nflblitz2k': 'NFL Blitz 2000',
  'nhlhock': 'NHL Open Ice', 'ninja': 'The Ninja Warriors',
  'ninjaw': 'The Ninja Warriors', 'nrallyx': 'New Rally-X',
  'ns': 'Ninja Spirit', 'off road': 'Ivan Ironman Stewart Off Road',
  'offroad': "Ivan 'Ironman' Stewart's Super Off Road",
  'opwolf': 'Operation Wolf', 'opthund': 'Operation Thunderbolt',
  'othunder': 'Operation Thunderbolt',
  'outrun': 'Out Run', 'outrunb': 'Out Run (bootleg)',
  'pac2600': 'Pac-Man (Atari 2600)', 'pacland': 'Pac-Land',
  'pacman': 'Pac-Man', 'pacmane': 'Pac-Man (European)',
  'pacmania': 'Pac-Mania', 'pacmanp': 'Pac-Man Plus',
  'pacmanx': 'Pac-Man (modified)', 'pang': 'Pang',
  'pang3': 'Pang! 3', 'pangb': 'Pang (bootleg)',
  'paperboy': 'Paperboy', 'paperboy2': 'Paperboy 2',
  'pengo': 'Pengo', 'phoenix': 'Phoenix',
  'pitfall2': 'Pitfall II', 'pleiads': 'Pleiads',
  'popeye': 'Popeye', 'popeye2': 'Popeye (set 2)',
  'pooyan': 'Pooyan', 'popeye3': 'Popeye (set 3)',
  'prehisle': 'Prehistoric Isle', 'progear': 'Progear',
  'punchout': 'Punch-Out!!', 'punkshot': 'Punk Shot',
  'pzyxelb': 'P.O.W.', 'pow': 'P.O.W.',
  'qbert': 'Q*bert', 'qbertqub': "Q*bert's Qubes",
  'quantum': 'Quantum', 'racedriv': 'Race Drivin',
  'rallyx': 'Rally-X', 'rampage': 'Rampage',
  'rampage2': 'Rampage: World Tour',
  'ramprt': 'Rampart', 'rastan': 'Rastan',
  'rbisland': 'Rainbow Islands', 'renegade': 'Renegade',
  'rescraid': 'Rescue Raid', 'revolution': 'Revolution X',
  'roadblst': 'Road Blasters', 'roadrunn': 'Road Runner',
  'robotron': 'Robotron: 2084', 'robocopp': 'RoboCop',
  'robocop': 'RoboCop', 'rocknrope': 'Rock n Rope',
  'rollerg': 'Rollergames', 'rompers': 'Rompers',
  'rthunder': 'Rolling Thunder', 'rthunder2': 'Rolling Thunder 2',
  'rungun': 'Run and Gun', 'rygar': 'Rygar',
  's1945': 'Strikers 1945', 's1945ii': 'Strikers 1945 II',
  'safarir': 'Safari Rally', 'samshoa': 'Samurai Shodown',
  'samsho': 'Samurai Shodown', 'samsho2': 'Samurai Shodown II',
  'samsho3': 'Samurai Shodown III', 'samsho4': 'Samurai Shodown IV',
  'samsho5': 'Samurai Shodown V',
  'sasuke': 'Sasuke vs. Commander', 'savgtri': 'Savage Triumph',
  'scobra': 'Super Cobra', 'scramble': 'Scramble',
  'seawolf': 'Sea Wolf', 'seawolf2': 'Sea Wolf II',
  'sfa': 'Street Fighter Alpha', 'sfa2': 'Street Fighter Alpha 2',
  'sfa3': 'Street Fighter Alpha 3',
  'sf2': 'Street Fighter II', 'sf2ce': 'Street Fighter II CE',
  'sf2hf': 'Street Fighter II HF', 'sf2koryu': 'Street Fighter II (Koryu)',
  'sf2t': 'Super Street Fighter II Turbo',
  'sf3': 'Street Fighter III', 'sf3a': 'Street Fighter III: New Gen',
  'sf3ng': 'Street Fighter III: New Generation',
  'sf3_2i': 'Street Fighter III: 2nd Impact',
  'sf3_3s': 'Street Fighter III: 3rd Strike',
  'sk2': 'Skullmonkeys 2', 'skullmon': 'Skullmonkeys',
  'slammast': 'Saturday Night Slam Masters',
  'smb': 'Super Mario Bros.', 'smgp': 'Super Monaco GP',
  'sms': 'Sprint Master', 'snafu': 'Snafu',
  'sndw': 'Sand Wars', 'snowbros': 'Snow Bros.',
  'solarfox': 'Solar Fox', 'solitaire': 'Solitaire',
  'spacduel': 'Space Duel', 'spacefb': 'Space Firebird',
  'spacegun': 'Space Gun', 'spaceinv': 'Space Invaders',
  'spcinvpt': 'Space Invaders Part II',
  'spelunk2': 'Spelunker II', 'spelunkr': 'Spelunker',
  'spf2t': 'Super Puzzle Fighter II Turbo',
  'sprint2': 'Sprint 2', 'sprint4': 'Sprint 4',
  'sprint8': 'Sprint 8', 'spy': 'Spy Hunter',
  'spyhunt': 'Spy Hunter', 'spyhunt2': 'Spy Hunter II',
  'ssf2': 'Super Street Fighter II', 'ssf2t': 'Super Street Fighter II Turbo',
  'ssf2xj': 'Super Street Fighter II Turbo (Japan)',
  'ssjester': 'Space Jester', 'sstrangr': 'Space Stranger',
  'starforc': 'Star Force', 'starcas': 'Star Castle',
  'stargate': 'Stargate', 'starlion': 'Star Lion',
  'stars': 'Stars', 'starwars': 'Star Wars',
  'strider': 'Strider', 'strider2': 'Strider 2',
  'stun': 'S.T.U.N. Runner', 'stunrun': 'S.T.U.N. Runner',
  'sunrider': 'Sun Rider', 'supbtime': 'Bucky OHare',
  'superpac': 'Super Pac-Man', 'suprmrio': 'Super Mario Bros.',
  'suprmriob': 'Super Mario Bros. (bootleg)',
  'superqix': 'Super Qix', 'suprstar': 'Super Star',
  'supertnk': 'Super Tank', 'supnudge': 'Super Nudge',
  'syvalion': 'Syvalion', 'tactcian': 'Tactician',
  'tailg': 'Tail Gunner', 'tapper': 'Tapper',
  'tempest': 'Tempest', 'tempest2': 'Tempest 2000',
  'terracre': 'Terra Cresta', 'terracresta': 'Terra Cresta',
  'thepit': 'The Pit', 'timeplt': 'Time Pilot',
  'timeplt84': 'Time Pilot 84', 'topgun': 'Top Gun',
  'topracer': 'Top Racer', 'topsecrt': 'Top Secret',
  'trog': 'Trog', 'trojan': 'Trojan',
  'tron': 'Tron', 'trondeadl': 'Tron Deadly Discs',
  'tumblep': 'Tumble Pop', 'tunnel': 'Tunnel Hunt',
  'turbo': 'Turbo', 'turtles': 'Turtles',
  'twinbee': 'TwinBee', 'twinbee2': 'TwinBee 2',
  'twincobr': 'Twin Cobra', 'twotigre': 'Two Tigers',
  'uf': 'Unknown Fighter', 'ultinvad': 'Ultimate Invaders',
  'uns': 'Unknown Shooter', 'uopoko': 'Uo Poko',
  'usclssic': 'US Classic',
  'vanguard': 'Vanguard', 'varth': 'Varth',
  'vball': 'USA Volleyball', 'vcop': 'Virtua Cop',
  'vcop2': 'Virtua Cop 2',
  'vendor': 'Vendor', 'venturer': 'Venture',
  'venture': 'Venture', 'vhunt2': 'Vampire Hunter 2',
  'vsav': 'Vampire Savior', 'vsav2': 'Vampire Savior 2',
  'vstriker': 'Virtua Striker', 'vstriker2': 'Virtua Striker 2',
  'warlord': 'Warlord', 'warlords': 'Warlords',
  'wc90': 'World Cup 90', 'wc90b': 'World Cup 90 (bootleg)',
  'wc90t': 'World Cup 90 Taito',
  'wbml': 'Wrestle Ball', 'wcbowl': 'World Class Bowling',
  'wgp': 'World Grand Prix', 'wilytowr': 'Wily Tower',
  'wimbledon': 'Wimbledon', 'wmatch': 'World Match',
  'wof': 'Warriors of Fate', 'wofb': 'Warriors of Fate (bootleg)',
  'woodpeck': 'Woody Woodpecker', 'wow': 'Wizard of Wor',
  'xain': 'Xain d Sleena', 'xevious': 'Xevious',
  'xevs': 'Xevious Resurrection', 'xmcota': 'X-Men: CotA',
  'xmen': 'X-Men', 'xmen6p': 'X-Men (6-player)',
  'xmvsf': 'X-Men vs. Street Fighter', 'xybots': 'Xybots',
  'xyonix': 'Xyonix', 'zaxxon': 'Zaxxon',
  'zerotime': 'Zero Time', 'zoar': 'Zoar',
  'zombraid': 'Zombie Raid', 'zookeep': 'Zoo Keeper',
}

function mameTitle(romName) {
  const lower = romName.toLowerCase()
  if (MAME_TITLES[lower]) return MAME_TITLES[lower]
  // Strip trailing version suffixes like 'sf2hf' -> try 'sf2'
  const stripped = lower.replace(/[a-z]$/, '')
  if (MAME_TITLES[stripped]) return MAME_TITLES[stripped]
  // Try stripping numbers too: 'dkong3' -> 'dkong'
  const noNum = lower.replace(/[0-9]+[a-z]*$/, '')
  if (MAME_TITLES[noNum]) return MAME_TITLES[noNum]
  // Smart fallback: split camelCase/underscores and capitalize words
  // e.g. "galaga88" -> "Galaga 88", "mspacman" -> "Ms Pac-Man"
  const cleaned = romName
    .replace(/_/g, ' ')
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-z])/g, '$1 $2')
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

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

  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && i % 50 === 0) await yieldToEventLoop()
    const entry = entries[i]
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const romName = entry.name.replace(/\.[^.]+$/, '')
    const title = mameTitle(romName)
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



// -- RetroArch Scanner (folder-per-system, show only populated systems) ------

const RA_SYSTEM_MAP = {
  // Nintendo
  'nes':          { label: 'NES',               genre: 'Platformer', icon: 'NES', exts: ['.nes','.fds','.unf','.unif'] },
  'snes':         { label: 'SNES',              genre: 'Platformer', icon: 'SNS', exts: ['.sfc','.smc','.swc'] },
  'n64':          { label: 'Nintendo 64',        genre: 'Platformer', icon: 'N64', exts: ['.n64','.z64','.v64','.ndd'] },
  'gba':          { label: 'Game Boy Advance',   genre: 'Platformer', icon: 'GBA', exts: ['.gba','.agb'] },
  'gbc':          { label: 'Game Boy Color',     genre: 'Platformer', icon: 'GBC', exts: ['.gbc','.gb'] },
  'gb':           { label: 'Game Boy',           genre: 'Platformer', icon: 'GBY', exts: ['.gb','.gbc'] },
  'nds':          { label: 'Nintendo DS',        genre: 'Platformer', icon: 'NDS', exts: ['.nds','.dsi'] },
  'virtualboy':   { label: 'Virtual Boy',        genre: 'Platformer', icon: 'VBY', exts: ['.vb','.vboy'] },
  'gamecube':     { label: 'GameCube',           genre: 'Platformer', icon: 'GCN', exts: ['.iso','.gcm','.rvz','.wbfs'] },
  'wii':          { label: 'Wii',                genre: 'Platformer', icon: 'WII', exts: ['.iso','.wbfs','.rvz','.wad'] },
  // Sega
  'genesis':      { label: 'Sega Genesis',       genre: 'Platformer', icon: 'GEN', exts: ['.md','.gen','.bin','.smd'] },
  'megadrive':    { label: 'Sega Genesis',       genre: 'Platformer', icon: 'GEN', exts: ['.md','.gen','.bin','.smd'] },
  'mastersystem': { label: 'Master System',      genre: 'Platformer', icon: 'SMS', exts: ['.sms','.sg'] },
  'gamegear':     { label: 'Game Gear',          genre: 'Platformer', icon: 'GGR', exts: ['.gg'] },
  'saturn':       { label: 'Sega Saturn',        genre: 'Fighting',   icon: 'SAT', exts: ['.iso','.cue','.bin','.chd'] },
  'segacd':       { label: 'Sega CD',            genre: 'Platformer', icon: 'SCD', exts: ['.iso','.cue','.bin','.chd'] },
  'sega32x':      { label: 'Sega 32X',           genre: 'Platformer', icon: '32X', exts: ['.32x','.bin'] },
  // Sony
  'psx':          { label: 'PlayStation 1',      genre: 'Action',     icon: 'PS1', exts: ['.iso','.cue','.bin','.chd','.pbp'] },
  'ps1':          { label: 'PlayStation 1',      genre: 'Action',     icon: 'PS1', exts: ['.iso','.cue','.bin','.chd','.pbp'] },
  'psp':          { label: 'PSP',                genre: 'Action',     icon: 'PSP', exts: ['.iso','.cso','.pbp'] },
  // Atari
  'atari2600':    { label: 'Atari 2600',         genre: 'Classic',    icon: 'AT2', exts: ['.a26','.bin','.rom'] },
  'atari7800':    { label: 'Atari 7800',         genre: 'Classic',    icon: 'AT7', exts: ['.a78','.bin'] },
  'atarijaguar':  { label: 'Atari Jaguar',       genre: 'Action',     icon: 'JAG', exts: ['.j64','.jag','.rom'] },
  'atarilynx':    { label: 'Atari Lynx',         genre: 'Platformer', icon: 'LYX', exts: ['.lnx','.o'] },
  // NEC
  'pcengine':     { label: 'PC Engine',          genre: 'Platformer', icon: 'PCE', exts: ['.pce','.cue','.bin','.chd'] },
  'pce':          { label: 'PC Engine',          genre: 'Platformer', icon: 'PCE', exts: ['.pce','.cue','.bin','.chd'] },
  // SNK
  'neogeo':       { label: 'Neo Geo',            genre: 'Fighting',   icon: 'NEO', exts: ['.neo','.zip','.7z'] },
  'neogeopocket': { label: 'Neo Geo Pocket',     genre: 'Fighting',   icon: 'NGP', exts: ['.ngp','.ngc'] },
  // Arcade
  'mame':         { label: 'MAME',               genre: 'Classic',    icon: 'ARC', exts: ['.zip','.7z','.chd'] },
  'fba':          { label: 'Final Burn Alpha',   genre: 'Fighting',   icon: 'FBA', exts: ['.zip','.7z'] },
  // Other
  'arcade':       { label: 'Arcade',             genre: 'Classic',    icon: 'ARC', exts: ['.zip','.7z','.chd'] },
  'dos':          { label: 'DOS',                genre: 'Classic',    icon: 'DOS', exts: ['.exe','.com','.bat'] },
  'scummvm':      { label: 'ScummVM',            genre: 'Adventure',  icon: 'SCM', exts: ['.scummvm'] },
  'amstradcpc':   { label: 'Amstrad CPC',        genre: 'Classic',    icon: 'CPC', exts: ['.dsk','.cdt'] },
  'zxspectrum':   { label: 'ZX Spectrum',        genre: 'Classic',    icon: 'ZXS', exts: ['.tap','.tzx','.z80','.sna'] },
  'c64':          { label: 'Commodore 64',       genre: 'Classic',    icon: 'C64', exts: ['.d64','.t64','.prg','.crt'] },
  'amiga':        { label: 'Amiga',              genre: 'Classic',    icon: 'AMG', exts: ['.adf','.hdf','.lha'] },
  'vectrex':      { label: 'Vectrex',            genre: 'Classic',    icon: 'VEC', exts: ['.vec','.bin'] },
  'wonderswan':   { label: 'WonderSwan',         genre: 'Platformer', icon: 'WSW', exts: ['.ws','.wsc'] },
}

const RA_ROM_EXTS = new Set([
  '.nes','.fds','.sfc','.smc','.n64','.z64','.v64','.gba','.agb',
  '.gbc','.gb','.nds','.iso','.gcm','.rvz','.wbfs','.wad','.md',
  '.gen','.bin','.smd','.sms','.sg','.gg','.cue','.chd','.pbp',
  '.a26','.a78','.j64','.jag','.lnx','.pce','.neo','.ngp','.ngc',
  '.zip','.7z','.exe','.com','.bat','.scummvm','.dsk','.cdt',
  '.tap','.tzx','.z80','.sna','.d64','.t64','.prg','.crt',
  '.adf','.hdf','.lha','.vec','.ws','.wsc','.32x','.vb','.vboy',
  '.dsi','.cso',
])

async function scanRetroArchGames(retroarchGamesPath) {
  const games = []
  if (!fs.existsSync(retroarchGamesPath)) {
    return { games, count: 0, path: retroarchGamesPath, error: 'Folder not found' }
  }

  let entries = []
  try { entries = fs.readdirSync(retroarchGamesPath, { withFileTypes: true }) } catch (e) {
    return { games, count: 0, path: retroarchGamesPath, error: e.message }
  }

  // Walk each subfolder as a system
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const folderKey = entry.name.toLowerCase()
    const systemInfo = RA_SYSTEM_MAP[folderKey]
    const systemLabel = systemInfo ? systemInfo.label : entry.name
    const genre = systemInfo ? systemInfo.genre : 'Classic'
    const icon = systemInfo ? systemInfo.icon : 'RTR'
    const validExts = systemInfo ? new Set(systemInfo.exts) : RA_ROM_EXTS

    const systemPath = path.join(retroarchGamesPath, entry.name)
    let romFiles = []
    try { romFiles = fs.readdirSync(systemPath, { withFileTypes: true }) } catch (e) { continue }

    for (const rom of romFiles) {
      if (!rom.isFile()) continue
      const ext = path.extname(rom.name).toLowerCase()
      if (!validExts.has(ext) && !RA_ROM_EXTS.has(ext)) continue
      const title = rom.name.replace(/\.[^.]+$/, '')
      games.push({
        id: 'ra_' + folderKey + '_' + title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
        title,
        genre,
        system: systemLabel,
        icon,
        emulator: 'retroarch',
        romPath: path.join(systemPath, rom.name),
        core: folderKey,
      })
    }
  }

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
  const EXTS = ['.gdi', '.cdi', '.chd', '.lst', '.m3u', '.iso']
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


// -- PPSSPP / PSP Scanner ----------------------------------------------------
async function scanPspGames(pspGamesPath) {
  const games = []
  if (!fs.existsSync(pspGamesPath)) {
    return { games, count: 0, path: pspGamesPath, error: 'Folder not found' }
  }
  const EXTS = ['.iso', '.cso', '.pbp', '.chd']
  let entries
  try { entries = fs.readdirSync(pspGamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
    games.push({
      id: 'psp_' + title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
      title,
      path: path.join(pspGamesPath, entry.name),
      emulator: 'ppsspp',
      genre: 'PSP',
      system: 'PlayStation Portable',
      status: 'Playable',
      icon: 'PSP',
      artwork: null,
    })
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: pspGamesPath }
}

module.exports = { ...module.exports, scanPspGames }


// -- Cemu / Wii U Scanner ----------------------------------------------------
async function scanWiiUGames(wiiUGamesPath) {
  const games = []
  if (!fs.existsSync(wiiUGamesPath)) {
    return { games, count: 0, path: wiiUGamesPath, error: 'Folder not found' }
  }

  let entries
  try { entries = fs.readdirSync(wiiUGamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    // Cemu games are usually in folders containing a .rpx file
    if (entry.isDirectory()) {
      const gameDir = path.join(wiiUGamesPath, entry.name)
      // Look for code/*.rpx
      const codeDir = path.join(gameDir, 'code')
      let rpx = null
      if (fs.existsSync(codeDir)) {
        const codeFiles = fs.readdirSync(codeDir).filter(f => f.toLowerCase().endsWith('.rpx'))
        if (codeFiles.length) rpx = path.join(codeDir, codeFiles[0])
      }
      if (!rpx) {
        // Try root of game folder
        const rootFiles = fs.readdirSync(gameDir).filter(f => f.toLowerCase().endsWith('.rpx'))
        if (rootFiles.length) rpx = path.join(gameDir, rootFiles[0])
      }
      if (rpx) {
        games.push({
          id: 'wiiu_' + entry.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
          title: entry.name.replace(/_/g, ' ').trim(),
          path: rpx,
          emulator: 'cemu',
          genre: 'WiiU',
          system: 'Wii U',
          status: 'Playable',
          icon: 'WU',
          artwork: null,
        })
      }
      continue
    }
    // Also handle .wud / .wux disc images
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (!['.wud', '.wux', '.iso'].includes(ext)) continue
      const title = entry.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
      games.push({
        id: 'wiiu_' + title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''),
        title,
        path: path.join(wiiUGamesPath, entry.name),
        emulator: 'cemu',
        genre: 'WiiU',
        system: 'Wii U',
        status: 'Playable',
        icon: 'WU',
        artwork: null,
      })
    }
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: wiiUGamesPath }
}

module.exports = { ...module.exports, scanWiiUGames }


// -- Model 2 Emulator Scanner ------------------------------------------------
// Model 2 games are typically .zip files in the roms folder
async function scanModel2Games(model2GamesPath) {
  const games = []
  if (!fs.existsSync(model2GamesPath)) {
    return { games, count: 0, path: model2GamesPath, error: 'Folder not found' }
  }

  // Known Model 2 ROM names -> friendly titles
  const MODEL2_TITLES = {
    'daytona':    'Daytona USA',
    'daytonam':   'Daytona USA (Japan)',
    'daytonagtx': 'Daytona USA GTX',
    'desert':     'Desert Tank',
    'dynamcop':   'Dynamite Deka / Die Hard Arcade',
    'dynaphaol':  'Dynamite Deka (ALT)',
    'fvipers':    'Fighting Vipers',
    'fvipersa':   'Fighting Vipers (ALT)',
    'gunblade':   'Gunblade NY',
    'gunblad2':   'LA Machineguns',
    'indy500':    'Indianapolis 500',
    'lastbrnx':   'Last Bronx',
    'manxtt':     'Manx TT Superbike',
    'motoraid':   'Motor Raid',
    'overrev':    'Over Rev',
    'pltkids':    'Pilot Kids',
    'rchase2':    'Rail Chase 2',
    'segawski':   'Sega Water Ski',
    'skisuprg':   'Sega Ski Super G',
    'skytargt':   'Sky Target',
    'sonicar':    'Sonic the Fighters / Sonic Championship',
    'srallyc':    'Sega Rally Championship',
    'srallycb':   'Sega Rally Championship (bootleg)',
    'stcc':       'Sega Touring Car Championship',
    'topskatr':   'Top Skater',
    'vcop':       'Virtua Cop',
    'vcop2':      'Virtua Cop 2',
    'vf2':        'Virtua Fighter 2',
    'vf2a':       'Virtua Fighter 2 (ver 2.1)',
    'vf2b':       'Virtua Fighter 2 (ver 2.0)',
    'von':        'Virtual On: Cybertroopers',
    'vonj':       'Virtual On (Japan)',
    'vstriker':   'Virtua Striker',
    'zerogun':    'Zero Gunner',
    'zeroguna':   'Zero Gunner (ALT)',
  }

  const EXTS = ['.zip']
  let entries
  try { entries = fs.readdirSync(model2GamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const romName = entry.name.replace(/\.[^.]+$/, '').toLowerCase()
    const title = MODEL2_TITLES[romName] || (romName.charAt(0).toUpperCase() + romName.slice(1))
    games.push({
      id: 'model2_' + romName,
      title,
      romName,
      path: path.join(model2GamesPath, entry.name),
      emulator: 'model2',
      genre: 'Arcade',
      system: 'Sega Model 2',
      status: 'Playable',
      icon: 'M2',
      artwork: null,
    })
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: model2GamesPath }
}

module.exports = { ...module.exports, scanModel2Games }


// -- Model 3 / Supermodel Scanner --------------------------------------------
// Model 3 games are .zip files referencing Supermodel emulator
async function scanModel3Games(model3GamesPath) {
  const games = []
  if (!fs.existsSync(model3GamesPath)) {
    return { games, count: 0, path: model3GamesPath, error: 'Folder not found' }
  }

  const MODEL3_TITLES = {
    'bass':       'Sega Bass Fishing',
    'bassdx':     'Sega Bass Fishing Deluxe',
    'daytona2':   'Daytona USA 2: Battle on the Edge',
    'dayto2pe':   'Daytona USA 2 Power Edition',
    'dirtd2dx':   'Dirt Devils 2 Deluxe',
    'dirtdevil':  'Dirt Devils',
    'ecw':        'ECW Hardcore Revolution',
    'fvipers2':   'Fighting Vipers 2',
    'getbass':    'Get Bass / Sega Bass Fishing',
    'harley':     'Harley Davidson & L.A. Riders',
    'lamachin':   'L.A. Machineguns',
    'lemans24':   'Le Mans 24',
    'lostwrld':   'The Lost World: Jurassic Park',
    'lostwrldj':  'The Lost World (Japan)',
    'magicride':  'Magic Ride',
    'magtruck':   'Magic Truck Adventure',
    'manxttdx':   'Manx TT Super Bike DX',
    'oceanhun':   'Ocean Hunter',
    'orca':       'Virtua Striker 2 (Step 2.0)',
    'scud':       'Scud Race / Super GT',
    'scuda':      'Scud Race (ALT)',
    'scudp':      'Scud Race Plus',
    'spikeout':   'Spikeout',
    'spikeofe':   'Spikeout: Final Edition',
    'srally2':    'Sega Rally 2',
    'srally2dx':  'Sega Rally 2 DX',
    'starwars':   'Star Wars Trilogy Arcade',
    'von2':       'Virtual On: Oratorio Tangram',
    'von254g':    'Virtual On OT (ver 5.4g)',
    'vf3':        'Virtua Fighter 3',
    'vf3a':       'Virtua Fighter 3 (ALT)',
    'vf3b':       'Virtua Fighter 3 Team Battle',
    'vs298':      'Virtua Striker 2 (ver 98)',
    'vs2v991':    'Virtua Striker 2 (ver 99.1)',
    'vsn':        'Virtua Striker 2 (Network)',
    'wwfwrstlg':  'WWF Wrestling',
  }

  const EXTS = ['.zip']
  let entries
  try { entries = fs.readdirSync(model3GamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.includes(ext)) continue
    const romName = entry.name.replace(/\.[^.]+$/, '').toLowerCase()
    const title = MODEL3_TITLES[romName] || (romName.charAt(0).toUpperCase() + romName.slice(1))
    games.push({
      id: 'model3_' + romName,
      title,
      romName,
      path: path.join(model3GamesPath, entry.name),
      emulator: 'model3',
      genre: 'Arcade',
      system: 'Sega Model 3',
      status: 'Playable',
      icon: 'M3',
      artwork: null,
    })
  }
  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: model3GamesPath }
}

module.exports = { ...module.exports, scanModel3Games }


// -- Steam Game Scanner ------------------------------------------------------
function scanSteamGames(steamPath) {
  const fs   = require('fs')
  const path = require('path')
  const games = []
  const libraryPaths = [steamPath]

  const vdfPath = path.join(steamPath, 'libraryfolders.vdf')
  if (fs.existsSync(vdfPath)) {
    try {
      const vdf = fs.readFileSync(vdfPath, 'utf8')
      const matches = vdf.matchAll(/"path"\s+"([^"]+)"/gi)
      for (const m of matches) {
        const p = path.join(m[1], 'steamapps')
        if (fs.existsSync(p) && !libraryPaths.includes(p)) libraryPaths.push(p)
      }
    } catch (e) {}
  }

  for (const libPath of libraryPaths) {
    if (!fs.existsSync(libPath)) continue
    let entries
    try { entries = fs.readdirSync(libPath) } catch (e) { continue }
    for (const file of entries) {
      if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) continue
      try {
        const acf = fs.readFileSync(path.join(libPath, file), 'utf8')
        const appid      = (acf.match(/"appid"\s+"(\d+)"/)        || [])[1]
        const name       = (acf.match(/"name"\s+"([^"]+)"/)        || [])[1]
        const installdir = (acf.match(/"installdir"\s+"([^"]+)"/)  || [])[1]
        if (!appid || !name || !installdir) continue
        if (name.match(/Proton|Redistributable|DirectX|Runtime|SDK|Tool/i)) continue
        games.push({
          id: 'steam_' + appid, title: name,
          path: appid, steamAppId: appid,
          emulator: 'steam', genre: 'PC', system: 'PC (Steam)', status: 'Perfect', icon: '?',
        })
      } catch (e) {}
    }
  }

  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: steamPath }
}

// -- PC / Non-Steam Game Scanner ---------------------------------------------
function scanPcGames(pcGamesPath) {
  const fs   = require('fs')
  const path = require('path')
  const games = []

  if (!fs.existsSync(pcGamesPath)) {
    return { games, count: 0, path: pcGamesPath, error: 'Folder not found' }
  }

  let entries
  try { entries = fs.readdirSync(pcGamesPath, { withFileTypes: true }) }
  catch (e) { return { games, count: 0, error: e.message } }

  for (const entry of entries) {
    const entryPath = path.join(pcGamesPath, entry.name)

    // JSON descriptor: { title, exe, genre }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const meta = JSON.parse(fs.readFileSync(entryPath, 'utf8'))
        if (!meta.exe) continue
        const exePath = path.isAbsolute(meta.exe) ? meta.exe : path.join(pcGamesPath, meta.exe)
        games.push({
          id: 'pc_' + entry.name.replace('.json', ''),
          title: meta.title || path.basename(meta.exe, '.exe'),
          path: exePath, emulator: 'pc',
          genre: meta.genre || 'PC', system: 'PC', status: 'Perfect', icon: '?',
        })
      } catch (e) {}
      continue
    }

    // Subfolder with a single .exe
    if (entry.isDirectory()) {
      try {
        const subfiles = fs.readdirSync(entryPath)
        const exes = subfiles.filter(f => f.endsWith('.exe') && !f.match(/uninstall|setup|crash|redist|vc_|dx|oalinst/i))
        if (exes.length === 1) {
          const title = entry.name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
          games.push({
            id: 'pc_' + entry.name.replace(/\W/g, '_'), title,
            path: path.join(entryPath, exes[0]),
            emulator: 'pc', genre: 'PC', system: 'PC', status: 'Unverified', icon: '?',
          })
        }
      } catch (e) {}
    }
  }

  games.sort((a, b) => a.title.localeCompare(b.title))
  return { games, count: games.length, path: pcGamesPath }
}

module.exports = { ...module.exports, scanSteamGames, scanPcGames }
