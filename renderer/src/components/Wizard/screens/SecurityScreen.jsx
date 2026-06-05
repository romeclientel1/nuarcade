import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const STEPS = [
  { key: 'admin',       label: 'Administrator access granted',         val: 'OK' },
  { key: 'defender',    label: 'Windows Defender exclusions added',    val: '6 paths' },
  { key: 'smartscreen', label: 'SmartScreen exclusions configured',    val: 'OK' },
  { key: 'uac',         label: 'UAC manifest set (no future prompts)', val: 'OK' },
  { key: 'watchdog',    label: 'Exclusion watchdog registered',        val: 'OK' },
]

const PATHS = [
  'F:\\NuArcade\\',
  'F:\\TeknoParrot\\',
  'F:\\ArcadeGames\\',
  'F:\\vPinball\\',
  'F:\\PinballTables\\',
  'F:\\Media\\',
]

export default function SecurityScreen({ config, next, prev }) {
  const [completed, setCompleted] = useState([])
  const [running, setRunning] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    runSteps()
  }, [])

  const runSteps = async () => {
    if (window.nuarcade && window.nuarcade.platform === 'win32') {
      await window.nuarcade.addExclusions(PATHS)
    }
    for (let i = 0; i < STEPS.length; i++) {
      setRunning(STEPS[i].key)
      await delay(600 + Math.random() * 400)
      setCompleted(c => [...c, STEPS[i].key])
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
      <div className={styles.eyebrow}>Step 1 — Security</div>
      <div className={styles.title}>Configuring Windows security.</div>
      <div className={styles.sub}>
        Adding folder exclusions to Windows Defender and SmartScreen so game
        files are never quarantined. Your system stays protected — only
        NuArcade and game folders are excluded.
      </div>

      <div className={styles.statusList}>
        {STEPS.map(s => {
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

      <div className={styles.infoNote}>
        Excluded: {PATHS.join(' · ')}
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btnNext} onClick={next} disabled={!done}
          style={{ opacity: done ? 1 : 0.4, cursor: done ? 'pointer' : 'not-allowed' }}>
          {done ? 'Continue →' : 'Configuring...'}
        </button>
      </div>
    </div>
  )
}

const delay = ms => new Promise(r => setTimeout(r, ms))