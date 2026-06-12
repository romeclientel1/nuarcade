import { useState, useEffect } from "react"
import styles from "./MediaManager.module.css"

const THUMBNAIL_BASE = "https://raw.githubusercontent.com/teknogods/TeknoParrotUIThumbnails/master/Icons/"

const SAMPLE_GAMES = [
  { id: "wanganmd",               title: "Wangan Midnight MT 5DX+",    genre: "Racing",   system: "SEGA Nu",     hasVideo: false },
  { id: "CruisnBlast",            title: "Cruis n Blast",              genre: "Racing",   system: "Raw Thrills", hasVideo: false },
  { id: "AliensArmageddon",       title: "Aliens Armageddon",          genre: "Shooter",  system: "Raw Thrills", hasVideo: false },
  { id: "DariusBurst",            title: "Dariusburst Another Chron",  genre: "Shooter",  system: "Taito X2",    hasVideo: false },
  { id: "CrossbeatsRev",          title: "Crossbeats Rev Sunrise",     genre: "Rhythm",   system: "SEGA Nu",     hasVideo: false },
  { id: "BlazBlueCrossTagBattle", title: "BlazBlue Cross Tag Battle",  genre: "Fighting", system: "NESiCAxLive", hasVideo: false },
]

export default function MediaManager({ onClose }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [tab, setTab] = useState("library")
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState({})
  const [searchResults, setSearchResults] = useState({})
  const [ssReady, setSsReady] = useState(false)

  useEffect(() => {
    scanLibrary()
    checkSsCredentials()
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

  const handleSearch = async (game) => {
    setPreviewing(p => ({ ...p, [game.id]: "searching" }))
    try {
      if (window.nuarcade && window.nuarcade.searchVideo) {
        const result = await window.nuarcade.searchVideo(game.title + " arcade gameplay")
        setSearchResults(r => ({ ...r, [game.id]: result }))
        setPreviewing(p => ({ ...p, [game.id]: result ? "found" : "notfound" }))
      } else {
        // Dev mode simulation
        await new Promise(r => setTimeout(r, 800))
        setSearchResults(r => ({ ...r, [game.id]: {
          videoId: "dQw4w9WgXcQ",
          title: game.title + " Gameplay",
          url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
        }}))
        setPreviewing(p => ({ ...p, [game.id]: "found" }))
      }
    } catch {
      setPreviewing(p => ({ ...p, [game.id]: "notfound" }))
    }
  }

  const handleDownload = async (game) => {
    const result = searchResults[game.id]
    if (!result) return

    setDownloading(d => ({ ...d, [game.id]: "downloading" }))
    try {
      if (window.nuarcade && window.nuarcade.downloadVideo) {
        const dl = await window.nuarcade.downloadVideo({
          videoUrl: result.url,
          gameId: game.id,
        })
        if (dl.success) {
          setGames(g => g.map(x => x.id === game.id ? { ...x, hasVideo: true } : x))
          setDownloading(d => ({ ...d, [game.id]: "done" }))
        } else {
          setDownloading(d => ({ ...d, [game.id]: "error" }))
        }
      } else {
        // Dev mode
        await new Promise(r => setTimeout(r, 2000))
        setGames(g => g.map(x => x.id === game.id ? { ...x, hasVideo: true } : x))
        setDownloading(d => ({ ...d, [game.id]: "done" }))
      }
    } catch {
      setDownloading(d => ({ ...d, [game.id]: "error" }))
    }
  }

  const handleDownloadAll = async () => {
    const missing = filteredGames.filter(g => !g.hasVideo)
    for (const game of missing) {
      if (!searchResults[game.id]) await handleSearch(game)
      await handleDownload(game)
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
          <button className={styles.tab + (tab === "about" ? " " + styles.tabActive : "")} onClick={() => setTab("about")}>About</button>
        </div>

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
              <button className={styles.downloadAllBtn} onClick={handleDownloadAll} disabled={stats.missing === 0}>
                Download all missing
              </button>
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
                      {game.hasVideo ? (
                        <span className={styles.readyLabel}>Ready</span>
                      ) : downloading[game.id] === "downloading" ? (
                        <div className={styles.dlProgress}>
                          <div className={styles.spinner} />
                          Downloading...
                        </div>
                      ) : downloading[game.id] === "done" ? (
                        <span className={styles.readyLabel}>Downloaded!</span>
                      ) : downloading[game.id] === "error" ? (
                        <span style={{ color: "#ff4444", fontSize: 10 }}>Error -- tap to retry</span>
                      ) : previewing[game.id] === "searching" ? (
                        <div className={styles.dlProgress}>
                          <div className={styles.spinner} />
                          Searching...
                        </div>
                      ) : searchResults[game.id] ? (
                        <div className={styles.searchResult}>
                          <img src={searchResults[game.id].thumbnail} alt="" className={styles.ytThumb} />
                          <div className={styles.ytTitle}>{searchResults[game.id].title.slice(0, 40)}</div>
                          <button className={styles.dlBtn} onClick={() => handleDownload(game)}>
                            Download
                          </button>
                        </div>
                      ) : (
                        <button className={styles.dlBtn} onClick={() => handleSearch(game)}>
                          Find video
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
