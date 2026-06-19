import { useState, useEffect } from 'react'
import { fetchScreenScraperArtwork } from './useScreenScraper'

const SAMPLE_GAMES = [
  // TeknoParrot
  { id: 'wanganmd',             title: 'Wangan Midnight MT 5DX+',     genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WanganMidnightMaximumTune5DX.xml',       icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'wanganmr',             title: 'Wangan Midnight MT 6RR',      genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WanganMidnightMaximumTune6RR.xml',       icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'CruisnBlast',          title: "Cruis'n Blast",               genre: 'Racing',   system: 'Raw Thrills',    status: 'Perfect', profile: 'CruisnBlast.xml',                        icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'FZeroAX',              title: 'F-Zero AX',                   genre: 'Racing',   system: 'Sega Triforce',  status: 'Perfect', profile: 'FZeroAX.xml',                            icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'Daytona3',             title: 'Daytona Championship USA',    genre: 'Racing',   system: 'SEGA PC',        status: 'Perfect', profile: 'DaytonaChampionshipUSA.xml',             icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'AliensArmageddon',     title: 'Aliens Armageddon',           genre: 'Shooter',  system: 'Raw Thrills',    status: 'Perfect', profile: 'AliensArmageddon.xml',                   icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'DariusBurst',          title: 'Dariusburst Another Chron.', genre: 'Shooter',  system: 'Taito Type X2',  status: 'Perfect', profile: 'DariusBurstAnotherChronicle.xml',        icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'CrossbeatsRev',        title: 'Crossbeats Rev Sunrise',      genre: 'Rhythm',   system: 'SEGA Nu',        status: 'Perfect', profile: 'crossbeatsREVSUNRISE.xml',               icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'BlazBlueCrossTag',     title: 'BlazBlue Cross Tag Battle',   genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BlazBlueCrossTagBattle.xml',             icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'BlazBlueCS2',          title: 'BlazBlue Continuum Shift 2', genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BlazBlueContinuumShift2.xml',            icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'HotD4',                title: 'House of the Dead 4',         genre: 'Shooter',  system: 'SEGA Lindbergh', status: 'Perfect', profile: 'HouseOfTheDead4Special.xml',             icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'DOA5',                 title: 'Dead or Alive 5 Ultimate',    genre: 'Fighting', system: 'SEGA RingEdge2', status: 'Perfect', profile: 'DeadOrAlive5UltimateArcade.xml',         icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'AfterBurner',          title: 'After Burner Climax',         genre: 'Flying',   system: 'SEGA Lindbergh', status: 'Perfect', profile: 'AfterBurnerClimax.xml',                  icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'TimeCrisis5',          title: 'Time Crisis 5',               genre: 'Shooter',  system: 'Namco 369',      status: 'Great',   profile: 'TimeCrisis5.xml',                        icon: 'ARC',  emulator: 'teknoparrot' },
  { id: 'DragonBallZenkai',     title: 'Dragon Ball Zenkai BR',       genre: 'Fighting', system: 'Namco 369',      status: 'Perfect', profile: 'DragonBallZenkaiBattleRoyale.xml',       icon: 'ARC',  emulator: 'teknoparrot' },
  // RPCS3 (PS3 arcade titles)
  { id: 'ps3_tekken6',          title: 'Tekken 6',                    genre: 'PS3',      system: 'RPCS3',          status: 'Perfect', profile: 'BLES00494',                              icon: 'PS3',  emulator: 'rpcs3' },
  { id: 'ps3_blazblue',         title: 'BlazBlue Calamity Trigger',   genre: 'PS3',      system: 'RPCS3',          status: 'Perfect', profile: 'BLES00535',                              icon: 'PS3',  emulator: 'rpcs3' },
  { id: 'ps3_sf4',              title: 'Street Fighter IV',           genre: 'PS3',      system: 'RPCS3',          status: 'Great',   profile: 'BLES00374',                              icon: 'PS3',  emulator: 'rpcs3' },
  // Nintendo Switch (Ryujinx)
  { id: 'switch_ZeldaTotK',     title: 'Zelda: Tears of the Kingdom', genre: 'Switch',   system: 'Nintendo Switch', status:'Perfect', profile: 'ZeldaTotK.nsp',                          icon: 'NSW',  emulator: 'ryujinx' },
  { id: 'switch_MarioKart8',    title: 'Mario Kart 8 Deluxe',         genre: 'Racing',   system: 'Nintendo Switch', status:'Perfect', profile: 'MarioKart8.nsp',                         icon: 'NSW',  emulator: 'ryujinx' },
  { id: 'switch_SSBU',          title: 'Super Smash Bros. Ultimate',   genre: 'Fighting', system: 'Nintendo Switch', status:'Perfect', profile: 'SSBU.nsp',                               icon: 'NSW',  emulator: 'ryujinx' },
  // Xbox 360 (Xenia)
  { id: 'xbox360_Halo3',        title: 'Halo 3',                      genre: 'Xbox360',  system: 'Xbox 360',        status:'Perfect', profile: 'Halo3.iso',                              icon: 'X36',  emulator: 'xenia' },
  { id: 'xbox360_Gears',        title: 'Gears of War',                genre: 'Xbox360',  system: 'Xbox 360',        status:'Great',   profile: 'GearsOfWar.iso',                         icon: 'X36',  emulator: 'xenia' },
  { id: 'xbox360_Forza3',       title: 'Forza Motorsport 3',          genre: 'Racing',   system: 'Xbox 360',        status:'Playable',profile: 'ForzaMotorsport3.iso',                   icon: 'X36',  emulator: 'xenia' },
  // GameCube / Wii (Dolphin)
  { id: 'gcwii_MarioKartWii',   title: 'Mario Kart Wii',              genre: 'GCWii',    system: 'Nintendo Wii',    status:'Perfect', profile: 'MarioKartWii.wbfs',                      icon: 'GCN',  emulator: 'dolphin' },
  { id: 'gcwii_SSBM',           title: 'Super Smash Bros. Melee',     genre: 'Fighting', system: 'GameCube',        status:'Perfect', profile: 'SSBM.iso',                               icon: 'GCN',  emulator: 'dolphin' },
  { id: 'gcwii_FZeroGX',        title: 'F-Zero GX',                   genre: 'Racing',   system: 'GameCube',        status:'Perfect', profile: 'FZeroGX.iso',                            icon: 'GCN',  emulator: 'dolphin' },
  // PS2 (PCSX2)
  { id: 'ps2_GodOfWarII',       title: 'God of War II',               genre: 'PS2',      system: 'PlayStation 2',   status:'Perfect', profile: 'GodOfWarII.iso',                         icon: 'PS2',  emulator: 'pcsx2' },
  { id: 'ps2_GT4',              title: 'Gran Turismo 4',              genre: 'Racing',   system: 'PlayStation 2',   status:'Perfect', profile: 'GranTurismo4.iso',                       icon: 'PS2',  emulator: 'pcsx2' },
  { id: 'ps2_SoulCalibur3',     title: 'SoulCalibur III',             genre: 'Fighting', system: 'PlayStation 2',   status:'Great',   profile: 'SoulCaliburIII.iso',                     icon: 'PS2',  emulator: 'pcsx2' },
  // MAME Arcade Classics
  { id: 'mame_pacman',          title: 'Pac-Man',                    genre: 'Arcade',    system: 'MAME',           status: 'Perfect', profile: 'pacman.zip',              icon: 'M',  emulator: 'mame'       },
  { id: 'mame_galaga',          title: 'Galaga',                     genre: 'Arcade',    system: 'MAME',           status: 'Perfect', profile: 'galaga.zip',              icon: 'M',  emulator: 'mame'       },
  { id: 'mame_sf2',             title: 'Street Fighter II',          genre: 'Fighting',  system: 'MAME',           status: 'Perfect', profile: 'sf2.zip',                 icon: 'M',  emulator: 'mame'       },
  { id: 'mame_mk',              title: 'Mortal Kombat',              genre: 'Fighting',  system: 'MAME',           status: 'Perfect', profile: 'mk.zip',                  icon: 'M',  emulator: 'mame'       },
  { id: 'mame_dkong',           title: 'Donkey Kong',                genre: 'Arcade',    system: 'MAME',           status: 'Perfect', profile: 'dkong.zip',               icon: 'M',  emulator: 'mame'       },
  // RetroArch / Classic Consoles
  { id: 'ra_SuperMarioBros',    title: 'Super Mario Bros.',          genre: 'Retro',     system: 'NES',            status: 'Perfect', profile: 'SuperMarioBros.nes',      icon: 'R',  emulator: 'retroarch'  },
  { id: 'ra_SuperMarioWorld',   title: 'Super Mario World',          genre: 'Retro',     system: 'SNES',           status: 'Perfect', profile: 'SuperMarioWorld.sfc',     icon: 'R',  emulator: 'retroarch'  },
  { id: 'ra_SonicTheHedgehog',  title: 'Sonic the Hedgehog',         genre: 'Retro',     system: 'Genesis',        status: 'Perfect', profile: 'SonicTheHedgehog.md',     icon: 'R',  emulator: 'retroarch'  },
  { id: 'ra_PokemonRed',        title: 'Pokemon Red',                genre: 'Retro',     system: 'Game Boy',       status: 'Perfect', profile: 'PokemonRed.gb',           icon: 'R',  emulator: 'retroarch'  },
  { id: 'ra_MarioKart64',       title: 'Mario Kart 64',              genre: 'Racing',    system: 'N64',            status: 'Perfect', profile: 'MarioKart64.n64',         icon: 'R',  emulator: 'retroarch'  },
  // Project64 / N64
  { id: 'n64_Goldeneye007',     title: 'GoldenEye 007',              genre: 'N64',       system: 'Nintendo 64',    status: 'Perfect', profile: 'Goldeneye007.z64',        icon: '64', emulator: 'project64'  },
  { id: 'n64_Zelda_OOT',        title: 'Zelda: Ocarina of Time',     genre: 'N64',       system: 'Nintendo 64',    status: 'Perfect', profile: 'ZeldaOcarinaOfTime.z64',  icon: '64', emulator: 'project64'  },
  { id: 'n64_SuperSmashBros',   title: 'Super Smash Bros.',          genre: 'Fighting',  system: 'Nintendo 64',    status: 'Perfect', profile: 'SuperSmashBros.n64',      icon: '64', emulator: 'project64'  },
  // DuckStation / PS1
  { id: 'ps1_CrashBandicoot',   title: 'Crash Bandicoot',            genre: 'PS1',       system: 'PlayStation',    status: 'Perfect', profile: 'CrashBandicoot.bin',      icon: 'DS', emulator: 'duckstation' },
  { id: 'ps1_FinalFantasyVII',  title: 'Final Fantasy VII',          genre: 'PS1',       system: 'PlayStation',    status: 'Perfect', profile: 'FinalFantasyVII.bin',     icon: 'DS', emulator: 'duckstation' },
  { id: 'ps1_MetalGearSolid',   title: 'Metal Gear Solid',           genre: 'PS1',       system: 'PlayStation',    status: 'Perfect', profile: 'MetalGearSolid.bin',      icon: 'DS', emulator: 'duckstation' },
  // Flycast / Dreamcast
  { id: 'dc_SonicAdventure',    title: 'Sonic Adventure',            genre: 'Dreamcast', system: 'Dreamcast',      status: 'Perfect', profile: 'SonicAdventure.gdi',      icon: 'DC', emulator: 'flycast'    },
  { id: 'dc_MarvelVsCapcom2',   title: 'Marvel vs. Capcom 2',        genre: 'Fighting',  system: 'Dreamcast',      status: 'Perfect', profile: 'MarvelVsCapcom2.gdi',     icon: 'DC', emulator: 'flycast'    },
  { id: 'dc_CrazyTaxi',         title: 'Crazy Taxi',                 genre: 'Racing',    system: 'Dreamcast',      status: 'Perfect', profile: 'CrazyTaxi.gdi',           icon: 'DC', emulator: 'flycast'    },
  // Sega Model 2
  { id: 'model2_daytona',  title: 'Daytona USA',           genre: 'Model2',  system: 'Sega Model 2', status: 'Perfect', profile: 'daytona.zip',  icon: 'M2', emulator: 'model2' },
  { id: 'model2_vf2',      title: 'Virtua Fighter 2',      genre: 'Fighting',system: 'Sega Model 2', status: 'Perfect', profile: 'vf2.zip',      icon: 'M2', emulator: 'model2' },
  { id: 'model2_srallyc',  title: 'Sega Rally Championship',genre: 'Racing', system: 'Sega Model 2', status: 'Perfect', profile: 'srallyc.zip',  icon: 'M2', emulator: 'model2' },
  // Sega Model 3
  { id: 'model3_scud',     title: 'Scud Race / Super GT',  genre: 'Model3',  system: 'Sega Model 3', status: 'Perfect', profile: 'scud.zip',     icon: 'M3', emulator: 'model3' },
  { id: 'model3_vf3',      title: 'Virtua Fighter 3',      genre: 'Fighting',system: 'Sega Model 3', status: 'Perfect', profile: 'vf3.zip',      icon: 'M3', emulator: 'model3' },
  { id: 'model3_starwars', title: 'Star Wars Trilogy Arcade',genre: 'Shooter',system: 'Sega Model 3', status: 'Perfect', profile: 'starwars.zip', icon: 'M3', emulator: 'model3' },
  // PPSSPP / PSP
  { id: 'psp_GodOfWarChainsOfOlympus', title: 'God of War: Chains of Olympus', genre: 'PSP', system: 'PlayStation Portable', status: 'Perfect', profile: 'GodOfWarChainsOfOlympus.iso', icon: 'PSP', emulator: 'ppsspp' },
  { id: 'psp_MonsterHunterFreedom',    title: 'Monster Hunter Freedom Unite',   genre: 'PSP', system: 'PlayStation Portable', status: 'Perfect', profile: 'MonsterHunterFreedomUnite.iso', icon: 'PSP', emulator: 'ppsspp' },
  { id: 'psp_GrandTheftAutoSA',        title: 'Grand Theft Auto: San Andreas',  genre: 'PSP', system: 'PlayStation Portable', status: 'Perfect', profile: 'GTASanAndreas.iso', icon: 'PSP', emulator: 'ppsspp' },
  // Cemu / Wii U
  { id: 'wiiu_MarioKart8',   title: 'Mario Kart 8',                    genre: 'WiiU', system: 'Wii U', status: 'Perfect', profile: 'MarioKart8', icon: 'WU', emulator: 'cemu' },
  { id: 'wiiu_ZeldaBOTW',    title: 'Zelda: Breath of the Wild',       genre: 'WiiU', system: 'Wii U', status: 'Perfect', profile: 'ZeldaBOTW',  icon: 'WU', emulator: 'cemu' },
  { id: 'wiiu_Splatoon',     title: 'Splatoon',                        genre: 'WiiU', system: 'Wii U', status: 'Perfect', profile: 'Splatoon',   icon: 'WU', emulator: 'cemu' },
  // Pinball
  { id: 'Medieval_Madness',     title: 'Medieval Madness',            genre: 'Pinball',  system: 'Visual Pinball X',status:'Perfect', profile: 'Medieval_Madness.vpx',                   icon: '?',  emulator: 'vpx', isPinball: true },
  { id: 'Attack_From_Mars',     title: 'Attack From Mars',            genre: 'Pinball',  system: 'Visual Pinball X',status:'Perfect', profile: 'Attack_From_Mars.vpx',                   icon: '?',  emulator: 'vpx', isPinball: true },
  { id: 'The_Addams_Family',    title: 'The Addams Family',           genre: 'Pinball',  system: 'Visual Pinball X',status:'Perfect', profile: 'The_Addams_Family.vpx',                  icon: '?',  emulator: 'vpx', isPinball: true },
]

const FAVORITES_KEY = 'nuarcade_favorites'
const RECENT_KEY    = 'nuarcade_recent'

export function useGameLibrary() {
  const [games,          setGames         ] = useState([])
  const [stats,          setStats         ] = useState(null)
  const [loading,        setLoading       ] = useState(true)
  const [error,          setError         ] = useState(null)
  const [config,         setConfig        ] = useState(null)
  const [libraryEmpty,   setLibraryEmpty  ] = useState(false)
  const [favorites,      setFavorites     ] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') } catch { return [] }
  })
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => { loadLibrary() }, [])

  const CACHE_KEY = 'nuarcade_game_cache'
  const CACHE_TS_KEY = 'nuarcade_game_cache_ts'
  const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

  const loadLibrary = async (forceRescan = false) => {
    setLoading(true)
    setError(null)
    try {
      if (window.nuarcade && window.nuarcade.platform === 'win32') {
        const cfg = await window.nuarcade.getConfig()
        setConfig(cfg)

        if (cfg.setupComplete) {
          // Check cache first (skip if forceRescan or cache expired)
          if (!forceRescan) {
            try {
              const cached = localStorage.getItem(CACHE_KEY)
              const cachedTs = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0')
              if (cached && Date.now() - cachedTs < CACHE_TTL) {
                const cachedGames = JSON.parse(cached)
                if (cachedGames.length > 0) {
                  // Set games immediately from cache so wheel renders right away
                  setGames(cachedGames)
                  setLibraryEmpty(false)
                  setLoading(false)
                  // Then patch videoPath asynchronously without blocking render
                  try {
                    if (window.nuarcade?.getVideos) {
                      window.nuarcade.getVideos().then(vResult => {
                        const videosMap = vResult.videos || {}
                        if (Object.keys(videosMap).length === 0) return
                        setGames(prev => prev.map(g => {
                          const gameId = g.id || g.profile?.replace('.xml', '').replace('.vpx', '')
                          const filePath = videosMap[gameId]
                          return filePath ? { ...g, videoPath: 'file:///' + filePath.replace(/\\/g, '/') } : g
                        }))
                      }).catch(() => {})
                    }
                  } catch {}
                  return
                }
              }
            } catch {}
          }

          let allGames = []

          // TeknoParrot
          try {
            const tpResult = await window.nuarcade.scanGames({
              teknoParrotPath: cfg.teknoParrotPath,
              gamesFolderPath: cfg.gamesFolderPath,
            })
            if (tpResult.games?.length) allGames = [...allGames, ...tpResult.games]
            if (tpResult.stats) setStats(tpResult.stats)
          } catch (e) { console.warn('TP scan error:', e) }

          // ?? RPCS3 ????????????????????????????????????????????
          if (cfg.mode !== 'pinball' && cfg.ps3GamesPath) {
            try {
              const ps3Result = await window.nuarcade.scanPs3Games(cfg.ps3GamesPath)
              if (ps3Result.games?.length) allGames = [...allGames, ...ps3Result.games]
            } catch (e) { console.warn('RPCS3 scan error:', e) }
          }

          // ?? Ryujinx / Switch ??????????????????????????????????
          if (cfg.mode !== 'pinball' && cfg.switchGamesPath) {
            try {
              const swResult = await window.nuarcade.scanSwitchGames(cfg.switchGamesPath)
              if (swResult.games?.length) allGames = [...allGames, ...swResult.games]
            } catch (e) { console.warn('Ryujinx scan error:', e) }
          }

          // ?? Xenia / Xbox 360 ?????????????????????????????????
          if (cfg.mode !== 'pinball' && cfg.xbox360GamesPath) {
            try {
              const x360Result = await window.nuarcade.scanXbox360Games(cfg.xbox360GamesPath)
              if (x360Result.games?.length) allGames = [...allGames, ...x360Result.games]
            } catch (e) { console.warn('Xenia scan error:', e) }
          }

          // ?? Dolphin / GameCube + Wii ??????????????????????????
          if (cfg.mode !== 'pinball' && cfg.gcWiiGamesPath) {
            try {
              const gcWiiResult = await window.nuarcade.scanGCWiiGames(cfg.gcWiiGamesPath)
              if (gcWiiResult.games?.length) allGames = [...allGames, ...gcWiiResult.games]
            } catch (e) { console.warn('Dolphin scan error:', e) }
          }

          // ?? PCSX2 / PS2 ??????????????????????????????????????
          if (cfg.mode !== 'pinball' && cfg.ps2GamesPath) {
            try {
              const ps2Result = await window.nuarcade.scanPs2Games(cfg.ps2GamesPath)
              if (ps2Result.games?.length) allGames = [...allGames, ...ps2Result.games]
            } catch (e) { console.warn('PCSX2 scan error:', e) }
          }

          // MAME / Arcade Classics
          if (cfg.mode !== 'pinball' && cfg.mameGamesPath) {
            try {
              const mameResult = await window.nuarcade.scanMameGames(cfg.mameGamesPath)
              if (mameResult.games?.length) allGames = [...allGames, ...mameResult.games]
            } catch (e) { console.warn('MAME scan error:', e) }
          }

          // RetroArch / Classic Consoles
          if (cfg.mode !== 'pinball' && cfg.retroarchGamesPath) {
            try {
              const raResult = await window.nuarcade.scanRetroArchGames(cfg.retroarchGamesPath)
              if (raResult.games?.length) allGames = [...allGames, ...raResult.games]
            } catch (e) { console.warn('RetroArch scan error:', e) }
          }

          // Project64 / N64
          if (cfg.mode !== 'pinball' && cfg.n64GamesPath) {
            try {
              const n64Result = await window.nuarcade.scanN64Games(cfg.n64GamesPath)
              if (n64Result.games?.length) allGames = [...allGames, ...n64Result.games]
            } catch (e) { console.warn('Project64 scan error:', e) }
          }

          // DuckStation / PS1
          if (cfg.mode !== 'pinball' && cfg.ps1GamesPath) {
            try {
              const ps1Result = await window.nuarcade.scanPs1Games(cfg.ps1GamesPath)
              if (ps1Result.games?.length) allGames = [...allGames, ...ps1Result.games]
            } catch (e) { console.warn('DuckStation scan error:', e) }
          }

          // Flycast / Dreamcast
          if (cfg.mode !== 'pinball' && cfg.dreamcastGamesPath) {
            try {
              const dcResult = await window.nuarcade.scanDreamcastGames(cfg.dreamcastGamesPath)
              if (dcResult.games?.length) allGames = [...allGames, ...dcResult.games]
            } catch (e) { console.warn('Flycast scan error:', e) }
          }

          // Visual Pinball X
          if (cfg.mode !== 'arcade' && cfg.tablesPath) {
            try {
              const pbResult = await window.nuarcade.scanPinball(cfg.tablesPath)
              if (pbResult.games?.length) allGames = [...allGames, ...pbResult.games]
            } catch (e) { console.warn('Pinball scan error:', e) }
          }

          // Steam games
          if (cfg.enabledEmulators?.steam !== false && cfg.steamPath) {
            try {
              const steamResult = await window.nuarcade.scanSteamGames(cfg.steamPath)
              if (steamResult.games?.length) allGames = [...allGames, ...steamResult.games]
            } catch (e) { console.warn('Steam scan error:', e) }
          }

          // PC / Non-Steam games
          if (cfg.enabledEmulators?.pc !== false && cfg.pcGamesPath) {
            try {
              const pcResult = await window.nuarcade.scanPcGames(cfg.pcGamesPath)
              if (pcResult.games?.length) allGames = [...allGames, ...pcResult.games]
            } catch (e) { console.warn('PC scan error:', e) }
          }

          // Model 2
          if (cfg.mode !== 'pinball' && cfg.model2GamesPath) {
            try {
              const m2Result = await window.nuarcade.scanModel2Games(cfg.model2GamesPath)
              if (m2Result.games?.length) allGames = [...allGames, ...m2Result.games]
            } catch (e) { console.warn('Model2 scan error:', e) }
          }

          // Model 3 / Supermodel
          if (cfg.mode !== 'pinball' && cfg.model3GamesPath) {
            try {
              const m3Result = await window.nuarcade.scanModel3Games(cfg.model3GamesPath)
              if (m3Result.games?.length) allGames = [...allGames, ...m3Result.games]
            } catch (e) { console.warn('Model3 scan error:', e) }
          }

          // PPSSPP / PSP
          if (cfg.mode !== 'pinball' && cfg.pspGamesPath) {
            try {
              const pspResult = await window.nuarcade.scanPspGames(cfg.pspGamesPath)
              if (pspResult.games?.length) allGames = [...allGames, ...pspResult.games]
            } catch (e) { console.warn('PPSSPP scan error:', e) }
          }

          // Cemu / Wii U
          if (cfg.mode !== 'pinball' && cfg.wiiUGamesPath) {
            try {
              const wiiUResult = await window.nuarcade.scanWiiUGames(cfg.wiiUGamesPath)
              if (wiiUResult.games?.length) allGames = [...allGames, ...wiiUResult.games]
            } catch (e) { console.warn('Cemu scan error:', e) }
          }

          // Stamp first-seen timestamp for each game (for Recently Added sort)
          const seenKey = "nuarcade_first_seen"
          let firstSeen = {}
          try { firstSeen = JSON.parse(localStorage.getItem(seenKey) || "{}") } catch {}
          const now = Date.now()
          let seenUpdated = false
          allGames.forEach(g => {
            const id = g.id || g.profile
            if (!firstSeen[id]) { firstSeen[id] = now; seenUpdated = true }
          })
          if (seenUpdated) {
            try { localStorage.setItem(seenKey, JSON.stringify(firstSeen)) } catch {}

            // Auto-fetch artwork for newly discovered games in the background
            const newGameIds = new Set(
              allGames
                .filter(g => firstSeen[g.id || g.profile] === now)
                .map(g => g.id || g.profile)
            )
            if (newGameIds.size > 0 && cfg.screenscraper?.user && cfg.screenscraper?.pass) {
              const newGames = allGames.filter(g => newGameIds.has(g.id || g.profile))
              // Run in background -- don't await, don't block UI
              setTimeout(async () => {
                try {
                  let artwork = {}
                  try { artwork = JSON.parse(localStorage.getItem('nuarcade_artwork') || '{}') } catch {}
                  for (const game of newGames.slice(0, 50)) { // limit to 50 per scan
                    const id = game.id || game.profile
                    if (artwork[id]) continue // skip if already have art
                    const result = await fetchScreenScraperArtwork(
                      game,
                      cfg.screenscraper.user,
                      cfg.screenscraper.pass
                    )
                    if (result?.capsule || result?.hero) {
                      artwork[id] = result
                    }
                    await new Promise(r => setTimeout(r, 350)) // rate limit
                  }
                  localStorage.setItem('nuarcade_artwork', JSON.stringify(artwork))
                } catch (e) { /* silent fail */ }
              }, 2000) // delay 2s to let UI settle first
            }
          }

          // Filter by enabled emulators
          const enabled = cfg.enabledEmulators || {}
          const hasToggles = Object.keys(enabled).length > 0
          if (hasToggles) {
            allGames = allGames.filter(g => {
              const emu = g.emulator || 'teknoparrot'
              return enabled[emu] !== false
            })
          }

          // Fall back to samples if nothing found
          const prevCount = parseInt(localStorage.getItem('nuarcade_last_game_count') || '0')
          const libraryEmpty = allGames.length === 0

          // Load video map from disk (F:/Media/Videos/*.mp4 + videos.json registry)
          let videosMap = {}
          try {
            if (window.nuarcade.getVideos) {
              const vResult = await window.nuarcade.getVideos()
              videosMap = vResult.videos || {}
            }
          } catch {}

          const markedGames = (!libraryEmpty ? allGames : SAMPLE_GAMES).map((g, i) => {
            const gameId = g.id || g.profile?.replace('.xml', '').replace('.vpx', '')
            const videoFilePath = videosMap[gameId]
            return {
              ...g,
              isNew: !libraryEmpty && prevCount > 0 && i >= prevCount,
              isSample: libraryEmpty,
              videoPath: videoFilePath ? ('file:///' + videoFilePath.replace(/\\/g, '/')) : undefined,
            }
          })
          localStorage.setItem('nuarcade_last_game_count', markedGames.length)
          // Cache the scan results so next startup is instant
          if (!libraryEmpty && markedGames.length > 0) {
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(markedGames))
              localStorage.setItem(CACHE_TS_KEY, String(Date.now()))
            } catch {}
          }
          setLibraryEmpty(libraryEmpty)
          setGames(markedGames)
        } else {
          // Setup not complete ? show samples
          setGames([])
        }
      } else {
        // Dev / Mac ? show samples
        setGames([])
        setStats({ total: 0, visible: 0, hidden: 0, devMode: true })
      }
    } catch (err) {
      setError(err.message)
      setGames([])
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (gameId) => {
    setFavorites(prev => {
      const next = prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }

  const addRecentlyPlayed = (game) => {
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(g => g.profile !== game.profile)
      const next = [game, ...filtered].slice(0, 10)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      return next
    })
  }

  const getNewGameCount = () => {
    try {
      const lastCount = parseInt(localStorage.getItem('nuarcade_last_game_count') || '0')
      const current = games.length
      if (lastCount > 0 && current > lastCount) return current - lastCount
      localStorage.setItem('nuarcade_last_game_count', current)
      return 0
    } catch { return 0 }
  }

  // Reload only the video map and patch videoPath onto existing games --
  // called after bulk download completes so new clips appear without rescan
  const refreshVideoPaths = async () => {
    try {
      if (!window.nuarcade?.getVideos) return
      const vResult = await window.nuarcade.getVideos()
      const videosMap = vResult.videos || {}

      setGames(prev => {
        const updated = prev.map(g => {
          const gameId = g.id || g.profile?.replace('.xml', '').replace('.vpx', '')
          const filePath = videosMap[gameId]
          return filePath
            ? { ...g, videoPath: 'file:///' + filePath.replace(/\\/g, '/') }
            : g
        })
        // Also patch the localStorage cache so videos survive page reloads
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (cached) {
            const cachedGames = JSON.parse(cached)
            const patchedCache = cachedGames.map(g => {
              const gameId = g.id || g.profile?.replace('.xml', '').replace('.vpx', '')
              const filePath = videosMap[gameId]
              return filePath
                ? { ...g, videoPath: 'file:///' + filePath.replace(/\\/g, '/') }
                : g
            })
            localStorage.setItem(CACHE_KEY, JSON.stringify(patchedCache))
          }
        } catch {}
        return updated
      })
    } catch {}
  }

  return {
    games, stats, loading, error, config, libraryEmpty,
    refreshLibrary: () => loadLibrary(true),
    refreshVideoPaths,
    favorites, toggleFavorite, isFavorite: (id) => favorites.includes(id),
    recentlyPlayed, addRecentlyPlayed,
    newGameCount: games.length > 0 ? getNewGameCount() : 0,
  }
}
