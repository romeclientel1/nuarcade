import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const SAMPLE_FOUND = [
  { title: 'WMMT 5DX+',      genre: 'Racing'   },
  { title: 'Initial D 8',    genre: 'Racing'   },
  { title: 'HotD 4 Special', genre: 'Shooter'  },
  { title: 'Dead or Alive 5',genre: 'Fighting' },
  { title: 'Daytona USA',    genre: 'Racing'   },
  { title: "Cruis'n Blast",  genre: 'Racing'   },
  { title: 'BlazBlue CF',    genre: 'Fighting' },
  { title: 'After Burner',   genre: 'Flying'   },
  { title: 'Tekken 6',       genre: 'PS3'      },
  { title: 'Blazblue CS2',   genre: 'PS3'      },
]

const STATUS_STEPS = [
  { key: 'profiles',    label: 'TeknoParrot profiles scanned'       },
  { key: 'ps3',        label: 'RPCS3 game folders scanned'         },
  { key: 'controllers',label: 'Controller bindings written to XML'  },
]

export default function ScanScreen({ config, updateConfig, next, prev }) {
  const [progress,     setProgress    ] = useState(0)
  const [tpFound,      setTpFound     ] = useState(null)
  const [ps3Found,     setPs3Found    ] = useState(null)
  const [pbFound,      setPbFound     ] = useState(null)
  const [completed,    setCompleted   ] = useState([])
  const [running,      setRunning     ] = useState(null)
  const [done,         setDone        ] = useState(false)
  const [visibleGames, setVisibleGames] = useState([])
  const [emptyState,   setEmptyState  ] = useState(false)

  useEffect(() => { runScan() }, [])

  const runScan = async () => {
    let allGames = []
    let tp = 0, ps3 = 0, pb = 0

    // ── Real scan on Windows ─────────────────────────────────
    if (window.nuarcade && window.nuarcade.platform === 'win32') {
      try {
        // TeknoParrot
        setRunning('profiles')
        const tpResult = await window.nuarcade.scanGames(
          config.teknoParrotPath,
          config.gamesFolderPath
        )
        if (tpResult.games?.length) {
          tp = tpResult.games.length
          allGames = [...allGames, ...tpResult.games]
        }
        setTpFound(tp)
        setCompleted(c => [...c, 'profiles'])
        setRunning(null)

        // RPCS3
        setRunning('ps3')
        if (config.mode !== 'pinball' && config.ps3GamesPath) {
          const ps3Result = await window.nuarcade.scanPs3Games(config.ps3GamesPath)
          if (ps3Result.games?.length) {
            ps3 = ps3Result.games.length
            allGames = [...allGames, ...ps3Result.games]
          }
        }
        setPs3Found(ps3)
        setCompleted(c => [...c, 'ps3'])
        setRunning(null)

        // Pinball
        setRunning('controllers')
        if (config.mode !== 'arcade' && config.tablesPath) {
          const pbResult = await window.nuarcade.scanPinball(config.tablesPath)
          if (pbResult.games?.length) {
            pb = pbResult.games.length
            allGames = [...allGames, ...pbResult.games]
          }
        }
        setPbFound(pb)
        setCompleted(c => [...c, 'controllers'])
        setRunning(null)

        updateConfig({ scannedGames: allGames })
        setVisibleGames(allGames.slice(0, 10))
        setProgress(100)

        if (allGames.length === 0) setEmptyState(true)
        setDone(true)
        return
      } catch (e) {
        console.error('Scan error:', e)
      }
    }

    // ── Demo animation (Mac / dev / no games yet) ────────────
    for (let i = 0; i <= 100; i += 2) {
      await delay(35)
      setProgress(i)
      const cardCount = Math.floor((i / 100) * SAMPLE_FOUND.length)
      setVisibleGames(SAMPLE_FOUND.slice(0, cardCount))
    }

    for (let i = 0; i < STATUS_STEPS.length; i++) {
      setRunning(STATUS_STEPS[i].key)
      await delay(600)
      setCompleted(c => [...c, STATUS_STEPS[i].key])
      setRunning(null)
    }

    setTpFound(8)
    setPs3Found(2)
    setPbFound(3)
    setDone(true)
  }

  const getStatus = (key) => {
    if (completed.includes(key)) return 'done'
    if (running === key) return 'running'
    return 'wait'
  }

  const totalFound = (tpFound || 0) + (ps3Found || 0) + (pbFound || 0)

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 5 — Game scan</div>
      <div className={styles.title}>
        {done
          ? emptyState ? 'Ready — add games anytime.' : `Found ${totalFound} game${totalFound !== 1 ? 's' : ''}!`
          : 'Scanning your library...'}
      </div>
      <div className={styles.sub}>
        {emptyState
          ? "No games were found in the folders you set — that's totally fine. Once you load your F: drive with TeknoParrot and your game files, go to Settings → Rescan Library and everything will populate automatically."
          : 'Reading emulator profiles, matching executables, and writing controller bindings.'}
      </div>

      <div className={styles.scanWrap}>
        <div className={styles.scanBarBg}>
          <div className={styles.scanBarFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.scanStats}>
          <div>TeknoParrot <span>{tpFound ?? '...'}</span></div>
          <div>RPCS3 <span>{ps3Found ?? '...'}</span></div>
          <div>Pinball <span>{pbFound ?? '...'}</span></div>
        </div>
      </div>

      {visibleGames.length > 0 && !emptyState && (
        <div className={styles.gamePreview}>
          {visibleGames.map((g, i) => (
            <div key={i} className={styles.gpCard}>
              <div className={styles.gpTitle}>{g.title}</div>
              <div className={styles.gpMeta}>
                <span className={styles.gpDot} style={{
                  background: g.genre === 'PS3' ? '#0070d1' : g.genre === 'Pinball' ? '#cc44ff' : '#00ff88'
                }} />
                {g.genre}
              </div>
            </div>
          ))}
        </div>
      )}

      {emptyState && (
        <div className={styles.emptyHint}>
          <div className={styles.emptyIcon}>📂</div>
          <div className={styles.emptyText}>
            Add games to your F: drive, then rescan from Settings anytime.
          </div>
        </div>
      )}

      <div className={styles.statusList}>
        {STATUS_STEPS.map(s => {
          const status = getStatus(s.key)
          return (
            <div key={s.key} className={`${styles.statusItem} ${styles[status]}`}>
              {status === 'done'    && <span className={styles.siDone}>✓</span>}
              {status === 'running' && <div className={styles.spinner} />}
              {status === 'wait'    && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)' }} />}
              <span className={styles.siText}>{s.label}</span>
              {status === 'done' && (
                <span className={styles.siVal}>
                  {s.key === 'profiles'     && `${tpFound ?? 0} games`}
                  {s.key === 'ps3'          && `${ps3Found ?? 0} games`}
                  {s.key === 'controllers'  && `${pbFound ?? 0} tables`}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>← Back</button>
        <button
          className={styles.btnNext}
          onClick={next}
          disabled={!done}
          style={{ opacity: done ? 1 : 0.4, cursor: done ? 'pointer' : 'not-allowed' }}
        >
          {done ? 'Continue →' : 'Scanning...'}
        </button>
      </div>
    </div>
  )
}

const delay = ms => new Promise(r => setTimeout(r, ms))
