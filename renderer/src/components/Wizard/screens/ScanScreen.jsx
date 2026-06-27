import { useState, useEffect, useRef } from 'react'
import styles from './Screen.module.css'

export default function ScanScreen({ config, next, prev }) {
  const [running,  setRunning ] = useState(false)
  const [results,  setResults ] = useState([])
  const [done,     setDone    ] = useState(false)
  const [error,    setError   ] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => runScan(), 300)
    return () => clearTimeout(timer)
  }, [])

  const runScan = async () => {
    setRunning(true)
    setError(null)
    try {
      if (window.nuarcade?.scanGames) {
        const paths = config?.paths || {}
        const r = await window.nuarcade.scanGames({
          teknoParrotPath: paths.teknoparrot || '',
          gamesFolderPath: paths.arcadeGames || '',
        })
        // Surface any error the scanner returned
        if (r?.error) {
          setError(r.error)
        }
        setResults(Array.isArray(r?.games) ? r.games : [])
      } else {
        setError('Scanner not available -- is the app running correctly?')
      }
    } catch (e) {
      console.error('[ScanScreen]', e)
      setError(e.message || 'Unknown scan error')
    } finally {
      setRunning(false)
      setDone(true)
    }
  }

  // Group results by system
  const bySystem = results.reduce((acc, g) => {
    const sys = g.system || 'TeknoParrot'
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
        {done && totalGames > 0
          ? totalGames + ' game' + (totalGames !== 1 ? 's' : '') + ' found.'
          : 'NuArcade scans your TeknoParrot UserProfiles folder for configured games.'}
      </div>

      {error && (
        <div className={styles.scanError}>
          <span className={styles.scanErrorLabel}>SCAN ERROR</span>
          {error}
          {error.includes('TeknoParrot path not found') && (
            <div className={styles.scanErrorHint}>
              Make sure TeknoParrot is installed and the path in Step 3 points
              to the folder containing TeknoParrot.exe -- e.g. C:\TeknoParrot\
            </div>
          )}
        </div>
      )}

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
        {done && totalGames === 0 && !error && (
          <div className={styles.scanEmpty}>
            No games found. Check that TeknoParrot is installed and
            your path in Step 3 is correct, then rescan from Settings.
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
