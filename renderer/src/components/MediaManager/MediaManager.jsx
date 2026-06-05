import { useState, useEffect } from 'react'
import styles from './MediaManager.module.css'

const EMUMOVIES_API = 'https://api.emumovies.com'

export default function MediaManager({ onClose }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [loggedIn, setLoggedIn] = useState(false)
  const [token, setToken] = useState(null)
  const [downloading, setDownloading] = useState({})
  const [filter, setFilter] = useState('all')
  const [tab, setTab] = useState('library') // 'library' | 'settings'

  useEffect(() => {
    scanLibrary()
  }, [])

  const scanLibrary = async () => {
    setScanning(true)
    try {
      let gameList = []

      if (window.nuarcade && window.nuarcade.platform === 'win32') {
        const config = await window.nuarcade.getConfig()
        const result = await window.nuarcade.scanGames(
          config.teknoParrotPath,
          config.gamesFolderPath
        )
        gameList = result.games || []
      } else {
        // Dev mode — use sample data
        gameList = SAMPLE_GAMES
      }

      // Check which games have artwork and video
      const enriched = gameList.map(g => ({
        ...g,
        hasArtwork: !!g.id,
        hasVideo: false, // will check via IPC on Windows
        downloading: false,
      }))

      setGames(enriched)
    } catch (e) {
      console.error('Scan error:', e)
    } finally {
      setScanning(false)
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    // EmuMovies auth — in production hits real API
    // For now simulate success
    setLoggedIn(true)
    setToken('demo_token')
  }

  const handleDownload = async (game) => {
    setDownloading(d => ({ ...d, [game.id]: true }))
    // Real implementation calls EmuMovies API to get video URL
    // then downloads to F:\Media\Videos\{game.id}.mp4
    await new Promise(r => setTimeout(r, 2000))
    setGames(g => g.map(x => x.id === game.id ? { ...x, hasVideo: true } : x))
    setDownloading(d => ({ ...d, [game.id]: false }))
  }

  const handleDownloadAll = async () => {
    const missing = filteredGames.filter(g => !g.hasVideo)
    for (const game of missing) {
      await handleDownload(game)
    }
  }

  const filteredGames = games.filter(g => {
    if (filter === 'missing') return !g.hasVideo
    if (filter === 'ready') return g.hasVideo
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
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'library' ? styles.tabActive : ''}`}
            onClick={() => setTab('library')}
          >
            Library
          </button>
          <button
            className={`${styles.tab} ${tab === 'settings' ? styles.tabActive : ''}`}
            onClick={() => setTab('settings')}
          >
            EmuMovies
          </button>
        </div>

        {tab === 'library' && (
          <div className={styles.body}>
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <div className={styles.statNum}>{stats.total}</div>
                <div className={styles.statLbl}>Total games</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum} style={{ color: '#00ff88' }}>{stats.hasVideo}</div>
                <div className={styles.statLbl}>Have video</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum} style={{ color: '#ffaa00' }}>{stats.missing}</div>
                <div className={styles.statLbl}>Missing video</div>
              </div>
              <button
                className={styles.downloadAllBtn}
                onClick={handleDownloadAll}
                disabled={!loggedIn || stats.missing === 0}
              >
                ⬇ Download all missing
              </button>
            </div>

            <div className={styles.filterRow}>
              {['all', 'missing', 'ready'].map(f => (
                <button
                  key={f}
                  className={`${styles.filterPill} ${filter === f ? styles.filterActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <button className={styles.scanBtn} onClick={scanLibrary} disabled={scanning}>
                {scanning ? '⟳ Scanning...' : '⟳ Rescan'}
              </button>
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
                      {game.hasArtwork
                        ? <img src={`https://raw.githubusercontent.com/teknogods/TeknoParrotUIThumbnails/master/Icons/${game.id}.png`} alt="" onError={e => e.target.style.display='none'} />
                        : <span style={{ fontSize: 20 }}>{game.icon || '🎮'}</span>
                      }
                    </div>
                    <div className={styles.gameInfo}>
                      <div className={styles.gameName}>{game.title}</div>
                      <div className={styles.gameMeta}>{game.system} · {game.genre}</div>
                    </div>
                    <div className={styles.gameStatus}>
                      <span className={`${styles.statusBadge} ${game.hasArtwork ? styles.badgeGreen : styles.badgeGray}`}>
                        {game.hasArtwork ? '✓' : '✗'} Art
                      </span>
                      <span className={`${styles.statusBadge} ${game.hasVideo ? styles.badgeGreen : styles.badgeAmber}`}>
                        {game.hasVideo ? '✓' : '✗'} Video
                      </span>
                    </div>
                    <div className={styles.gameAction}>
                      {game.hasVideo ? (
                        <span className={styles.readyLabel}>Ready</span>
                      ) : downloading[game.id] ? (
                        <div className={styles.dlProgress}>
                          <div className={styles.spinner} />
                          Downloading...
                        </div>
                      ) : (
                        <button
                          className={styles.dlBtn}
                          onClick={() => handleDownload(game)}
                          disabled={!loggedIn}
                          title={!loggedIn ? 'Connect EmuMovies first' : 'Download video'}
                        >
                          ⬇ Download
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className={styles.body}>
            <div className={styles.settingsSection}>
              <div className={styles.sectionTitle}>EmuMovies Account</div>
              <div className={styles.sectionSub}>
                EmuMovies provides high quality gameplay videos and artwork for arcade games.
                Create a free account at emumovies.com to enable downloads.
              </div>

              {loggedIn ? (
                <div className={styles.loggedInMsg}>
                  ✓ Connected to EmuMovies
                  <button className={styles.logoutBtn} onClick={() => { setLoggedIn(false); setToken(null) }}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className={styles.loginForm}>
                  <div className={styles.inputRow}>
                    <label className={styles.inputLabel}>Username</label>
                    <input
                      className={styles.input}
                      value={credentials.username}
                      onChange={e => setCredentials(c => ({ ...c, username: e.target.value }))}
                      placeholder="EmuMovies username"
                    />
                  </div>
                  <div className={styles.inputRow}>
                    <label className={styles.inputLabel}>Password</label>
                    <input
                      className={styles.input}
                      type="password"
                      value={credentials.password}
                      onChange={e => setCredentials(c => ({ ...c, password: e.target.value }))}
                      placeholder="EmuMovies password"
                    />
                  </div>
                  <button className={styles.loginBtn} onClick={handleLogin}>
                    Connect EmuMovies
                  </button>
                </div>
              )}
            </div>

            <div className={styles.settingsSection}>
              <div className={styles.sectionTitle}>Media paths</div>
              <div className={styles.pathDisplay}>
                <div className={styles.pathRow}>
                  <span className={styles.pathLabel}>Videos</span>
                  <span className={styles.pathValue}>F:\Media\Videos\</span>
                </div>
                <div className={styles.pathRow}>
                  <span className={styles.pathLabel}>Artwork</span>
                  <span className={styles.pathValue}>F:\Media\Artwork\</span>
                </div>
              </div>
              <div className={styles.pathNote}>
                Drop .mp4 files named after game profiles into the Videos folder.
                Example: WanganMidnightMaximumTune5DX.mp4
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const SAMPLE_GAMES = [
  { id: 'wanganmd',               title: 'Wangan Midnight MT 5DX+',    genre: 'Racing',   system: 'SEGA Nu',        status: 'Perfect', profile: 'WanganMidnightMaximumTune5DX.xml',  icon: '🏎️', hasArtwork: true,  hasVideo: false },
  { id: 'CruisnBlast',            title: "Cruis'n Blast",              genre: 'Racing',   system: 'Raw Thrills',    status: 'Perfect', profile: 'CruisnBlast.xml',                   icon: '💥', hasArtwork: true,  hasVideo: false },
  { id: 'AliensArmageddon',       title: 'Aliens Armageddon',          genre: 'Shooter',  system: 'Raw Thrills',    status: 'Perfect', profile: 'AliensArmageddon.xml',               icon: '👾', hasArtwork: true,  hasVideo: true  },
  { id: 'DariusBurst',            title: 'Dariusburst Another Chron.', genre: 'Shooter',  system: 'Taito Type X2',  status: 'Perfect', profile: 'DariusBurstAnotherChronicle.xml',    icon: '🐟', hasArtwork: true,  hasVideo: false },
  { id: 'CrossbeatsRev',          title: 'Crossbeats Rev Sunrise',     genre: 'Rhythm',   system: 'SEGA Nu',        status: 'Perfect', profile: 'crossbeatsREVSUNRISE.xml',           icon: '🎵', hasArtwork: true,  hasVideo: false },
  { id: 'BlazBlueCrossTagBattle', title: 'BlazBlue Cross Tag Battle',  genre: 'Fighting', system: 'NESiCAxLive',    status: 'Perfect', profile: 'BlazBlueCrossTagBattle.xml',         icon: '🌀', hasArtwork: true,  hasVideo: false },
  { id: null, title: 'House of the Dead 4',      genre: 'Shooter',  system: 'SEGA Lindbergh', status: 'Perfect', profile: 'HouseOfTheDead4Special.xml',     icon: '🧟', hasArtwork: false, hasVideo: false },
  { id: null, title: 'After Burner Climax',      genre: 'Flying',   system: 'SEGA Lindbergh', status: 'Perfect', profile: 'AfterBurnerClimax.xml',          icon: '✈️', hasArtwork: false, hasVideo: false },
]