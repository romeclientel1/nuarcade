import { useState } from 'react'
import styles from './Screen.module.css'
import mStyles from './MediaScreen.module.css'

export default function MediaScreen({ config, next, prev }) {
  const [artStatus, setArtStatus] = useState('idle') // idle | running | done | error
  const [artCount, setArtCount] = useState(0)
  const [artError, setArtError] = useState(null)
  const [showEmuMovies, setShowEmuMovies] = useState(false)

  const games = config.scannedGames || []
  const SGDB_KEY = '8e15be83af3c9840a1a26987bdf6fd13'

  async function fetchArt() {
    if (artStatus === 'running') return
    setArtStatus('running')
    setArtCount(0)
    setArtError(null)

    let fetched = 0
    const existing = JSON.parse(localStorage.getItem('nuarcade_artwork') || '{}')

    for (const game of games) {
      const key = game.id || game.profile || game.title
      if (!key) continue
      if (existing[key]?.hero) { fetched++; continue }

      try {
        const searchRes = await fetch(
          'https://www.steamgriddb.com/api/v2/search/autocomplete/' + encodeURIComponent(game.title),
          { headers: { Authorization: 'Bearer ' + SGDB_KEY } }
        )
        const searchData = await searchRes.json()
        const gameId = searchData.data?.[0]?.id
        if (!gameId) continue

        const heroRes = await fetch(
          'https://www.steamgriddb.com/api/v2/heroes/game/' + gameId + '?limit=1',
          { headers: { Authorization: 'Bearer ' + SGDB_KEY } }
        )
        const heroData = await heroRes.json()
        const heroUrl = heroData.data?.[0]?.url
        if (!heroUrl) continue

        existing[key] = { ...(existing[key] || {}), hero: heroUrl }
        fetched++
        setArtCount(fetched)
        localStorage.setItem('nuarcade_artwork', JSON.stringify(existing))
      } catch (e) {
        // skip individual failures
      }
    }

    setArtCount(fetched)
    setArtStatus('done')
  }

  function openEmuMovies() {
    window.nuarcade.openUrl('https://emumovies.com')
  }

  function pickSnapsFolder() {
    window.nuarcade.pickFolder().then(folder => {
      if (folder) {
        window.nuarcade.linkSnapsFolder( folder)
      }
    })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 7 of 8</div>
      <div className={styles.title}>Get Media</div>
      <div className={styles.sub}>
        Choose how to get artwork and video snaps for your games.
        You can always add more later.
      </div>

      <div className={mStyles.optionGrid}>

        {/* Option A - SteamGridDB */}
        <div className={mStyles.optionCard + (artStatus === 'done' ? ' ' + mStyles.done : '')}>
          <div className={mStyles.optionBadge}>A</div>
          <div className={mStyles.optionTitle}>Fetch Art Now</div>
          <div className={mStyles.optionDesc}>
            Downloads hero artwork for your games from SteamGridDB.
            Works immediately, no account needed. Art shows on game cards right away.
          </div>
          {artStatus === 'idle' && (
            <button className={mStyles.optionBtn} onClick={fetchArt}>
              Fetch Art
            </button>
          )}
          {artStatus === 'running' && (
            <div className={mStyles.progress}>
              Fetching... {artCount} / {games.length}
            </div>
          )}
          {artStatus === 'done' && (
            <div className={mStyles.successMsg}>
              Done - {artCount} games have art
            </div>
          )}
          {artStatus === 'error' && (
            <div className={mStyles.errorMsg}>{artError}</div>
          )}
        </div>

        {/* Option B - EmuMovies */}
        <div className={mStyles.optionCard}>
          <div className={mStyles.optionBadge}>B</div>
          <div className={mStyles.optionTitle}>Full Media Pack</div>
          <div className={mStyles.optionDesc}>
            Video snaps, box art, marquees, and wheel art via EmuMovies Sync.
            Requires a free account and the EmuMovies Sync 2.7.1 app.
          </div>
          <button
            className={mStyles.optionBtn}
            onClick={() => setShowEmuMovies(v => !v)}
          >
            {showEmuMovies ? 'Hide Steps' : 'Show Steps'}
          </button>

          {showEmuMovies && (
            <div className={mStyles.emuSteps}>
              <div className={mStyles.emuStep}>1. Create a free account at emumovies.com</div>
              <div className={mStyles.emuStep}>2. Download EmuMovies Sync 2.7.1</div>
              <div className={mStyles.emuStep}>3. Run Sync, point it at F:\Media\</div>
              <div className={mStyles.emuStep}>4. Select the systems you want and sync</div>
              <div className={mStyles.emuBtns}>
                <button className={mStyles.linkBtn} onClick={openEmuMovies}>
                  Open emumovies.com
                </button>
                <button className={mStyles.linkBtn} onClick={pickSnapsFolder}>
                  I have a snaps folder
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btnNext} onClick={next}>
          {artStatus === 'done' ? 'Continue' : 'Skip for now'}
        </button>
      </div>
    </div>
  )
}
