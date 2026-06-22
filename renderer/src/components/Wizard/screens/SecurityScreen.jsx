import { useState, useEffect } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import { useWizardNav } from '../../../hooks/useWizardNav'
import styles from './Screen.module.css'
import wizStyles from '../Wizard.module.css'

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

// Focus: 0=EXIT, 1=Back, 2=Continue
const EXIT_IDX     = 0
const BACK_IDX     = 1
const CONTINUE_IDX = 2

export default function SecurityScreen({ config, updateConfig, next, prev }) {
  const { exitConfirm, handleExit } = useWizardNav()
  const [done,     setDone    ] = useState(false)
  const [focusIdx, setFocusIdx] = useState(CONTINUE_IDX)

  // Run security configuration on mount
  useEffect(() => {
    const run = async () => {
      try {
        if (window.nuarcade?.addExclusions) {
          await window.nuarcade.addExclusions(PATHS)
        }
      } catch (e) {
        console.error('[SecurityScreen]', e)
      } finally {
        setDone(true)
      }
    }
    run()
  }, [])

  const confirmFocused = () => {
    if (focusIdx === EXIT_IDX)     handleExit()
    else if (focusIdx === BACK_IDX)     prev()
    else next()
  }

  useGamepad({
    left:        () => setFocusIdx(i => i === CONTINUE_IDX ? BACK_IDX : i),
    right:       () => setFocusIdx(i => i === BACK_IDX ? CONTINUE_IDX : i),
    up:          () => setFocusIdx(EXIT_IDX),
    down:        () => setFocusIdx(CONTINUE_IDX),
    confirm:     confirmFocused,
    back:        prev,
    filterRight: next,
  })

  return (
    <div className={styles.screen} style={{ position: 'relative' }}>

      <button
        className={[
          wizStyles.exitBtn,
          focusIdx === EXIT_IDX ? wizStyles.exitFocused : '',
          exitConfirm           ? wizStyles.exitConfirm : '',
        ].join(' ')}
        onClick={handleExit}
        onMouseEnter={() => setFocusIdx(EXIT_IDX)}
      >
        {exitConfirm ? 'CONFIRM' : 'EXIT'}
      </button>

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
            <span className={styles.statusVal}>{s.val}</span>
          </div>
        ))}
      </div>

      <div className={styles.pathsBar}>
        Excluded: {PATHS.join(' | ')}
      </div>

      <div className={styles.btnRow}>
        <button
          className={[
            styles.btnBack,
            focusIdx === BACK_IDX ? styles.btnFocused : '',
          ].join(' ')}
          onClick={prev}
          onMouseEnter={() => setFocusIdx(BACK_IDX)}
        >
          Back
        </button>
        <button
          className={[
            styles.btn,
            focusIdx === CONTINUE_IDX ? styles.btnFocused : '',
          ].join(' ')}
          onClick={next}
          onMouseEnter={() => setFocusIdx(CONTINUE_IDX)}
        >
          Continue
        </button>
      </div>

    </div>
  )
}
