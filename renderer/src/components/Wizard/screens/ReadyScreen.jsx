import { useState } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import { useWizardNav } from '../../../hooks/useWizardNav'
import styles from './Screen.module.css'
import wizStyles from '../Wizard.module.css'

const EXIT_IDX   = 0
const BACK_IDX   = 1
const LAUNCH_IDX = 2

export default function ReadyScreen({ config, games, onDone, prev }) {
  const { exitConfirm, handleExit } = useWizardNav()
  const [focusIdx, setFocusIdx] = useState(LAUNCH_IDX)

  const confirmFocused = () => {
    if (focusIdx === EXIT_IDX)   { handleExit(); return }
    if (focusIdx === BACK_IDX)   { prev(); return }
    if (focusIdx === LAUNCH_IDX) { onDone(); return }
  }

  useGamepad({
    up:          () => setFocusIdx(EXIT_IDX),
    down:        () => setFocusIdx(LAUNCH_IDX),
    left:        () => { if (focusIdx === LAUNCH_IDX) setFocusIdx(BACK_IDX) },
    right:       () => { if (focusIdx === BACK_IDX)   setFocusIdx(LAUNCH_IDX) },
    confirm:     confirmFocused,
    back:        prev,
    filterRight: onDone,
  })

  const gamesReady  = games?.length || 0
  const ctrlMapped  = Object.values(config.controllers || {}).filter(Boolean).length
  const pathsSet    = Object.values(config.paths || {}).filter(Boolean).length
  const stepsLeft   = (ctrlMapped === 0 ? 1 : 0) + (pathsSet === 0 ? 1 : 0)

  return (
    <div className={styles.screen} style={{ position: 'relative' }}>

      <button
        className={[wizStyles.exitBtn, focusIdx===EXIT_IDX?wizStyles.exitFocused:'', exitConfirm?wizStyles.exitConfirm:''].join(' ')}
        onClick={handleExit}
        onMouseEnter={() => setFocusIdx(EXIT_IDX)}
      >{exitConfirm ? 'CONFIRM' : 'EXIT'}</button>

      <div className={styles.eyebrow}>All done</div>
      <div className={styles.title}>Your cabinet is ready.</div>
      <div className={styles.sub}>
        Every game is configured, controllers are mapped, and security
        exclusions are in place. NuArcade will check for TeknoParrot
        updates silently on each launch.
      </div>

      <div className={styles.readyOk}>OK</div>

      <div className={styles.readyStats}>
        <div className={styles.readyStat}>
          <div className={styles.readyStatVal}>{gamesReady}</div>
          <div className={styles.readyStatLabel}>GAMES READY</div>
        </div>
        <div className={styles.readyStat}>
          <div className={styles.readyStatVal}>{ctrlMapped}</div>
          <div className={styles.readyStatLabel}>CONTROLLERS MAPPED</div>
        </div>
        <div className={styles.readyStat}>
          <div className={styles.readyStatVal}>{pathsSet}</div>
          <div className={styles.readyStatLabel}>SECURITY PATHS</div>
        </div>
        <div className={styles.readyStat}>
          <div className={styles.readyStatVal}>{stepsLeft}</div>
          <div className={styles.readyStatLabel}>MANUAL STEPS LEFT</div>
        </div>
      </div>

      <div className={styles.infoBar}>
        NuArcade will re-verify security exclusions and check for new
        games on every launch automatically.
      </div>

      <div className={styles.btnRow}>
        <button
          className={[styles.btnBack, focusIdx===BACK_IDX?styles.btnFocused:''].join(' ')}
          onClick={prev}
          onMouseEnter={() => setFocusIdx(BACK_IDX)}
        >Back</button>
        <button
          className={[styles.btn, styles.btnLaunch, focusIdx===LAUNCH_IDX?styles.btnFocused:''].join(' ')}
          onClick={onDone}
          onMouseEnter={() => setFocusIdx(LAUNCH_IDX)}
        >Launch NuArcade</button>
      </div>

    </div>
  )
}
