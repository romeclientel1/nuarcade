import styles from './Screen.module.css'

export default function ReadyScreen({ config, games, finish, prev }) {
  const gamesReady = games?.length || 0
  const ctrlMapped = Object.values(config.controllers || {}).filter(Boolean).length
  const pathsSet   = Object.values(config.paths || {}).filter(Boolean).length
  const stepsLeft  = (ctrlMapped === 0 ? 1 : 0) + (pathsSet === 0 ? 1 : 0)

  return (
    <div className={styles.screen}>
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
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={[styles.btn, styles.btnLaunch].join(' ')} onClick={finish}>
          Launch NuArcade
        </button>
      </div>
    </div>
  )
}
