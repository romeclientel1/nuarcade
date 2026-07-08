import { useState, useEffect } from 'react'
import { fetchScreenScraperArtwork } from './useScreenScraper'

const SAMPLE_GAMES = []

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

        if (true) { // wizard removed -- always scan on launch
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
              teknoParrotPath: cfg.teknoParrotPath || '',
              gamesFolderPath: cfg.gamesFolderPath || '',
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

          const markedGames = allGames.map((g, i) => {
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
