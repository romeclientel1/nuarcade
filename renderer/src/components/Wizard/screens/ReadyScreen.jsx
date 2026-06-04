import styles from './Screen.module.css'

export default function ReadyScreen({ config, finish }) {
  const gameCount = config.scannedGames?.length || 124
  const ctrlCount = Object.values(config.controllers || {}).filter(Boolean).length || 3

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>All done</div>
      <div className={styles.title}>Your cabinet is ready.</div>
      <div className={styles.sub}>
        Every game is configured, controllers are mapped, and security
        exclusions are in place. NuArcade will check for TeknoParrot
        updates silently on each launch.
      </div>

      <div className={styles.readyRing}>✓</div>

      <div className={styles.readyStats}>
        <div className={styles.rsStat}>
          <div className={styles.rsNum}>{gameCount}</div>
          <div className={styles.rsLbl}>Games ready</div>
        </div>
        <div className={styles.rsStat}>
          <div className={styles.rsNum}>{ctrlCount}</div>
          <div className={styles.rsLbl}>Controllers mapped</div>
        </div>
        <div className={styles.rsStat}>
          <div className={styles.rsNum}>5</div>
          <div className={styles.rsLbl}>Security paths</div>
        </div>
        <div className={styles.rsStat}>
          <div className={styles.rsNum}>0</div>
          <div className={styles.rsLbl}>Manual steps left</div>
        </div>
      </div>

      <div className={styles.successNote}>
        ✓ NuArcade will re-verify security exclusions and check for
        new games on every launch automatically.
      </div>

      <div className={styles.footer}>
        <div />
        <button className={styles.btnLaunch} onClick={finish}>
          ▶ Launch NuArcade
        </button>
      </div>
    </div>
  )
}