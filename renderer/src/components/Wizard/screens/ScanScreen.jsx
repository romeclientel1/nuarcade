import { useState, useEffect, useRef } from 'react'
import styles from './Screen.module.css'

export default function ScanScreen({ config, next, prev }) {
  const [running,  setRunning ] = useState(false)
  const [results,  setResults ] = useState([])
  const [done,     setDone    ] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => runScan(), 300)
    return () => clearTimeout(timer)
  }, [])

  const runScan = async () => {
    setRunning(true)
    try {
      if (window.nuarcade?.scanGames) {
        const r = await window.nuarcade.scanGames(config)
        setResults(Array.isArray(r) ? r : [])
      }
    } catch (e) {
      console.error('[ScanScreen]', e)
    } finally {
      setRunning(false)
      setDone(true)
    }
  }

  // Group results by system for display
  const bySystem = results.reduce((acc, g) => {
    const sys = g.system || 'Other'
    if (!acc[sys]) acc[sys] = []
    acc[sys].push(g)
    return acc
  }, {})

  const totalGames = results.length

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 5 -- Game Scan</div>
      <div className={styles.title}>
        {running ? 'Scanning your library...' : done ? 'Scan complete.' : 'Preparing scan...'}
      </div>
      <div className={styles.sub}>
        {done && totalGames === 0
          ? 'No games found yet -- totally fine. Add games to your configured folders and rescan from Settings anytime.'
          : done
          ? totalGames + ' game' + (totalGames !== 1 ? 's' : '') + ' found across your configured folders.'
          : 'NuArcade is scanning your configured game folders...'}
      </div>

      <div className={styles.scanScroll} ref={scrollRef}>
        {Object.entries(bySystem).map(([sys, games]) => (
          <div key={sys} className={styles.scanGroup}>
            <div className={styles.scanGroupTitle}>
              {sys} -- {games.length} game{games.length !== 1 ? 's' : ''}
            </div>
            {games.map((g, i) => (
              <div key={i} className={styles.scanItem}>
                <span className={styles.scanDot} />
                {g.title || g.name || g.file}
              </div>
            ))}
          </div>
        ))}
        {done && totalGames === 0 && (
          <div className={styles.scanEmpty}>
            [ ] Add games to your configured folders, then rescan from Settings anytime.
          </div>
        )}
        {running && (
          <div className={styles.scanEmpty}>Scanning...</div>
        )}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={next} disabled={running}>
          Continue
        </button>
      </div>
    </div>
  )
}
