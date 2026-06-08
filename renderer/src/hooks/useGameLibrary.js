import { useState, useEffect } from 'react'

const SAMPLE_GAMES = [
  // TeknoParrot
  { id: 'wanganmd',             title: 'Wangan Midnight MT 5DX+',     genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WanganMidnightMaximumTune5DX.xml',       icon: '??',  emulator: 'teknoparrot' },
  { id: 'wanganmr',             title: 'Wangan Midnight MT 6RR',      genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WanganMidnightMaximumTune6RR.xml',       icon: '??',  emulator: 'teknoparrot' },
  { id: 'CruisnBlast',          title: "Cruis'n Blast",               genre: 'Racing',   system: 'Raw Thrills',    status: 'Perfect', profile: 'CruisnBlast.xml',                        icon: '?',  emulator: 'teknoparrot' },
  { id: 'FZeroAX',              title: 'F-Zero AX',                   genre: 'Racing',   system: 'Sega Triforce',  status: 'Perfect', profile: 'FZeroAX.xml',                            icon: '?',  emulator: 'teknoparrot' },
  { id: 'Daytona3',             title: 'Daytona Championship USA',    genre: 'Racing',   system: 'SEGA PC',        status: 'Perfect', profile: 'DaytonaChampionshipUSA.xml',             icon: '?',  emulator: 'teknoparrot' },
  { id: 'AliensArmageddon',     title: 'Aliens Armageddon',           genre: 'Shooter',  system: 'Raw Thrills',    status: 'Perfect', profile: 'AliensArmageddon.xml',                   icon: '?',  emulator: 'teknoparrot' },
  { id: 'DariusBurst',          title: 'Dariusburst Another Chron.', genre: 'Shooter',  system: 'Taito Type X2',  status: 'Perfect', profile: 'DariusBurstAnotherChronicle.xml',        icon: '?',  emulator: 'teknoparrot' },
  { id: 'CrossbeatsRev',        title: 'Crossbeats Rev Sunrise',      genre: 'Rhythm',   system: 'SEGA Nu',        status: 'Perfect', profile: 'crossbeatsREVSUNRISE.xml',               icon: '?',  emulator: 'teknoparrot' },
  { id: 'BlazBlueCrossTag',     title: 'BlazBlue Cross Tag Battle',   genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BlazBlueCrossTagBattle.xml',             icon: '?',  emulator: 'teknoparrot' },
  { id: 'BlazBlueCS2',          title: 'BlazBlue Continuum Shift 2', genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BlazBlueContinuumShift2.xml',            icon: '?',  emulator: 'teknoparrot' },
  { id: 'HotD4',                title: 'House of the Dead 4',         genre: 'Shooter',  system: 'SEGA Lindbergh', status: 'Perfect', profile: 'HouseOfTheDead4Special.xml',             icon: '?',  emulator: 'teknoparrot' },
  { id: 'DOA5',                 title: 'Dead or Alive 5 Ultimate',    genre: 'Fighting', system: 'SEGA RingEdge2', status: 'Perfect', profile: 'DeadOrAlive5UltimateArcade.xml',         icon: '??',  emulator: 'teknoparrot' },
  { id: 'AfterBurner',          title: 'After Burner Climax',         genre: 'Flying',   system: 'SEGA Lindbergh', status: 'Perfect', profile: 'AfterBurnerClimax.xml',                  icon: '??',  emulator: 'teknoparrot' },
  { id: 'TimeCrisis5',          title: 'Time Crisis 5',               genre: 'Shooter',  system: 'Namco 369',      status: 'Great',   profile: 'TimeCrisis5.xml',                        icon: '?',  emulator: 'teknoparrot' },
  { id: 'DragonBallZenkai',     title: 'Dragon Ball Zenkai BR',       genre: 'Fighting', system: 'Namco 369',      status: 'Perfect', profile: 'DragonBallZenkaiBattleRoyale.xml',       icon: '?',  emulator: 'teknoparrot' },
  // RPCS3 (PS3 arcade titles)
  { id: 'ps3_tekken6',          title: 'Tekken 6',                    genre: 'PS3',      system: 'RPCS3',          status: 'Perfect', profile: 'BLES00494',                              icon: '?',  emulator: 'rpcs3' },
  { id: 'ps3_blazblue',         title: 'BlazBlue Calamity Trigger',   genre: 'PS3',      system: 'RPCS3',          status: 'Perfect', profile: 'BLES00535',                              icon: '?',  emulator: 'rpcs3' },
  { id: 'ps3_sf4',              title: 'Street Fighter IV',           genre: 'PS3',      system: 'RPCS3',          status: 'Great',   profile: 'BLES00374',                              icon: '?',  emulator: 'rpcs3' },
  // Nintendo Switch (Ryujinx)
  { id: 'switch_ZeldaTotK',     title: 'Zelda: Tears of the Kingdom', genre: 'Switch',   system: 'Nintendo Switch', status:'Perfect', profile: 'ZeldaTotK.nsp',                          icon: '?',  emulator: 'ryujinx' },
  { id: 'switch_MarioKart8',    title: 'Mario Kart 8 Deluxe',         genre: 'Racing',   system: 'Nintendo Switch', status:'Perfect', profile: 'MarioKart8.nsp',                         icon: '?',  emulator: 'ryujinx' },
  { id: 'switch_SSBU',          title: 'Super Smash Bros. Ultimate',   genre: 'Fighting', system: 'Nintendo Switch', status:'Perfect', profile: 'SSBU.nsp',                               icon: '?',  emulator: 'ryujinx' },
  // Xbox 360 (Xenia)
  { id: 'xbox360_Halo3',        title: 'Halo 3',                      genre: 'Xbox360',  system: 'Xbox 360',        status:'Perfect', profile: 'Halo3.iso',                              icon: '?',  emulator: 'xenia' },
  { id: 'xbox360_Gears',        title: 'Gears of War',                genre: 'Xbox360',  system: 'Xbox 360',        status:'Great',   profile: 'GearsOfWar.iso',                         icon: '??',  emulator: 'xenia' },
  { id: 'xbox360_Forza3',       title: 'Forza Motorsport 3',          genre: 'Racing',   system: 'Xbox 360',        status:'Playable',profile: 'ForzaMotorsport3.iso',                   icon: '??',  emulator: 'xenia' },
  // GameCube / Wii (Dolphin)
  { id: 'gcwii_MarioKartWii',   title: 'Mario Kart Wii',              genre: 'GCWii',    system: 'Nintendo Wii',    status:'Perfect', profile: 'MarioKartWii.wbfs',                      icon: '?',  emulator: 'dolphin' },
  { id: 'gcwii_SSBM',           title: 'Super Smash Bros. Melee',     genre: 'Fighting', system: 'GameCube',        status:'Perfect', profile: 'SSBM.iso',                               icon: '?',  emulator: 'dolphin' },
  { id: 'gcwii_FZeroGX',        title: 'F-Zero GX',                   genre: 'Racing',   system: 'GameCube',        status:'Perfect', profile: 'FZeroGX.iso',                            icon: '?',  emulator: 'dolphin' },
  // PS2 (PCSX2)
  { id: 'ps2_GodOfWarII',       title: 'God of War II',               genre: 'PS2',      system: 'PlayStation 2',   status:'Perfect', profile: 'GodOfWarII.iso',                         icon: '??',  emulator: 'pcsx2' },
  { id: 'ps2_GT4',              title: 'Gran Turismo 4',              genre: 'Racing',   system: 'PlayStation 2',   status:'Perfect', profile: 'GranTurismo4.iso',                       icon: '??',  emulator: 'pcsx2' },
  { id: 'ps2_SoulCalibur3',     title: 'SoulCalibur III',             genre: 'Fighting', system: 'PlayStation 2',   status:'Great',   profile: 'SoulCaliburIII.iso',                     icon: '??',  emulator: 'pcsx2' },
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
  const [favorites,      setFavorites     ] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') } catch { return [] }
  })
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
  })

  useEffect(() => { loadLibrary() }, [])

  const loadLibrary = async () => {
    setLoading(true)
    setError(null)
    try {
      if (window.nuarcade && window.nuarcade.platform === 'win32') {
        const cfg = await window.nuarcade.getConfig()
        setConfig(cfg)

        if (cfg.setupComplete) {
          let allGames = []

          // ?? TeknoParrot ??????????????????????????????????????
          try {
            const tpResult = await window.nuarcade.scanGames(
              cfg.teknoParrotPath,
              cfg.gamesFolderPath
            )
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

          // Fall back to samples if nothing found
          const prevCount = parseInt(localStorage.getItem('nuarcade_last_game_count') || '0')
          const markedGames = (allGames.length > 0 ? allGames : SAMPLE_GAMES).map((g, i) => ({
            ...g,
            isNew: allGames.length > 0 && prevCount > 0 && i >= prevCount
          }))
          localStorage.setItem('nuarcade_last_game_count', markedGames.length)
          setGames(markedGames)
        } else {
          // Setup not complete ? show samples
          setGames(SAMPLE_GAMES)
        }
      } else {
        // Dev / Mac ? show samples
        setGames(SAMPLE_GAMES)
        setStats({ total: SAMPLE_GAMES.length, visible: SAMPLE_GAMES.length, hidden: 0, devMode: true })
      }
    } catch (err) {
      setError(err.message)
      setGames(SAMPLE_GAMES)
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

  return {
    games, stats, loading, error, config,
    refreshLibrary: loadLibrary,
    favorites, toggleFavorite, isFavorite: (id) => favorites.includes(id),
    recentlyPlayed, addRecentlyPlayed,
    newGameCount: games.length > 0 ? getNewGameCount() : 0,
  }
}
