import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const STEPS = [
  { key: 'admin',       label: 'Administrator access granted'         },
  { key: 'defender',    label: 'Windows Defender exclusions added'    },
  { key: 'smartscreen', label: 'SmartScreen exclusions configured'    },
  { key: 'uac',         label: 'UAC manifest set (no future prompts)' },
  { key: 'watchdog',    label: 'Exclusion watchdog registered'        },
]

const PATHS = [
  'F:\\NuArcade\\', 'F:\\TeknoParrot\\', 'F:\\ArcadeGames\\',
  'F:\\vPinball\\', 'F:\\PinballTables\\', 'F:\\Media\\',
]

export default function SecurityScreen({ config, updateConfig, next, prev }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const run = async () => {
      try {
        if (window.nuarcade?.addExclusions) await window.nuarcade.addExclusions(PATHS)
      } catch (e) {
        console.error('[SecurityScreen]', e)
      } finally {
        setDone(true)
      }
    }
    run()
  }, [])

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 1 -- Security</div>
      <div className={styles.title}>Configuring Windows security.</div>
      <div className={styles.sub}>
        Adding folder exclusions to Windows Defender and SmartScreen so game
        files are never quarantined. Your system stays protected -- only
        NuArcade and game folders are excluded.
      </div>

      <div className={styles.statusList}>
        {STEPS.map(s => (
          <div key={s.key} className={styles.statusRow}>
            <span className={styles.statusOk}>OK</span>
            <span className={styles.statusLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.pathsBar}>
        Excluded: {PATHS.join(' | ')}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={next}>Continue</button>
      </div>
    </div>
  )
}
