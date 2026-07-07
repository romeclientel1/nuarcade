import { useState, useEffect, useRef } from "react"
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import styles from "./MediaManager.module.css"
import ArtworkManager from "../ArtworkManager/ArtworkManager"
import { useSteamGridDB } from "../../hooks/useSteamGridDB"

const THUMBNAIL_BASE = "https://raw.githubusercontent.com/teknogods/TeknoParrotUIThumbnails/master/Icons/"

const SAMPLE_GAMES = [
  { id: "wanganmd",               title: "Wangan Midnight MT 5DX+",    genre: "Racing",   system: "SEGA Nu",     hasVideo: false },
  { id: "CruisnBlast",            title: "Cruis n Blast",              genre: "Racing",   system: "Raw Thrills", hasVideo: false },
  { id: "AliensArmageddon",       title: "Aliens Armageddon",          genre: "Shooter",  system: "Raw Thrills", hasVideo: false },
  { id: "DariusBurst",            title: "Dariusburst Another Chron",  genre: "Shooter",  system: "Taito X2",    hasVideo: false },
  { id: "CrossbeatsRev",          title: "Crossbeats Rev Sunrise",     genre: "Rhythm",   system: "SEGA Nu",     hasVideo: false },
  { id: "BlazBlueCrossTagBattle", title: "BlazBlue Cross Tag Battle",  genre: "Fighting", system: "NESiCAxLive", hasVideo: false },
]

const TABS = ['library', 'artwork', 'emumovies', 'about']

export default function MediaManager({ onClose, onVideosUpdated, onArtworkUpdated }) {
  const scrollRef = useRef(null)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [systemFilter, setSystemFilter] = useState("all")
  const [tab, setTab] = useState("library")
  const [emFocused, setEmFocused] = useState(null) // null | 'create' | 'scan'
  const emScanBtnRef = useRef(null)
  const emCreateBtnRef = useRef(null)
  const [restartNeeded, setRestartNeeded] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [importingAll, setImportingAll] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })

  // Reset focus whenever the tab changes via any path (mouse click, gamepad, etc.)
  useEffect(() => {
    if (tab !== 'emumovies') setEmFocused(null)
  }, [tab])

  useOverlayGamepad({
    onClose,
    onUp:      () => {
      if (tab === 'emumovies' && emFocused) { setEmFocused(null); return }
      scrollRef.current?.scrollBy({ top: -120, behavior: 'smooth' })
    },
    onDown:    () => {
      if (tab === 'emumovies') { setEmFocused('scan'); return }
      scrollRef.current?.scrollBy({ top: 120, behavior: 'smooth' })
    },
    onLeft:    () => {
      if (tab === 'emumovies' && emFocused) { setEmFocused(prev => prev === 'scan' ? 'create' : 'scan'); return }
      setEmFocused(null); setTab(prev => { const i = TABS.indexOf(prev); return TABS[Math.max(0, i-1)] })
    },
    onRight:   () => {
      if (tab === 'emumovies' && emFocused) { setEmFocused(prev => prev === 'scan' ? 'create' : 'scan'); return }
      setEmFocused(null); setTab(prev => { const i = TABS.indexOf(prev); return TABS[Math.min(TABS.length-1, i+1)] })
    },
    onConfirm: () => {
      if (tab === 'emumovies' && emFocused === 'scan')   { emScanBtnRef.current?.click(); return }
      if (tab === 'emumovies' && emFocused === 'create') { emCreateBtnRef.current?.click(); return }
      setFilter(prev => { const f = ["all","missing","ready"]; return f[(f.indexOf(prev)+1)%f.length] })
    },
  })
  const [showArtworkMgr, setShowArtworkMgr] = useState(false)
  const [mmConfig, setMmConfig] = useState({})
  const [ytResults, setYtResults] = useState({})
  const [ytSearching, setYtSearching] = useState({})
  const [ytDownloading, setYtDownloading] = useState({})
  const [ytdlpAvailable, setYtdlpAvailable] = useState(null) // null=unknown, true, false
  const [ytdlpInstalling, setYtdlpInstalling] = useState(false)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null) // { current, total, title, done, failed }
  const bulkCancelRef = useRef(false)

  // -- EmuMovies local Sync import --
  const [emScanResult, setEmScanResult] = useState(null)
  const [autoFilling, setAutoFilling] = useState(false)
  const [autoFillStage, setAutoFillStage] = useState('')
  const { fetchArtworkForGame } = useSteamGridDB(mmConfig?.sgdbApiKey)
  const [emScanning, setEmScanning] = useState(false)
  const [emImported, setEmImported] = useState({}) // 'gameId|slot' -> 'done' | 'error'
  const [emPick, setEmPick] = useState({}) // 'gameId|slot' -> chosen sourceFile

  const [creatingFolders, setCreatingFolders] = useState(false)
  const [folderResult, setFolderResult] = useState(null)
  const [emMediaPath, setEmMediaPath] = useState('')

  // Prefill the path field once Settings' configured Media folder loads,
  // but only if the person hasn't already typed/browsed to something else.
  useEffect(() => {
    if (mmConfig?.mediaPath && !emMediaPath) setEmMediaPath(mmConfig.mediaPath)
  }, [mmConfig?.mediaPath])

  const handleBrowseMediaPath = async () => {
    const result = await window.nuarcade?.browseFolder()
    if (result) setEmMediaPath(result)
  }

  const handleCreateMediaFolders = async () => {
    if (!window.nuarcade?.ensureMediaFolders) return
    setCreatingFolders(true)
    setFolderResult(null)
    try {
      const result = await window.nuarcade.ensureMediaFolders(emMediaPath || undefined)
      const createdCount = result?.created || 0
      const skippedCount = result?.skipped || 0
      setFolderResult({ createdCount, skippedCount, root: result?.mediaRoot })
      log('Folder structure ready at ' + result?.mediaRoot + ' -- ' + createdCount + ' created, ' + skippedCount + ' already existed', 'ok')
    } catch (e) {
      setFolderResult({ error: e.message || String(e) })
      log('Folder creation exception: ' + (e.message || String(e)), 'error')
    }
    setCreatingFolders(false)
  }

  const handleScanEmuMovies = async () => {
    if (!window.nuarcade?.scanEmuMoviesMedia) return
    setEmScanning(true)
    setEmScanResult(null)
    try {
      const result = await window.nuarcade.scanEmuMoviesMedia({
        mediaPath: mmConfig?.mediaPath,
        games,
      })
      setEmScanResult(result)
      log(result.error ? 'EmuMovies scan: ' + result.error : 'EmuMovies scan found ' + (result.totalFound || 0) + ' matches', result.error ? 'warn' : 'ok')
    } catch (e) {
      setEmScanResult({ suggestions: [], error: e.message || String(e) })
      log('EmuMovies scan exception: ' + (e.message || String(e)), 'error')
    }
    setEmScanning(false)
  }

  const handleImportEmuMovies = async (suggestion, sourceFile) => {
    if (!sourceFile || !window.nuarcade?.importEmuMoviesFile) return
    const key = suggestion.gameId + '|' + suggestion.slot
    try {
      const result = await window.nuarcade.importEmuMoviesFile({
        sourceFile,
        gameId: suggestion.gameId,
        slot: suggestion.slot,
        mediaPath: mmConfig?.mediaPath,
      })
      if (result.success) {
        setEmImported(prev => ({ ...prev, [key]: 'done' }))
        if (suggestion.slot === 'video') {
          setGames(g => g.map(x => (x.id || x.profile) === suggestion.gameId ? { ...x, hasVideo: true } : x))
          onVideosUpdated?.()
        } else {
          try {
            const artwork = JSON.parse(localStorage.getItem('nuarcade_artwork') || '{}')
            artwork[suggestion.gameId] = { ...(artwork[suggestion.gameId] || {}), [suggestion.slot]: result.fileUrl }
            localStorage.setItem('nuarcade_artwork', JSON.stringify(artwork))
            onArtworkUpdated?.()
          } catch {}
        }
        setRestartNeeded(true)
        log('Imported ' + suggestion.slot + ' for ' + suggestion.gameTitle, 'ok')
      } else {
        setEmImported(prev => ({ ...prev, [key]: 'error' }))
        log('Import failed for ' + suggestion.gameTitle + ': ' + result.error, 'error')
      }
    } catch (e) {
      setEmImported(prev => ({ ...prev, [key]: 'error' }))
      log('Import exception: ' + (e.message || String(e)), 'error')
    }
  }

  const handleImportAll = async () => {
    if (!emScanResult?.suggestions?.length || importingAll) return
    setImportingAll(true)

    const pending = emScanResult.suggestions.filter(s => emImported[s.gameId + '|' + s.slot] !== 'done')
    setImportProgress({ current: 0, total: pending.length })

    // Reading, modifying, and re-writing the entire artwork registry on
    // every single import (the old per-item approach via
    // handleImportEmuMovies) is fine at small scale but compounds into
    // minutes of silent work at thousands of items, with the UI just
    // showing static "Importing..." the whole time -- easy to mistake for
    // stuck or finished and restart mid-run, which drops most of the batch.
    // Reading once, accumulating in memory, and flushing periodically
    // avoids that entirely.
    let artwork = {}
    try { artwork = JSON.parse(localStorage.getItem('nuarcade_artwork') || '{}') } catch {}
    let artworkDirty = false
    let videoUpdated = false
    const importedKeys = {}
    let doneCount = 0
    let errorCount = 0

    for (let i = 0; i < pending.length; i++) {
      const s = pending[i]
      const key = s.gameId + '|' + s.slot
      const chosenPath = emPick[key] ?? s.chosenFile?.sourceFile ?? ''
      setImportProgress({ current: i + 1, total: pending.length })

      if (!chosenPath) continue

      try {
        const result = await window.nuarcade.importEmuMoviesFile({
          sourceFile: chosenPath,
          gameId: s.gameId,
          slot: s.slot,
          mediaPath: mmConfig?.mediaPath,
        })
        if (result.success) {
          importedKeys[key] = 'done'
          doneCount++
          if (s.slot === 'video') {
            setGames(g => g.map(x => (x.id || x.profile) === s.gameId ? { ...x, hasVideo: true } : x))
            videoUpdated = true
          } else {
            artwork[s.gameId] = { ...(artwork[s.gameId] || {}), [s.slot]: result.fileUrl }
            artworkDirty = true
          }
          setRestartNeeded(true)
        } else {
          importedKeys[key] = 'error'
          errorCount++
          log('Import failed for ' + s.gameTitle + ': ' + result.error, 'error')
        }
      } catch (e) {
        importedKeys[key] = 'error'
        errorCount++
        log('Import exception: ' + (e.message || String(e)), 'error')
      }

      if (artworkDirty && i % 50 === 0) {
        try { localStorage.setItem('nuarcade_artwork', JSON.stringify(artwork)) } catch {}
      }
    }

    if (artworkDirty) {
      try { localStorage.setItem('nuarcade_artwork', JSON.stringify(artwork)) } catch {}
      onArtworkUpdated?.()
    }
    if (videoUpdated) onVideosUpdated?.()

    setEmImported(prev => ({ ...prev, ...importedKeys }))
    log('Import All complete -- ' + doneCount + ' imported, ' + errorCount + ' failed', 'ok')

    setImportingAll(false)
    setImportProgress({ current: 0, total: 0 })
  }

  useEffect(() => {
    scanLibrary()
    window.nuarcade?.getConfig?.().then(cfg => {
      setMmConfig(cfg || {})
      // Check if yt-dlp.exe actually exists on disk
      if (window.nuarcade?.checkPath && cfg?.ytdlpPath) {
        window.nuarcade.checkPath(cfg.ytdlpPath).then(r => setYtdlpAvailable(!!r?.exists)).catch(() => setYtdlpAvailable(false))
      }
    }).catch(() => {})
  }, [])

  const scanLibrary = async () => {
    setLoading(true)
    try {
      let gameList = []
      if (window.nuarcade && window.nuarcade.platform === "win32") {
        const config = await window.nuarcade.getConfig()
        const scanners = [
          () => window.nuarcade.scanGames({ teknoParrotPath: config.teknoParrotPath, gamesFolderPath: config.gamesFolderPath }),
          () => window.nuarcade.scanMameGames(config.mameGamesPath),
          () => window.nuarcade.scanPs2Games && window.nuarcade.scanPs2Games(config.ps2GamesPath),
          () => window.nuarcade.scanPs3Games && window.nuarcade.scanPs3Games(config.ps3GamesPath),
          () => window.nuarcade.scanXbox360Games && window.nuarcade.scanXbox360Games(config.xbox360GamesPath),
          () => window.nuarcade.scanGCWiiGames && window.nuarcade.scanGCWiiGames(config.gcWiiGamesPath),
          () => window.nuarcade.scanSwitchGames && window.nuarcade.scanSwitchGames(config.switchGamesPath),
          () => window.nuarcade.scanN64Games && window.nuarcade.scanN64Games(config.n64GamesPath),
          () => window.nuarcade.scanPs1Games && window.nuarcade.scanPs1Games(config.ps1GamesPath),
          () => window.nuarcade.scanPinball && window.nuarcade.scanPinball(config.tablesPath),
          () => window.nuarcade.scanPspGames && window.nuarcade.scanPspGames(config.pspGamesPath),
          () => window.nuarcade.scanDreamcastGames && window.nuarcade.scanDreamcastGames(config.dreamcastGamesPath),
          () => window.nuarcade.scanRetroArchGames && window.nuarcade.scanRetroArchGames(config.retroarchGamesPath),
          () => window.nuarcade.scanSteamGames && window.nuarcade.scanSteamGames(config.steamPath),
          () => window.nuarcade.scanPcGames && window.nuarcade.scanPcGames(config.pcGamesPath),
          () => window.nuarcade.scanModel2Games && window.nuarcade.scanModel2Games(config.model2GamesPath),
          () => window.nuarcade.scanModel3Games && window.nuarcade.scanModel3Games(config.model3GamesPath),
          () => window.nuarcade.scanWiiUGames && window.nuarcade.scanWiiUGames(config.wiiUGamesPath),
        ]
        for (const scanner of scanners) {
          try {
            const result = await scanner()
            if (result && result.games && result.games.length > 0) {
              gameList = [...gameList, ...result.games.map(g => ({ ...g, hasVideo: false }))]
            }
          } catch {}
        }
        // Check existing videos from disk registry (not localStorage which is stale)
        try {
          const artwork = JSON.parse(localStorage.getItem("nuarcade_artwork") || "{}")
          let videosMap = {}
          try {
            if (window.nuarcade.getVideos) {
              const vResult = await window.nuarcade.getVideos()
              videosMap = vResult.videos || {}
            }
          } catch (e) {
            console.log('[NuArcade] getVideos error:', e.message)
          }
          gameList = gameList.map(g => {
            const gid = g.id || g.profile?.replace('.xml','').replace('.vpx','')
            return {
              ...g,
              hasArtwork: !!(artwork[g.id || g.profile]),
              hasVideo: !!(videosMap[gid]),
            }
          })
        } catch {}
      } else {
        gameList = SAMPLE_GAMES
      }
      setGames(gameList)
    } catch (e) {
      setGames(SAMPLE_GAMES)
    } finally {
      setLoading(false)
    }
  }

  const [diagLog, setDiagLog] = useState([])

  const log = (msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString()
    setDiagLog(prev => [...prev.slice(-999), { ts, msg, type }])
  }

  // Must be defined before handleBulkYouTube and handleYtSearch which both call it
  const handleEnsureYtdlp = async () => {
    if (ytdlpAvailable) return true
    setYtdlpInstalling(true)
    log('yt-dlp not found -- downloading from GitHub...')
    try {
      const result = await window.nuarcade.ensureYtdlp()
      if (result.success) {
        setYtdlpAvailable(true)
        if (!result.alreadyPresent) log('yt-dlp downloaded and ready', 'ok')
        setYtdlpInstalling(false)
        return true
      } else {
        log('yt-dlp auto-download failed: ' + result.error, 'error')
        setYtdlpInstalling(false)
        return false
      }
    } catch (e) {
      log('yt-dlp install error: ' + (e.message || String(e)), 'error')
      setYtdlpInstalling(false)
      return false
    }
  }

  // One-click priority chain: EmuMovies first (best quality, curated art and
  // video), then SteamGridDB for whatever artwork EmuMovies didn't have, then
  // YouTube for whatever video is still missing. Click again while running
  // to cancel, same pattern as the standalone YouTube bulk fetch.
  const handleAutoFillEverything = async () => {
    if (autoFilling) {
      bulkCancelRef.current = true
      return
    }

    bulkCancelRef.current = false
    setAutoFilling(true)
    log('Auto-fill: starting -- EmuMovies first, then SteamGridDB/YouTube for what remains', 'info')

    try {
      // Stage 1: EmuMovies -- scan directly rather than through
      // handleScanEmuMovies, since its result lands in state and wouldn't be
      // readable synchronously here. Still mirror it into emScanResult so
      // the EmuMovies tab shows the same results if visited afterward.
      setAutoFillStage('Scanning EmuMovies folder...')
      const emResult = await window.nuarcade.scanEmuMoviesMedia({ mediaPath: mmConfig?.mediaPath, games })
      setEmScanResult(emResult)

      if (emResult?.suggestions?.length) {
        const emTotal = emResult.suggestions.length
        log('Auto-fill: importing ' + emTotal + ' EmuMovies match(es)...', 'info')

        // Same batching as Import All -- reading/writing the entire artwork
        // registry on every single item compounds into minutes of silent
        // work at this scale, with no way to tell it's still running versus
        // stuck. Read once, accumulate in memory, flush periodically.
        let emArtwork = {}
        try { emArtwork = JSON.parse(localStorage.getItem('nuarcade_artwork') || '{}') } catch {}
        let emArtworkDirty = false
        let emVideoUpdated = false
        let emDone = 0

        for (let i = 0; i < emTotal; i++) {
          if (bulkCancelRef.current) break
          const s = emResult.suggestions[i]
          const chosenPath = s.chosenFile?.sourceFile
          setAutoFillStage('Importing EmuMovies matches... (' + (i + 1) + ' / ' + emTotal + ')')
          if (!chosenPath) continue

          try {
            const result = await window.nuarcade.importEmuMoviesFile({
              sourceFile: chosenPath,
              gameId: s.gameId,
              slot: s.slot,
              mediaPath: mmConfig?.mediaPath,
            })
            if (result.success) {
              emDone++
              if (s.slot === 'video') {
                setGames(g => g.map(x => (x.id || x.profile) === s.gameId ? { ...x, hasVideo: true } : x))
                emVideoUpdated = true
              } else {
                emArtwork[s.gameId] = { ...(emArtwork[s.gameId] || {}), [s.slot]: result.fileUrl }
                emArtworkDirty = true
              }
              setRestartNeeded(true)
            }
          } catch (e) {}

          if (emArtworkDirty && i % 50 === 0) {
            try { localStorage.setItem('nuarcade_artwork', JSON.stringify(emArtwork)) } catch {}
          }
        }

        if (emArtworkDirty) {
          try { localStorage.setItem('nuarcade_artwork', JSON.stringify(emArtwork)) } catch {}
          onArtworkUpdated?.()
        }
        if (emVideoUpdated) onVideosUpdated?.()

        log('Auto-fill: imported ' + emDone + ' / ' + emTotal + ' EmuMovies match(es)', 'ok')
      } else {
        log('Auto-fill: no EmuMovies matches found' + (emResult?.error ? ' (' + emResult.error + ')' : ''), 'warn')
      }

      // Stage 2: SteamGridDB -- only for games EmuMovies didn't cover
      if (!bulkCancelRef.current) {
        setAutoFillStage('Fetching remaining artwork from SteamGridDB...')
        log('Auto-fill: fetching remaining artwork from SteamGridDB...', 'info')
        let artwork = {}
        try { artwork = JSON.parse(localStorage.getItem('nuarcade_artwork') || '{}') } catch {}
        let artworkFound = 0
        let checked = 0
        for (const game of games) {
          if (bulkCancelRef.current) break
          if (game.isLauncher) continue
          const gid = game.id || game.profile
          if (artwork[gid]?.capsule || artwork[gid]?.hero) continue
          checked++
          try {
            const result = await fetchArtworkForGame(game.title)
            if (result?.capsule || result?.hero) {
              artwork[gid] = { ...(artwork[gid] || {}), ...result, source: 'sgdb' }
              artworkFound++
            }
          } catch (e) {}
          await new Promise(r => setTimeout(r, 200))
          if (checked % 10 === 0) {
            try { localStorage.setItem('nuarcade_artwork', JSON.stringify(artwork)) } catch {}
          }
        }
        try { localStorage.setItem('nuarcade_artwork', JSON.stringify(artwork)) } catch {}
        onArtworkUpdated?.()
        log('Auto-fill: SteamGridDB found artwork for ' + artworkFound + ' more game(s)', 'ok')
      }

      // Stage 3: YouTube -- only for games still missing video
      if (!bulkCancelRef.current) {
        setAutoFillStage('Fetching remaining video from YouTube...')
        log('Auto-fill: fetching remaining video from YouTube...', 'info')
        await handleBulkYouTube()
      }

      log(bulkCancelRef.current ? 'Auto-fill cancelled' : 'Auto-fill complete', bulkCancelRef.current ? 'warn' : 'ok')
    } catch (e) {
      log('Auto-fill exception: ' + (e.message || String(e)), 'error')
    }

    setAutoFillStage('')
    setAutoFilling(false)
  }

  const handleBulkYouTube = async () => {
    if (bulkRunning) {
      bulkCancelRef.current = true
      return
    }

    const ready = await handleEnsureYtdlp()
    if (!ready) return

    const missing = filteredGames.filter(g => !g.hasVideo)
    if (!missing.length) { log('No missing videos -- all games have clips', 'ok'); return }

    bulkCancelRef.current = false
    setBulkRunning(true)
    setBulkProgress({ current: 0, total: missing.length, title: '', done: 0, failed: 0 })
    log(`Starting YouTube bulk fetch -- ${missing.length} games, 2 parallel...`)

    let done = 0
    let failed = 0
    let processed = 0
    const CONCURRENCY = 2
    // Timeouts and network hiccups are often transient -- retrying just the
    // download step usually succeeds on a later attempt, so failed games
    // (specifically ones with a real search match that failed to download)
    // get queued for a couple of automatic extra passes before giving up,
    // rather than requiring Rome to manually re-run the whole bulk fetch.
    let retryQueue = []

    // Process one game: search + download
    const processGame = async (game, isRetryPass = false) => {
      if (bulkCancelRef.current) return
      const gid = game.id || game.profile
      const label = game.title || gid

      try {
        const result = await window.nuarcade.ytdlpSearch({
          gameTitle: label,
          gameId: gid,
          system: game.system || '',
          emulator: game.emulator || '',
          genre: game.genre || '',
        })

        if (bulkCancelRef.current) return

        if (result?.error || !result?.videoId) {
          failed++
          log(`  [${label}] No result: ${result?.error || 'no match'}`, 'warn')
          return
        }

        const queryNote = result.query && result.query !== label ? ' [' + result.query + ']' : ''
        const attemptNote = result.attempt > 1 ? ' (attempt ' + result.attempt + ')' : ''
        log(`  [${label}]${isRetryPass ? ' (retry)' : ''} Found: "${result.title}"${queryNote}${attemptNote}`)

        const dl = await window.nuarcade.ytdlpDownload({ videoId: result.videoId, gameId: gid })

        if (dl.success) {
          done++
          log(`  [${label}] Done`, 'ok')
          setGames(g => g.map(x => (x.id || x.profile) === gid ? { ...x, hasVideo: true } : x))
          setYtDownloading(d => ({ ...d, [gid]: 'done' }))
        } else {
          failed++
          log(`  [${label}] Failed: ${dl.error}`, 'error')
          setYtDownloading(d => ({ ...d, [gid]: 'error' }))
          // A real search match that failed to download is worth retrying --
          // "no match" cases (handled above) are not, since a retry would
          // just find the same lack of a result again.
          retryQueue.push(game)
        }
      } catch (e) {
        failed++
        log(`  [${label}] Exception: ${e.message || String(e)}`, 'error')
        retryQueue.push(game)
      } finally {
        processed++
        setBulkProgress({ current: processed, total: missing.length, title: label, done, failed })
      }
    }

    // Run in batches of CONCURRENCY
    for (let i = 0; i < missing.length; i += CONCURRENCY) {
      if (bulkCancelRef.current) {
        log(`Bulk fetch cancelled (${done} done, ${failed} failed)`, 'warn')
        break
      }
      const batch = missing.slice(i, i + CONCURRENCY)
      setBulkProgress({ current: processed, total: missing.length, title: batch.map(g => g.title || g.id || g.profile).join(', ').slice(0, 40), done, failed })
      await Promise.all(batch.map(g => processGame(g)))
    }

    // Up to 2 automatic retry passes for download failures -- each pass only
    // retries what's still failing, and stops early if a pass fixes nothing.
    const MAX_RETRY_PASSES = 2
    for (let pass = 1; pass <= MAX_RETRY_PASSES && retryQueue.length > 0 && !bulkCancelRef.current; pass++) {
      const toRetry = retryQueue
      retryQueue = []
      failed -= toRetry.length
      log(`Retry pass ${pass} -- retrying ${toRetry.length} failed download(s)...`)
      for (let i = 0; i < toRetry.length; i += CONCURRENCY) {
        if (bulkCancelRef.current) break
        const batch = toRetry.slice(i, i + CONCURRENCY)
        await Promise.all(batch.map(g => processGame(g, true)))
      }
    }

    log(`Bulk fetch complete -- ${done} downloaded, ${failed} failed`, done > 0 ? 'ok' : 'warn')
    setBulkProgress(p => ({ ...p, title: 'Complete', done, failed }))
    setBulkRunning(false)
    if (done > 0) onVideosUpdated?.()
    setTimeout(() => setBulkProgress(null), 6000)
  }

  const handleYtSearch = async (game) => {
    const gid = game.id || game.profile
    // Auto-install yt-dlp first if needed
    const ready = await handleEnsureYtdlp()
    if (!ready) return
    setYtSearching(s => ({ ...s, [gid]: true }))
    log(`YouTube search: "${game.title}"`)
    try {
      const result = await window.nuarcade.ytdlpSearch({
          gameTitle: game.title,
          gameId: gid,
          system: game.system || '',
          emulator: game.emulator || '',
          genre: game.genre || '',
        })
      if (result?.error) {
        log(`yt-dlp search error: ${result.error}`, 'error')
        setYtResults(r => ({ ...r, [gid]: null }))
      } else {
        const queryNote = result.query && result.query !== game.title ? ' [AI query: ' + result.query + ']' : ''
        const attemptNote = result.attempt > 1 ? ' (retry ' + (result.attempt - 1) + ')' : ''
        log(`YouTube found: "${result.title}" (${result.duration || '?'})${queryNote}${attemptNote}`, 'ok')
        setYtResults(r => ({ ...r, [gid]: result }))
      }
    } catch (e) {
      log(`yt-dlp exception: ${e.message || String(e)}`, 'error')
    }
    setYtSearching(s => ({ ...s, [gid]: false }))
  }

  const handleYtDownload = async (game) => {
    const gid = game.id || game.profile
    const result = ytResults[gid]
    if (!result?.videoId) { log('No YouTube result to download -- search first', 'warn'); return }
    setYtDownloading(d => ({ ...d, [gid]: 'downloading' }))
    log(`Downloading from YouTube: "${result.title}" (trimmed to 40s from gameplay start)...`)
    try {
      const dl = await window.nuarcade.ytdlpDownload({ videoId: result.videoId, gameId: gid })
      if (dl.success) {
        log(`YouTube download complete: ${dl.outputFile}${dl.startSec > 0 ? ' (gameplay starts at ' + Math.round(dl.startSec) + 's)' : ''}`, 'ok')
        setGames(g => g.map(x => (x.id || x.profile) === gid ? { ...x, hasVideo: true } : x))
        setYtDownloading(d => ({ ...d, [gid]: 'done' }))
        onVideosUpdated?.()
      } else {
        log(`YouTube download failed: ${dl.error}`, 'error')
        setYtDownloading(d => ({ ...d, [gid]: 'error' }))
      }
    } catch (e) {
      log(`yt-dlp download exception: ${e.message || String(e)}`, 'error')
      setYtDownloading(d => ({ ...d, [gid]: 'error' }))
    }
  }

  const gameSystemLabel = (g) => g.system || g.genre || g.emulator || 'Other'

  const availableSystems = [...new Set(games.map(gameSystemLabel))].sort()

  const filteredGames = games.filter(g => {
    if (systemFilter !== "all" && gameSystemLabel(g) !== systemFilter) return false
    if (filter === "missing") return !g.hasVideo
    if (filter === "ready") return g.hasVideo
    return true
  })

  const stats = {
    total: games.length,
    hasVideo: games.filter(g => g.hasVideo).length,
    missing: games.filter(g => !g.hasVideo).length,
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>Media Manager</div>
            <div className={styles.sub}>Artwork and video previews for your game library</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close (B)">X</button>
        </div>

        <div className={styles.tabs}>
          <button className={styles.tab + (tab === "library" ? " " + styles.tabActive : "")} onClick={() => setTab("library")}>Library</button>
          <button className={styles.tab + (tab === "artwork" ? " " + styles.tabActive : "")} onClick={() => setTab("artwork")}>Artwork</button>
          <button className={styles.tab + (tab === "emumovies" ? " " + styles.tabActive : "")} onClick={() => setTab("emumovies")}>EmuMovies</button>
          <button className={styles.tab + (tab === "about" ? " " + styles.tabActive : "")} onClick={() => setTab("about")}>About</button>
        </div>

        {restartNeeded && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '8px 16px', background: '#2a1f00', border: '1px solid #ffaa00',
            borderRadius: 6, margin: '0 16px 8px', position: 'sticky', top: 0, zIndex: 50,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            <span style={{ color: '#fff', fontSize: 12 }}>Restart required for imported media to show up.</span>
            <button
              style={{ padding: '6px 16px', background: '#ffaa00', color: '#000', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', fontSize: 12 }}
              onClick={() => setShowRestartConfirm(true)}
            >
              Restart Now
            </button>
          </div>
        )}

        {tab === "artwork" && (
          <div className={styles.body}>
            <div style={{ padding: '12px 0 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              Download box art, hero images and logos for all your games using SteamGridDB -- no account needed.
            </div>
            <ArtworkManager
              games={games}
              apiKey={mmConfig?.sgdbApiKey}
              onClose={() => setTab("library")}
              onArtworkUpdate={() => onArtworkUpdated?.()}
            />
          </div>
        )}

        {tab === "library" && (
          <div className={styles.body}>

            <div style={{
              fontSize: 12, fontWeight: 'bold', color: '#f59e0b',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 6, padding: '8px 12px', marginBottom: 10,
            }}>
              For YouTube downloads to work reliably, you need to be signed into YouTube in a browser on this PC.
              Without it, YouTube blocks most automated download attempts.
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.25)',
              borderRadius: 6, padding: '10px 14px', marginBottom: 10,
            }}>
              <button
                className={styles.scanBtn}
                style={{ borderColor: 'rgba(0,200,255,0.5)', flexShrink: 0 }}
                onClick={handleAutoFillEverything}
              >
                {autoFilling ? 'Cancel auto-fill' : 'Auto-fill Everything'}
              </button>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {autoFilling
                  ? autoFillStage || 'Working...'
                  : 'One click: EmuMovies first for every game, then SteamGridDB and YouTube fill in whatever is still missing.'}
              </div>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <div className={styles.statNum}>{stats.total}</div>
                <div className={styles.statLbl}>Total games</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum} style={{ color: "#00ff88" }}>{stats.hasVideo}</div>
                <div className={styles.statLbl}>Have video</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum} style={{ color: "#ffaa00" }}>{stats.missing}</div>
                <div className={styles.statLbl}>Missing video</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <button
                  className={styles.downloadAllBtn}
                  style={bulkRunning ? { borderColor: '#ff4444', color: '#ff4444', background: 'rgba(255,68,68,0.1)' } : {}}
                  onClick={handleBulkYouTube}
                  disabled={stats.missing === 0 && !bulkRunning}
                >
                  {bulkRunning ? 'Cancel fetch' : 'Auto-fetch via YouTube (2x parallel)'}
                </button>
                {bulkProgress && (
                  <div style={{ width: '100%', minWidth: 220 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'Share Tech Mono, monospace' }}>
                      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bulkProgress.title}
                      </span>
                      <span>{bulkProgress.current}/{bulkProgress.total}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                        background: bulkRunning ? '#00c8ff' : '#00ff88',
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 9, fontFamily: 'Share Tech Mono, monospace' }}>
                      <span style={{ color: '#00ff88' }}>{bulkProgress.done} done</span>
                      {bulkProgress.failed > 0 && <span style={{ color: '#ff4444' }}>{bulkProgress.failed} failed</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.filterRow}>
              {["all", "missing", "ready"].map(f => (
                <button
                  key={f}
                  className={styles.filterPill + (filter === f ? " " + styles.filterActive : "")}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <select
                className={styles.systemFilterSelect}
                style={{ maxWidth: 220, marginLeft: 8 }}
                value={systemFilter}
                onChange={e => setSystemFilter(e.target.value)}
              >
                <option value="all">All systems ({games.length})</option>
                {availableSystems.map(sys => (
                  <option key={sys} value={sys}>
                    {sys} ({games.filter(g => gameSystemLabel(g) === sys).length})
                  </option>
                ))}
              </select>
              <button className={styles.scanBtn} onClick={scanLibrary}>Rescan</button>
            </div>

            {loading ? (
              <div className={styles.loadingMsg}>
                <div className={styles.spinner} />
                Scanning game library...
              </div>
            ) : (
              <div className={styles.gameList} ref={scrollRef}>
                {filteredGames.map(game => (
                  <div key={game.id || game.profile} className={styles.gameRow}>
                    <div className={styles.gameThumb}>
                      {game.id
                        ? <img src={THUMBNAIL_BASE + game.id + ".png"} alt="" onError={e => e.target.style.display="none"} />
                        : <span style={{ fontSize: 20 }}>{game.icon || (game.emulator || "?").slice(0,3).toUpperCase()}</span>
                      }
                    </div>
                    <div className={styles.gameInfo}>
                      <div className={styles.gameName}>{game.title}</div>
                      <div className={styles.gameMeta}>{game.system}{game.system && game.genre ? " -- " : ""}{game.genre}</div>
                    </div>
                    <div className={styles.gameStatus}>
                      <span className={styles.statusBadge + " " + (game.hasVideo ? styles.badgeGreen : styles.badgeAmber)}>
                        {game.hasVideo ? "Has Video" : "No Video"}
                      </span>
                    </div>
                    <div className={styles.gameAction}>
                      {(() => {
                        const gid = game.id || game.profile
                        if (game.hasVideo) return <span className={styles.readyLabel}>Ready</span>

                        // yt-dlp download states
                        if (ytDownloading[gid] === 'downloading') return (
                          <div className={styles.dlProgress}>
                            <div className={styles.spinner} />
                            YT downloading...
                          </div>
                        )
                        if (ytDownloading[gid] === 'done') return <span className={styles.readyLabel}>Downloaded!</span>
                        if (ytDownloading[gid] === 'error') return (
                          <button
                            className={styles.dlBtn}
                            style={{ borderColor: 'rgba(255,68,68,0.4)', color: '#ff4444', fontSize: 10 }}
                            onClick={() => handleYtDownload(game)}
                          >
                            YT error -- retry
                          </button>
                        )

                        // yt-dlp result ready to download
                        if (ytResults[gid]) return (
                          <div className={styles.searchResult}>
                            {ytResults[gid].thumbnail && (
                              <img src={ytResults[gid].thumbnail} alt="" className={styles.ytThumb} onError={e => { e.target.style.display = 'none' }} />
                            )}
                            <div className={styles.ytSource} title={ytResults[gid].title}>
                              YT: {ytResults[gid].title.slice(0, 30)}{ytResults[gid].title.length > 30 ? '...' : ''}
                              {ytResults[gid].duration ? <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{ytResults[gid].duration}</span> : null}
                            </div>
                            <button className={styles.dlBtn} style={{ borderColor: 'rgba(255,80,80,0.4)', color: '#ff5050' }} onClick={() => handleYtDownload(game)}>
                              Get clip
                            </button>
                          </div>
                        )

                        // yt-dlp searching
                        if (ytSearching[gid]) return (
                          <div className={styles.dlProgress}>
                            <div className={styles.spinner} />
                            YouTube...
                          </div>
                        )

                        // yt-dlp installing
                        if (ytdlpInstalling) return (
                          <div className={styles.dlProgress}>
                            <div className={styles.spinner} />
                            Getting yt-dlp...
                          </div>
                        )

                        // Default: search YouTube for a gameplay clip
                        return (
                          <button className={styles.dlBtn} onClick={() => handleYtSearch(game)}>
                            Find video
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {tab === "emumovies" && (
          <div className={styles.body}>
            <div className={styles.settingsSection}>
              <div className={styles.sectionSub}>
                Scans folders populated by EmuMovies' official Sync desktop app and matches
                video/artwork files to your games. Run EmuMovies Sync first, pointed at
                {mmConfig?.mediaPath || 'F:\\Media\\'}EmuMovies. Nothing imports without your confirmation.
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, marginBottom: 4 }}>
                <input
                  className={styles.input}
                  style={{ flex: 1 }}
                  value={emMediaPath}
                  placeholder="F:\\Media"
                  onChange={e => setEmMediaPath(e.target.value)}
                  spellCheck={false}
                />
                <button className={styles.browseBtn || styles.dlBtn} onClick={handleBrowseMediaPath}>
                  Browse
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                No need to create this folder yourself -- the button below builds it from scratch,
                including this root path if it does not exist yet. This also updates your Settings
                Media folder to match.
              </div>

              <button
                ref={emCreateBtnRef}
                className={styles.scanBtn}
                onClick={handleCreateMediaFolders}
                disabled={creatingFolders}
                style={{
                  marginBottom: 8,
                  outline: emFocused === 'create' ? '2px solid #0ff' : 'none',
                  boxShadow: emFocused === 'create' ? '0 0 12px rgba(0,255,255,0.6)' : 'none',
                }}
              >
                {creatingFolders ? 'Creating...' : 'Create folder structure'}
              </button>

              {folderResult?.error && (
                <div style={{ color: '#ff8888', fontSize: 12, padding: '4px 0' }}>{folderResult.error}</div>
              )}
              {folderResult && !folderResult.error && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, padding: '4px 0 8px' }}>
                  Ready at {folderResult.root} -- {folderResult.createdCount} folder(s) created, {folderResult.skippedCount} already existed.
                  Point EmuMovies Sync's destination folder here.
                </div>
              )}

              <button
                ref={emScanBtnRef}
                className={styles.scanBtn}
                onClick={handleScanEmuMovies}
                disabled={emScanning}
                style={{
                  marginTop: 10, marginBottom: 12,
                  outline: emFocused === 'scan' ? '2px solid #0ff' : 'none',
                  boxShadow: emFocused === 'scan' ? '0 0 12px rgba(0,255,255,0.6)' : 'none',
                }}
              >
                {emScanning ? 'Scanning...' : 'Scan EmuMovies folder'}
              </button>

              {emScanResult?.error && (
                <div style={{ color: '#ff8888', fontSize: 12, padding: '6px 0' }}>{emScanResult.error}</div>
              )}

              {emScanResult && !emScanResult.error && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.85)' }}>
                    {emScanResult.suggestions.length === 0
                      ? 'No matching files found.'
                      : emScanResult.suggestions.length + ' file(s) found with possible matches.'}
                  </div>
                  {emScanResult.suggestions.length > 0 && (
                    <button
                      className={styles.dlBtn}
                      disabled={importingAll}
                      onClick={handleImportAll}
                    >
                      {importingAll
                        ? 'Importing ' + importProgress.current + ' / ' + importProgress.total + '...'
                        : 'Import All'}
                    </button>
                  )}
                </div>
              )}

              {emScanResult?.suggestions?.map(s => {
                const key = s.gameId + '|' + s.slot
                const status = emImported[key]
                const chosenPath = emPick[key] ?? s.chosenFile?.sourceFile ?? ''
                const allFiles = [s.chosenFile, ...(s.alternateFiles || [])].filter(Boolean)
                const slotLabel = s.slot === 'video' ? 'Video' : s.slot === 'capsule' ? 'Box art' : 'Backdrop'
                return (
                  <div key={key} style={{
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: 10, marginBottom: 8,
                    background: status === 'done' ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
                  }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#fff', marginBottom: 2 }}>
                      {s.gameTitle} <span style={{ color: 'rgba(255,255,255,0.35)' }}>({slotLabel})</span>
                    </div>
                    {status === 'done' ? (
                      <div style={{ color: '#00ff88', fontSize: 12 }}>Imported</div>
                    ) : status === 'error' ? (
                      <div style={{ color: '#ff4444', fontSize: 12 }}>Import failed -- see log</div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                          className={styles.input}
                          style={{ flex: 1, minWidth: 240 }}
                          value={chosenPath}
                          onChange={e => setEmPick(prev => ({ ...prev, [key]: e.target.value }))}
                        >
                          {allFiles.map(f => (
                            <option key={f.sourceFile} value={f.sourceFile}>
                              {f.subfolder} -- {f.system} ({Math.round(f.score * 100)}% match{f === s.chosenFile ? ', best' : ''})
                            </option>
                          ))}
                        </select>
                        <button
                          className={styles.dlBtn}
                          disabled={!chosenPath}
                          onClick={() => handleImportEmuMovies(s, chosenPath)}
                        >
                          Import
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === "about" && (
          <div className={styles.body}>
            <div className={styles.settingsSection}>
              <div className={styles.sectionTitle}>How videos work</div>
              <div className={styles.sectionSub}>
                NuArcade uses YouTube for video previews and SteamGridDB for artwork.
                Videos are saved to F:/Media/Videos/ and play on the center card when you select a game.
                No account needed. No manual setup required.
              </div>
            </div>

            <div className={styles.settingsSection}>
              <div className={styles.sectionTitle}>Manual video drop</div>
              <div className={styles.sectionSub}>
                You can also drop any .mp4 file into F:/Media/Videos/ named after the game profile.
              </div>
              <div className={styles.pathDisplay}>
                <div className={styles.pathRow}>
                  <span className={styles.pathLabel}>Videos</span>
                  <span className={styles.pathValue}>F:/Media/Videos/</span>
                </div>
                <div className={styles.pathRow}>
                  <span className={styles.pathLabel}>Example</span>
                  <span className={styles.pathValue}>WanganMidnightMaximumTune5DX.mp4</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {diagLog.length > 0 && (
          <div className={styles.diagPanel}>
            <div className={styles.diagHeader}>
              Diagnostic Log
              <button className={styles.diagClear} onClick={() => setDiagLog([])}>Clear</button>
            </div>
            <div className={styles.diagBody}>
              {diagLog.map((entry, i) => (
                <div key={i} className={styles.diagLine} style={{
                  color: entry.type === 'error' ? '#ef4444' :
                         entry.type === 'warn'  ? '#f59e0b' :
                         entry.type === 'ok'    ? '#00ff88' :
                         'rgba(255,255,255,0.6)'
                }}>
                  <span className={styles.diagTs}>{entry.ts}</span>
                  {entry.msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showRestartConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, flexDirection: 'column', gap: 20,
        }}>
          <div style={{ color: '#ffaa00', fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: 3 }}>NUARCADE</div>
          <div style={{ color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: 20, letterSpacing: 2 }}>Restart Now?</div>
          <div style={{ color: '#aaa', fontFamily: 'Share Tech Mono, monospace', fontSize: 12, textAlign: 'center', maxWidth: 360 }}>
            NuArcade needs to restart to show the media you just imported.
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <button style={{ padding: '10px 32px', background: '#ffaa00', color: '#000', border: 'none', borderRadius: 6, fontFamily: 'Orbitron, monospace', fontSize: 14, cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => window.nuarcade?.restartApp?.()}>YES</button>
            <button style={{ padding: '10px 32px', background: '#222', color: '#aaa', border: '1px solid #444', borderRadius: 6, fontFamily: 'Orbitron, monospace', fontSize: 14, cursor: 'pointer' }}
              onClick={() => setShowRestartConfirm(false)}>NO</button>
          </div>
        </div>
      )}
    </div>
  )
}
