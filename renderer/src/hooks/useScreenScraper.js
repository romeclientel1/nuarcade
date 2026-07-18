// ScreenScraper API hook
// Free API -- covers MAME, NES, SNES, Genesis, N64, PS1, Dreamcast, GBA, PSP and more
// Docs: https://www.screenscraper.fr/api2.php
// Register free at screenscraper.fr to get a username/password

const SS_BASE = 'https://www.screenscraper.fr/api2'
const SS_DEVID = 'nuarcade'
const SS_DEVPASS = 'nuarcade2024'
const SS_SOFTNAME = 'NuArcade'

// ScreenScraper system IDs for each emulator genre
const SYSTEM_IDS = {
  mame:        75,   // Arcade (MAME)
  teknoparrot: 75,   // Arcade
  retroarch:   null, // varies by extension -- mapped below
  project64:   14,   // Nintendo 64
  duckstation: 57,   // PlayStation
  flycast:     23,   // Dreamcast
  xemu:        32,   // Original Xbox
  cxbx:        32,   // Original Xbox
  ppsspp:      61,   // PSP
  dolphin:     13,   // GameCube (Wii is 16)
  pcsx2:       58,   // PlayStation 2
  rpcs3:       59,   // PlayStation 3
  xenia:       12,   // Xbox 360
  ryujinx:     225,  // Nintendo Switch
  cemu:        18,   // Wii U
}

// Checked before the extension-based fallback below -- Dreamcast and PS1
// both commonly use .iso, which would otherwise misidentify RetroArch-routed
// Dreamcast games as PS1 in the extension guess.
const CORE_SYSTEM_IDS = {
  dreamcast: 23,
}

const EXT_SYSTEM_IDS = {
  '.nes':  7,    // NES
  '.fds':  7,
  '.sfc':  4,    // SNES
  '.smc':  4,
  '.md':   1,    // Mega Drive / Genesis
  '.gen':  1,
  '.smd':  1,
  '.gba':  12,   // GBA (using 12 as placeholder -- actual is 24)
  '.gbc':  9,    // Game Boy Color
  '.gb':   9,
  '.n64':  14,
  '.z64':  14,
  '.v64':  14,
  '.bin':  57,   // PS1
  '.cue':  57,
  '.iso':  57,
  '.pce':  31,   // PC Engine
  '.gg':   21,   // Game Gear
  '.sms':  2,    // Master System
  '.32x':  19,   // 32X
  '.a26':  26,   // Atari 2600
  '.ws':   45,   // WonderSwan
  '.wsc':  45,
}

function buildUrl(endpoint, params) {
  const base = SS_BASE + '/' + endpoint
  const p = new URLSearchParams({
    devid:    SS_DEVID,
    devpassword: SS_DEVPASS,
    softname: SS_SOFTNAME,
    output:   'json',
    ...params,
  })
  return base + '?' + p.toString()
}

export async function fetchScreenScraperArtwork(game, ssUser, ssPass) {
  if (!ssUser || !ssPass) return null

  try {
    // Determine system ID
    let systemId = SYSTEM_IDS[game.emulator]
    if (!systemId && game.emulator === 'retroarch') {
      systemId = CORE_SYSTEM_IDS[game.core] || null
      if (!systemId) {
        const ext = (game.path || '').toLowerCase().match(/\.[^.]+$/)?.[0]
        systemId = ext ? EXT_SYSTEM_IDS[ext] : null
      }
    }
    if (!systemId) return null

    // Search by ROM name for MAME, by title for others
    const searchParam = game.emulator === 'mame' && game.romName
      ? { romnom: game.romName + '.zip', systemeid: systemId }
      : { romnom: encodeURIComponent(game.title), systemeid: systemId }

    const url = buildUrl('jeuInfos.php', {
      ...searchParam,
      ssid:     ssUser,
      sspassword: ssPass,
    })

    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()

    const jeu = data?.response?.jeu
    if (!jeu) return null

    // Extract best available media
    const medias = jeu.medias || []
    const find = (types) => {
      for (const type of types) {
        const m = medias.find(m => m.type === type && (!m.region || ['wor', 'us', 'eu', 'ss'].includes(m.region)))
        if (m) return 'https://www.screenscraper.fr/image.php?image=' + encodeURIComponent(m.url || '')
      }
      return null
    }

    const capsule = find(['box-2D', 'box-2D-side', 'box-3D'])
    const hero    = find(['fanart', 'screenshot', 'title-screen'])
    const logo    = find(['wheel', 'wheel-hd', 'clear-logo'])

    if (!capsule && !hero && !logo) return null
    return { capsule, hero, logo, source: 'screenscraper' }

  } catch (e) {
    return null
  }
}
