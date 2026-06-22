import { useState } from 'react'
import styles from './Screen.module.css'

export default function MediaScreen({ config, games, next, prev }) {
  const [fetching,  setFetching ] = useState(false)
  const [fetchDone, setFetchDone] = useState(false)

  const handleFetchArt = async () => {
    if (fetching) return
    setFetching(true)
    try {
      if (window.nuarcade?.fetchArt) await window.nuarcade.fetchArt()
      setFetchDone(true)
    } catch (e) {
      console.error('[MediaScreen]', e)
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 6 -- Media</div>
      <div className={styles.title}>Get Media</div>
      <div className={styles.sub}>
        Choose how to get artwork and video snaps for your games.
        You can always add more later.
      </div>

      <div className={styles.mediaGrid}>
        <div className={styles.mediaCard} onClick={handleFetchArt} style={{ cursor: 'pointer' }}>
          <div className={styles.mediaCardIcon}>A</div>
          <div className={styles.mediaCardTitle}>Fetch Art Now</div>
          <div className={styles.mediaCardSub}>
            Downloads hero artwork from SteamGridDB. Works immediately,
            no account needed. Art shows on game cards right away.
          </div>
          {fetchDone && <div className={styles.mediaCardStatus}>Done -- {games?.length || 0} games have art</div>}
          {fetching  && <div className={styles.mediaCardStatus}>Fetching...</div>}
        </div>

        <div className={styles.mediaCard}>
          <div className={styles.mediaCardIcon}>B</div>
          <div className={styles.mediaCardTitle}>Full Media Pack</div>
          <div className={styles.mediaCardSub}>
            Video snaps, box art, marquees via EmuMovies Sync.
            Requires a free account and the EmuMovies Sync app.
          </div>
          <button
            className={styles.mediaShowSteps}
            onClick={() => window.nuarcade?.openExternal?.('https://emumovies.com')}
          >
            Show Steps
          </button>
        </div>
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={next}>Continue</button>
      </div>
    </div>
  )
}
