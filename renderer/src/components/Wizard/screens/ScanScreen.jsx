import { useState, useEffect, useRef } from 'react'
import styles from './Screen.module.css'

// Maps config.paths keys to scanner function + system label
// opts() receives (folderPath, allPaths) so TP can pass the games folder too
const SCANNERS = [
  { pathKey: 'teknoparrot',  fn: 'scanGames',        system: 'TeknoParrot',  opts: (p, all) => ({ teknoParrotPath: p, gamesFolderPath: all.arcadeGames || '' }) },
  { pathKey: 'ps3Games',     fn: 'scanPs3Games',     system: 'PS3',          opts: (p) => p },
  { pathKey: 'xbox360Games', fn: 'scanXbox360Games', system: 'Xbox 360',     opts: (p) => p },
  { pathKey: 'gcGames',      fn: 'scanGCWiiGames',   system: 'GameCube/Wii', opts: (p) => p },
  { pathKey: 'ps2Games',     fn: 'scanPs2Games',     system: 'PS2',          opts: (p) => p },
  { pathKey: 'switchGames',  fn: 'scanSwitchGames',  system: 'Switch',       opts: (p) => p },
  { pathKey: 'pinball',      fn: 'scanPinball',      system: 'Pinball',      opts: (p) => p },
]

export default function ScanScreen({ config, next, prev }) {
  const [running,  setRunning ] = useState(false)
  const [results,  setResults ] = useState([])
  const [errors,   setErrors  ] = useState([])
  const [done,     setDone    ] = useState(false)
  const [progress, setProgress] = useState('')
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

      // Skip silently if path is blank -- user didn't configure this system
      if (!folderPath || folderPath.trim() === '') continue

      setProgress('Scanning ' + scanner.system + '...')

      try {
        const fn = window.nuarcade?.[scanner.fn]
        if (!fn) continue

        const opts = scanner.opts(folderPath, paths)
        const r = await fn(opts)

        // Handle both { games: [] } shape and plain array
        const games = Array.isArray(r) ? r
          : Array.isArray(r?.games) ? r.games
          : []

        // Tag each game with its system
        games.forEach(g => { if (!g.system) g.system = scanner.system })
        allGames.push(...games)

        // Only warn on real errors, not just "folder not found" for blank paths
        if (r?.error && r.error !== 'Folder not found') {
          allErrors.push(scanner.system + ': ' + r.error)
        }
      } catch (e) {
        // Only surface unexpected errors, not missing-path errors
        const msg = e.message || ''
        if (!msg.includes('not found') && !msg.includes('no such file')) {
          allErrors.push(scanner.system + ': ' + msg)
        }
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
  const systemCount = Object.keys(bySystem).length

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 5 -- Game Scan</div>
      <div className={styles.title}>
        {running ? progress || 'Scanning...' : done ? 'Scan complete.' : 'Preparing scan...'}
      </div>
      <div className={styles.sub}>
        {done && totalGames > 0
          ? totalGames + ' game' + (totalGames !== 1 ? 's' : '') + ' found across ' + systemCount + ' system' + (systemCount !== 1 ? 's' : '') + '.'
          : done
          ? 'No games found. Configure your paths in Step 3 and rescan from Settings.'
          : 'Scanning configured game folders...'}
      </div>

      {errors.length > 0 && (
        <div className={styles.scanError}>
          <div className={styles.scanErrorLabel}>SCAN WARNINGS</div>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
          <div className={styles.scanErrorHint}>
            Check your configured paths in Step 3, then rescan from Settings.
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
              <div key={i} className={[styles.scanItem, g.status === 'discovered' ? styles.scanItemDiscovered : ''].join(' ')}>
                <span className={styles.scanDot} />
                <span className={styles.scanItemTitle}>{g.title || g.name || g.file}</span>
                {g.status === 'discovered' && (
                  <span className={styles.scanItemBadge}>FOUND</span>
                )}
                {g.status === 'path-missing' && (
                  <span className={styles.scanItemBadgeWarn}>PATH MISSING</span>
                )}
              </div>
            ))}
          </div>
        ))}
        {done && totalGames === 0 && errors.length === 0 && (
          <div className={styles.scanEmpty}>
            No games found. Add games to your configured folders
            and rescan from Settings anytime.
          </div>
        )}
        {running && (
          <div className={styles.scanEmpty}>{progress || 'Scanning...'}</div>
        )}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={next} disabled={running}>Continue</button>
      </div>
    </div>
  )
}
