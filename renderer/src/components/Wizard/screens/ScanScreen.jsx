import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const SAMPLE_FOUND = [
  { title: 'WMMT 5DX+',     genre: 'Racing' },
  { title: 'Initial D 8',   genre: 'Racing' },
  { title: 'HotD 4 Special',genre: 'Shooter' },
  { title: 'Dead or Alive 5',genre: 'Fighting' },
  { title: 'Daytona USA',   genre: 'Racing' },
  { title: "Cruis'n Blast", genre: 'Racing' },
  { title: 'BlazBlue CF',   genre: 'Fighting' },
  { title: 'After Burner',  genre: 'Flying' },
]

const STATUS_STEPS = [
  { key: 'profiles',    label: 'Game profiles read and filtered',          val: '124 playable' },
  { key: 'paths',       label: 'Executable paths resolved and written',    val: '124 profiles' },
  { key: 'controllers', label: 'Controller bindings written to XML',       val: '124 games' },
]

export default function ScanScreen({ config, updateConfig, next, prev }) {
  const [progress, setProgress] = useState(0)
  const [scanned, setScanned] = useState(0)
  const [found, setFound] = useState(0)
  const [hidden, setHidden] = useState(0)
  const [completed, setCompleted] = useState([])
  const [running, setRunning] = useState(null)
  const [done, setDone] = useState(false)
  const [visibleGames, setVisibleGames] = useState([])

  const TOTAL = 502

  useEffect(() => {
    runScan()
  }, [])

  const runScan = async () => {
    // On Windows with real TeknoParrot — run actual scan
    if (window.nuarcade && window.nuarcade.platform === 'win32') {
      try {
        const result = await window.nuarcade.scanGames(
          config.teknoParrotPath,
          config.gamesFolderPath
        )
        if (result.games) {
          updateConfig({ scannedGames: result.games })
          setFound(result.stats.visible)
          setHidden(result.stats.hidden)
          setScanned(result.stats.total)
          setProgress(100)
          setVisibleGames(result.games.slice(0, 8))
        }
      } catch (e) {
        console.error('Scan error:', e)
      }
    }

    // Animate progress bar
    for (let i = 0; i <= 100; i += 2) {
      await delay(40)
      setProgress(i)
      setScanned(Math.floor((i / 100) * TOTAL))
      setFound(Math.floor((i / 100) * 124))
      setHidden(Math.floor((i / 100) * 378))

      // Reveal sample game cards as scan progresses
      const cardCount = Math.floor((i / 100) * SAMPLE_FOUND.length)
      setVisibleGames(SAMPLE_FOUND.slice(0, cardCount))
    }

    // Run status steps
    for (let i = 0; i < STATUS_STEPS.length; i++) {
      setRunning(STATUS_STEPS[i].key)
      await delay(700)
      setCompleted(c => [...c, STATUS_STEPS[i].key])
      setRunning(null)
    }

    setDone(true)
  }

  const getStatus = (key) => {
    if (completed.includes(key)) return 'done'
    if (running === key) return 'running'
    return 'wait'
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 4 — Game scan</div>
      <div className={styles.title}>Scanning your library.</div>
      <div className={styles.sub}>
        Reading every TeknoParrot profile, matching executables, filtering
        unplayable games, and writing controller bindings automatically.
      </div>

      <div className={styles.scanWrap}>
        <div className={styles.scanBarBg}>
          <div className={styles.scanBarFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.scanStats}>
          <div>Scanned <span>{scanned}</span> of {TOTAL}</div>
          <div>Found <span>{found}</span> playable</div>
          <div>Hidden <span>{hidden}</span></div>
        </div>
      </div>

      {visibleGames.length > 0 && (
        <div className={styles.gamePreview}>
          {visibleGames.map((g, i) => (
            <div key={i} className={styles.gpCard}>
              <div className={styles.gpTitle}>{g.title}</div>
              <div className={styles.gpMeta}>
                <span className={styles.gpDot} style={{ background: '#00ff88' }} />
                {g.genre}
              </div>
            </div>
          ))}
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
              {status === 'done' && <span className={styles.siVal}>{s.val}</span>}
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
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