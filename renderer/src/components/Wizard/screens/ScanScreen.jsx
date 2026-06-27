import { useState, useEffect, useRef } from 'react'
import styles from './Screen.module.css'

// Maps config.paths keys to their scanner function and system label
const SCANNERS = [
  { pathKey: 'teknoparrot',  fn: 'scanGames',        system: 'TeknoParrot',  opts: (p) => ({ teknoParrotPath: p, gamesFolderPath: '' }) },
  { pathKey: 'rpcs3',        fn: 'scanPs3Games',     system: 'PS3',          opts: (p) => p },
  { pathKey: 'xbox360Games', fn: 'scanXbox360Games', system: 'Xbox 360',     opts: (p) => p },
  { pathKey: 'gcGames',      fn: 'scanGCWiiGames',   system: 'GameCube/Wii', opts: (p) => p },
  { pathKey: 'ps2Games',     fn: 'scanPs2Games',     system: 'PS2',          opts: (p) => p },
  { pathKey: 'switchGames',  fn: 'scanSwitchGames',  system: 'Switch',       opts: (p) => p },
  { pathKey: 'pinball',      fn: 'scanPinball',      system: 'Pinball',      opts: (p) => p },
]

export default function ScanScreen({ config, next, prev }) {
  const [running,   setRunning  ] = useState(false)
  const [results,   setResults  ] = useState([])
  const [errors,    setErrors   ] = useState([])
  const [done,      setDone     ] = useState(false)
  const [progress,  setProgress ] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => runScan(), 300)
    return () => clearTimeout(timer)
  }, [])

  const runScan = async () => {
    setRunning(true)
    setErrors([])
    setResults([])

    const paths = config?.paths || {}
    const allGames = []
    const allErrors = []

    for (const scanner of SCANNERS) {
      const folderPath = paths[scanner.pathKey]
      if (!folderPath) continue // skip unconfigured systems

      setProgress('Scanning ' + scanner.system + '...')

      try {
        const fn = window.nuarcade?.[scanner.fn]
        if (!fn) continue

        const opts = scanner.opts(folderPath)
        const r = await fn(opts)

        // Handle both { games: [] } shape and plain array
        const games = Array.isArray(r) ? r
          : Array.isArray(r?.games) ? r.games
          : []

        // Tag each game with its system
        games.forEach(g => { if (!g.system) g.system = scanner.system })
        allGames.push(...games)

        if (r?.error) allErrors.push(scanner.system + ': ' + r.error)
      } catch (e) {
        allErrors.push(scanner.system + ': ' + (e.message || 'scan failed'))
      }
    }

    setResults(allGames)
    setErrors(allErrors)
    setRunning(false)
    setDone(true)
    setProgress('')
  }

  // Group results by system
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
        {running ? progress || 'Scanning...' : done ? 'Scan complete.' : 'Preparing scan...'}
      </div>
      <div className={styles.sub}>
        {done && totalGames > 0
          ? totalGames + ' game' + (totalGames !== 1 ? 's' : '') + ' found across ' + Object.keys(bySystem).length + ' system' + (Object.keys(bySystem).length !== 1 ? 's' : '') + '.'
          : 'Scanning all configured game folders...'}
      </div>

      {errors.length > 0 && (
        <div className={styles.scanError}>
          <div className={styles.scanErrorLabel}>SCAN WARNINGS</div>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
          <div className={styles.scanErrorHint}>
            Check that each emulator path in Step 3 points to the correct
            installation folder, then rescan from Settings.
          </div>
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
        {done && totalGames === 0 && errors.length === 0 && (
          <div className={styles.scanEmpty}>
            No games found. Add games to your configured folders and
            rescan from Settings anytime.
          </div>
        )}
        {running && (
          <div className={styles.scanEmpty}>{progress || 'Scanning...'}</div>
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
