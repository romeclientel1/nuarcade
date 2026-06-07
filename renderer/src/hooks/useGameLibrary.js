import { useState, useEffect } from 'react'

const SAMPLE_GAMES = [
  // TeknoParrot
  { id: 'wanganmd',             title: 'Wangan Midnight MT 5DX+',     genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WanganMidnightMaximumTune5DX.xml',       icon: '🏎️',  emulator: 'teknoparrot' },
  { id: 'wanganmr',             title: 'Wangan Midnight MT 6RR',      genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WanganMidnightMaximumTune6RR.xml',       icon: '🏎️',  emulator: 'teknoparrot' },
  { id: 'CruisnBlast',          title: "Cruis'n Blast",               genre: 'Racing',   system: 'Raw Thrills',    status: 'Perfect', profile: 'CruisnBlast.xml',                        icon: '💥',  emulator: 'teknoparrot' },
  { id: 'FZeroAX',              title: 'F-Zero AX',                   genre: 'Racing',   system: 'Sega Triforce',  status: 'Perfect', profile: 'FZeroAX.xml',                            icon: '🚀',  emulator: 'teknoparrot' },
  { id: 'Daytona3',             title: 'Daytona Championship USA',    genre: 'Racing',   system: 'SEGA PC',        status: 'Perfect', profile: 'DaytonaChampionshipUSA.xml',             icon: '🏁',  emulator: 'teknoparrot' },
  { id: 'AliensArmageddon',     title: 'Aliens Armageddon',           genre: 'Shooter',  system: 'Raw Thrills',    status: 'Perfect', profile: 'AliensArmageddon.xml',                   icon: '👾',  emulator: 'teknoparrot' },
  { id: 'DariusBurst',          title: 'Dariusburst Another Chron.', genre: 'Shooter',  system: 'Taito Type X2',  status: 'Perfect', profile: 'DariusBurstAnotherChronicle.xml',        icon: '🐟',  emulator: 'teknoparrot' },
  { id: 'CrossbeatsRev',        title: 'Crossbeats Rev Sunrise',      genre: 'Rhythm',   system: 'SEGA Nu',        status: 'Perfect', profile: 'crossbeatsREVSUNRISE.xml',               icon: '🎵',  emulator: 'teknoparrot' },
  { id: 'BlazBlueCrossTag',     title: 'BlazBlue Cross Tag Battle',   genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BlazBlueCrossTagBattle.xml',             icon: '🌀',  emulator: 'teknoparrot' },
  { id: 'BlazBlueCS2',          title: 'BlazBlue Continuum Shift 2', genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BlazBlueContinuumShift2.xml',            icon: '🌀',  emulator: 'teknoparrot' },
  { id: 'HotD4',                title: 'House of the Dead 4',         genre: 'Shooter',  system: 'SEGA Lindbergh', status: 'Perfect', profile: 'HouseOfTheDead4Special.xml',             icon: '🧟',  emulator: 'teknoparrot' },
  { id: 'DOA5',                 title: 'Dead or Alive 5 Ultimate',    genre: 'Fighting', system: 'SEGA RingEdge2', status: 'Perfect', profile: 'DeadOrAlive5UltimateArcade.xml',         icon: '⚔️',  emulator: 'teknoparrot' },
  { id: 'AfterBurner',          title: 'After Burner Climax',         genre: 'Flying',   system: 'SEGA Lindbergh', status: 'Perfect', profile: 'AfterBurnerClimax.xml',                  icon: '✈️',  emulator: 'teknoparrot' },
  { id: 'TimeCrisis5',          title: 'Time Crisis 5',               genre: 'Shooter',  system: 'Namco 369',      status: 'Great',   profile: 'TimeCrisis5.xml',                        icon: '🎯',  emulator: 'teknoparrot' },
  { id: 'DragonBallZenkai',     title: 'Dragon Ball Zenkai BR',       genre: 'Fighting', system: 'Namco 369',      status: 'Perfect', profile: 'DragonBallZenkaiBattleRoyale.xml',       icon: '🐉',  emulator: 'teknoparrot' },
  // RPCS3 (PS3 arcade titles)
  { id: 'ps3_tekken6',          title: 'Tekken 6',                    genre: 'PS3',      system: 'RPCS3',          status: 'Perfect', profile: 'BLES00494',                              icon: '🥊',  emulator: 'rpcs3' },
  { id: 'ps3_blazblue',         title: 'BlazBlue Calamity Trigger',   genre: 'PS3',      system: 'RPCS3',          status: 'Perfect', profile: 'BLES00535',                              icon: '🌀',  emulator: 'rpcs3' },
  { id: 'ps3_sf4',              title: 'Street Fighter IV',           genre: 'PS3',      system: 'RPCS3',          status: 'Great',   profile: 'BLES00374',                              icon: '👊',  emulator: 'rpcs3' },
  // Pinball
  { id: 'Medieval_Madness',     title: 'Medieval Madness',            genre: 'Pinball',  system: 'Visual Pinball X',status:'Perfect', profile: 'Medieval_Madness.vpx',                   icon: '🏰',  emulator: 'vpx', isPinball: true },
  { id: 'Attack_From_Mars',     title: 'Attack From Mars',            genre: 'Pinball',  system: 'Visual Pinball X',status:'Perfect', profile: 'Attack_From_Mars.vpx',                   icon: '🛸',  emulator: 'vpx', isPinball: true },
  { id: 'The_Addams_Family',    title: 'The Addams Family',           genre: 'Pinball',  system: 'Visual Pinball X',status:'Perfect', profile: 'The_Addams_Family.vpx',                  icon: '👻',  emulator: 'vpx', isPinball: true },
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

          // ── TeknoParrot ──────────────────────────────────────
          try {
            const tpResult = await window.nuarcade.scanGames(
              cfg.teknoParrotPath,
              cfg.gamesFolderPath
            )
            if (tpResult.games?.length) allGames = [...allGames, ...tpResult.games]
            if (tpResult.stats) setStats(tpResult.stats)
          } catch (e) { console.warn('TP scan error:', e) }

          // ── RPCS3 ────────────────────────────────────────────
          if (cfg.mode !== 'pinball' && cfg.ps3GamesPath) {
            try {
              const ps3Result = await window.nuarcade.scanPs3Games(cfg.ps3GamesPath)
              if (ps3Result.games?.length) allGames = [...allGames, ...ps3Result.games]
            } catch (e) { console.warn('RPCS3 scan error:', e) }
          }

          // ── Visual Pinball X ─────────────────────────────────
          if (cfg.mode !== 'arcade' && cfg.tablesPath) {
            try {
              const pbResult = await window.nuarcade.scanPinball(cfg.tablesPath)
              if (pbResult.games?.length) allGames = [...allGames, ...pbResult.games]
            } catch (e) { console.warn('Pinball scan error:', e) }
          }

          // Fall back to samples if nothing found
          setGames(allGames.length > 0 ? allGames : SAMPLE_GAMES)
        } else {
          // Setup not complete — show samples
          setGames(SAMPLE_GAMES)
        }
      } else {
        // Dev / Mac — show samples
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
