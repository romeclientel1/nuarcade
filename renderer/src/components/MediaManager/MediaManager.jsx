import { useState, useEffect, useRef } from "react"
import styles from "./MediaManager.module.css"
import ArtworkManager from "../ArtworkManager/ArtworkManager"

const THUMBNAIL_BASE = "https://raw.githubusercontent.com/teknogods/TeknoParrotUIThumbnails/master/Icons/"

const SAMPLE_GAMES = [
  { id: "wanganmd",               title: "Wangan Midnight MT 5DX+",    genre: "Racing",   system: "SEGA Nu",     hasVideo: false },
  { id: "CruisnBlast",            title: "Cruis n Blast",              genre: "Racing",   system: "Raw Thrills", hasVideo: false },
  { id: "AliensArmageddon",       title: "Aliens Armageddon",          genre: "Shooter",  system: "Raw Thrills", hasVideo: false },
  { id: "DariusBurst",            title: "Dariusburst Another Chron",  genre: "Shooter",  system: "Taito X2",    hasVideo: false },
  { id: "CrossbeatsRev",          title: "Crossbeats Rev Sunrise",     genre: "Rhythm",   system: "SEGA Nu",     hasVideo: false },
  { id: "BlazBlueCrossTagBattle", title: "BlazBlue Cross Tag Battle",  genre: "Fighting", system: "NESiCAxLive", hasVideo: false },
]

export default function MediaManager({ onClose, onVideosUpdated }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [tab, setTab] = useState("library")
  const [showArtworkMgr, setShowArtworkMgr] = useState(false)
  const [mmConfig, setMmConfig] = useState({})
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState({})
  const [searchResults, setSearchResults] = useState({})
  const [ssReady, setSsReady] = useState(false)
  const [ytResults, setYtResults] = useState({})
  const [ytSearching, setYtSearching] = useState({})
  const [ytDownloading, setYtDownloading] = useState({})
  const [ytdlpAvailable, setYtdlpAvailable] = useState(null) // null=unknown, true, false
  const [ytdlpInstalling, setYtdlpInstalling] = useState(false)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null) // { current, total, title, done, failed }
  const bulkCancelRef = useRef(false)

  useEffect(() => {
    scanLibrary()
    checkSsCredentials()
    window.nuarcade?.getConfig?.().then(cfg => {
      setMmConfig(cfg || {})
      // Check if yt-dlp.exe actually exists on disk
      if (window.nuarcade?.checkPath && cfg?.ytdlpPath) {
        window.nuarcade.checkPath(cfg.ytdlpPath).then(r => setYtdlpAvailable(!!r?.exists)).catch(() => setYtdlpAvailable(false))
      }
    }).catch(() => {})
  }, [])

  const checkSsCredentials = async () => {
    try {
      const cfg = await window.nuarcade?.getConfig()
      setSsReady(!!(cfg?.screenscraper?.user && cfg?.screenscraper?.pass))
    } catch {}
  }

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
        ]
        for (const scanner of scanners) {
          try {
            const result = await scanner()
            if (result && result.games && result.games.length > 0) {
              gameList = [...gameList, ...result.games.map(g => ({ ...g, hasVideo: false }))]
            }
          } catch {}
        }
        // Check existing artwork
        try {
          const artwork = JSON.parse(localStorage.getItem("nuarcade_artwork") || "{}")
          const videos  = JSON.parse(localStorage.getItem("nuarcade_videos")  || "{}")
          gameList = gameList.map(g => ({
            ...g,
            hasArtwork: !!(artwork[g.id || g.profile]),
            hasVideo:   !!(videos[g.id || g.profile]),
          }))
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
    setDiagLog(prev => [...prev.slice(-49), { ts, msg, type }])
  }

  const handleSearch = async (game) => {
    const gid = game.id || game.profile
    setPreviewing(p => ({ ...p, [gid]: "searching" }))
    log(`Searching ScreenScraper for: "${game.title}"`)
    try {
      if (window.nuarcade && window.nuarcade.searchVideo) {
        const result = await window.nuarcade.searchVideo(game.title)
        if (result && result.error) {
          log(`SS error: ${result.error}`, 'error')
          setPreviewing(p => ({ ...p, [gid]: "notfound" }))
        } else if (result && result.url) {
          log(`Found game ID: ${result.videoId} -- "${result.title}"`, 'ok')
          log(`Video URL: ${result.url}`, 'ok')
          setSearchResults(r => ({ ...r, [gid]: result }))
          setPreviewing(p => ({ ...p, [gid]: "found" }))
        } else {
          log(`No video found on ScreenScraper for "${game.title}"`, 'warn')
          setPreviewing(p => ({ ...p, [gid]: "notfound" }))
        }
      } else {
        log('window.nuarcade.searchVideo not available -- check preload', 'error')
        setPreviewing(p => ({ ...p, [gid]: "notfound" }))
      }
    } catch (e) {
      log(`Search error: ${e.message || String(e)}`, 'error')
      setPreviewing(p => ({ ...p, [gid]: "notfound" }))
    }
  }

  const handleDownload = async (game) => {
    const gid = game.id || game.profile
    const result = searchResults[gid]
    if (!result) { log(`No search result for ${game.title} -- search first`, 'warn'); return }

    setDownloading(d => ({ ...d, [gid]: "downloading" }))
    log(`Downloading video for "${game.title}"...`)
    try {
      if (window.nuarcade && window.nuarcade.downloadVideo) {
        const dl = await window.nuarcade.downloadVideo({
          videoUrl: result.url,
          gameId: gid,
        })
        if (dl.success) {
          log(`Downloaded OK -- saved to ${dl.outputFile}`, 'ok')
          setGames(g => g.map(x => (x.id || x.profile) === gid ? { ...x, hasVideo: true } : x))
          setDownloading(d => ({ ...d, [gid]: "done" }))
        } else {
          log(`Download failed: ${dl.error || 'unknown error'}`, 'error')
          setDownloading(d => ({ ...d, [gid]: "error" }))
        }
      } else {
        log('window.nuarcade.downloadVideo not available', 'error')
        setDownloading(d => ({ ...d, [gid]: "error" }))
      }
    } catch (e) {
      log(`Download exception: ${e.message || String(e)}`, 'error')
      setDownloading(d => ({ ...d, [gid]: "error" }))
    }
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

  const handleDownloadAll = async () => {
    // Legacy SS bulk -- kept but SS doesn't work without dev creds
    const missing = filteredGames.filter(g => !g.hasVideo)
    for (const game of missing) {
      const gid = game.id || game.profile
      if (!searchResults[gid]) await handleSearch(game)
      await handleDownload(game)
    }
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
    log(`Starting YouTube bulk fetch -- ${missing.length} games, 4 parallel...`)

    let done = 0
    let failed = 0
    let processed = 0
    const CONCURRENCY = 4

    // Process one game: search + download
    const processGame = async (game) => {
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
        log(`  [${label}] Found: "${result.title}"${queryNote}`)

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
        }
      } catch (e) {
        failed++
        log(`  [${label}] Exception: ${e.message || String(e)}`, 'error')
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
      await Promise.all(batch.map(processGame))
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
        log(`YouTube found: "${result.title}" (${result.duration || '?'})${queryNote}`, 'ok')
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

  const filteredGames = games.filter(g => {
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
          <button className={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        <div className={styles.tabs}>
          <button className={styles.tab + (tab === "library" ? " " + styles.tabActive : "")} onClick={() => setTab("library")}>Library</button>
          <button className={styles.tab + (tab === "artwork" ? " " + styles.tabActive : "")} onClick={() => setTab("artwork")}>Artwork</button>
          <button className={styles.tab + (tab === "about" ? " " + styles.tabActive : "")} onClick={() => setTab("about")}>About</button>
        </div>

        {tab === "artwork" && (
          <div className={styles.body}>
            <div style={{ padding: '12px 0 8px', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              Download box art, hero images and logos for all your games using SteamGridDB -- no account needed.
            </div>
            <ArtworkManager
              games={games}
              apiKey={mmConfig?.sgdbApiKey}
              ssUser={mmConfig?.screenscraper?.user}
              ssPass={mmConfig?.screenscraper?.pass}
              onClose={() => setTab("library")}
              onArtworkUpdate={() => {}}
            />
          </div>
        )}

        {tab === "library" && (
          <div className={styles.body}>

            {!ssReady && (
              <div className={styles.warningBanner}>
                Add your ScreenScraper credentials in Settings to enable video downloads.
              </div>
            )}

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
                  {bulkRunning ? 'Cancel fetch' : 'Auto-fetch via YouTube (4x parallel)'}
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
              <button className={styles.scanBtn} onClick={scanLibrary}>Rescan</button>
            </div>

            {loading ? (
              <div className={styles.loadingMsg}>
                <div className={styles.spinner} />
                Scanning game library...
              </div>
            ) : (
              <div className={styles.gameList}>
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
                        if (ytDownloading[gid] === 'error') return <span style={{ color: '#ff4444', fontSize: 10 }}>YT error -- retry?</span>

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

                        // SS download states
                        if (downloading[gid] === 'downloading') return (
                          <div className={styles.dlProgress}>
                            <div className={styles.spinner} />
                            Downloading...
                          </div>
                        )
                        if (downloading[gid] === 'done') return <span className={styles.readyLabel}>Downloaded!</span>
                        if (downloading[gid] === 'error') return (
                          <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ color: '#ff4444', fontSize: 10 }}>SS error</span>
                            <button className={styles.dlBtn} style={{ borderColor: 'rgba(255,80,80,0.4)', color: '#ff5050' }} onClick={() => handleYtSearch(game)}>
                              Try YouTube
                            </button>
                          </div>
                        )

                        // SS searching
                        if (previewing[gid] === 'searching') return (
                          <div className={styles.dlProgress}>
                            <div className={styles.spinner} />
                            Searching SS...
                          </div>
                        )

                        // SS found -- ready to download
                        if (searchResults[gid]) return (
                          <div className={styles.searchResult}>
                            {searchResults[gid].thumbnail && (
                              <img src={searchResults[gid].thumbnail} alt="" className={styles.ytThumb} onError={e => { e.target.style.display = 'none' }} />
                            )}
                            <div className={styles.ytTitle}>{(searchResults[gid].title || '').slice(0, 35)}</div>
                            <button className={styles.dlBtn} onClick={() => handleDownload(game)}>
                              Download
                            </button>
                          </div>
                        )

                        // SS returned not-found -- offer YouTube fallback
                        if (previewing[gid] === 'notfound') return (
                          <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>Not on SS</span>
                            <button className={styles.dlBtn} style={{ borderColor: 'rgba(255,80,80,0.4)', color: '#ff5050' }} onClick={() => handleYtSearch(game)}>
                              Try YouTube
                            </button>
                          </div>
                        )

                        // Default: Find video button (try SS first)
                        return (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className={styles.dlBtn} onClick={() => handleSearch(game)}>
                              Find video
                            </button>
                            <button className={styles.dlBtn} style={{ borderColor: 'rgba(255,80,80,0.3)', color: 'rgba(255,80,80,0.7)' }} onClick={() => handleYtSearch(game)} title="Search YouTube directly">
                              YT
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                ))}
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
        )}

        {tab === "about" && (
          <div className={styles.body}>
            <div className={styles.settingsSection}>
              <div className={styles.sectionTitle}>How videos work</div>
              <div className={styles.sectionSub}>
                NuArcade uses ScreenScraper for video previews and SteamGridDB for artwork.
                Videos are saved to F:/Media/Videos/ and play on the center card when you select a game.
                No account needed. No manual setup required.
              </div>
              <div className={styles.sectionSub} style={{ marginTop: 12 }}>
                Add your free ScreenScraper account in Settings to enable video previews.
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
      </div>
    </div>
  )
}
