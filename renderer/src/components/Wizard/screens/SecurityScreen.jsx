import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const STEPS = [
  { key: 'admin',       label: 'Administrator access granted'          },
  { key: 'defender',    label: 'Windows Defender exclusions added'     },
  { key: 'smartscreen', label: 'SmartScreen exclusions configured'     },
  { key: 'uac',         label: 'UAC manifest set (no future prompts)'  },
  { key: 'watchdog',    label: 'Exclusion watchdog registered'         },
]

export default function SecurityScreen({ config, updateConfig, next, prev }) {
  // visibleCount controls how many steps have appeared -- animates one at a time
  const [visibleCount, setVisibleCount] = useState(0)
  const [done,         setDone        ] = useState(false)

  // Build exclusion paths from config.paths if available, otherwise use defaults
  const buildPaths = () => {
    const p = config?.paths || {}
    const found = Object.values(p).filter(Boolean)
    if (found.length > 0) return found
    // Defaults -- use C: since that's where Windows lives and games often install
    return [
      'C:\\NuArcade\\',
      'C:\\TeknoParrot\\',
      'C:\\ArcadeGames\\',
    ]
  }

  useEffect(() => {
    // Animate steps appearing one at a time, 600ms apart
    let count = 0
    const run = async () => {
      // Run actual security config in background
      try {
        if (window.nuarcade?.addExclusions) {
          await window.nuarcade.addExclusions(buildPaths())
        }
      } catch (e) {
        console.error('[SecurityScreen]', e)
      }
    }
    run()

    const interval = setInterval(() => {
      count++
      setVisibleCount(count)
      if (count >= STEPS.length) {
        clearInterval(interval)
        // Short pause after last step before marking done
        setTimeout(() => setDone(true), 400)
      }
    }, 600)

    return () => clearInterval(interval)
  }, [])

  const paths = buildPaths()

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 1 -- Security</div>
      <div className={styles.title}>Configuring Windows security.</div>
      <div className={styles.sub}>
        Adding folder exclusions to Windows Defender and SmartScreen so
        your games are never quarantined. Your system stays protected --
        only Vespara and your game folders are excluded.
      </div>

      <div className={styles.statusList}>
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={[
              styles.statusRow,
              i < visibleCount ? styles.statusRowVisible : styles.statusRowHidden,
            ].join(' ')}
          >
            <span className={styles.statusOk}>OK</span>
            <span className={styles.statusLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {done && (
        <div className={styles.securityNote}>
          Excluded folders: {paths.length} path{paths.length !== 1 ? 's' : ''} added.
          These match the game folders you configure in Step 3.
        </div>
      )}

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={next}>Continue</button>
      </div>
    </div>
  )
}
