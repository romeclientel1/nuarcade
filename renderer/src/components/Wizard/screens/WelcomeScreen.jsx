import styles from './Screen.module.css'

const MODES = [
  {
    id: 'arcade+pinball',
    icon: '🕹️',
    title: 'Arcade + Pinball',
    sub: 'TeknoParrot games and Visual Pinball X tables in one library',
  },
  {
    id: 'arcade',
    icon: '🏎️',
    title: 'Arcade only',
    sub: 'TeknoParrot games only, no pinball module',
  },
  {
    id: 'pinball',
    icon: '🎱',
    title: 'Pinball only',
    sub: 'Visual Pinball X tables only',
  },
]

export default function WelcomeScreen({ config, updateConfig, next }) {
  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Welcome</div>
      <div className={styles.title}>Let's get your cabinet ready.</div>
      <div className={styles.sub}>
        NuArcade will configure everything automatically — security exclusions,
        game detection, and controller mapping. This takes about 5 minutes
        and you'll never have to do it again.
      </div>

      <div className={styles.modeGrid}>
        {MODES.map(m => (
          <div
            key={m.id}
            className={`${styles.modeCard} ${config.mode === m.id ? styles.modeActive : ''}`}
            onClick={() => updateConfig({ mode: m.id })}
          >
            <div className={styles.modeIcon}>{m.icon}</div>
            <div className={styles.modeTitle}>{m.title}</div>
            <div className={styles.modeSub}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className={styles.notice}>
        <span className={styles.noticeIcon}>⚠</span>
        NuArcade will request administrator access to configure Windows
        security exclusions. This happens once.
      </div>

      <div className={styles.footer}>
        <div />
        <button className={styles.btnNext} onClick={next}>
          Continue →
        </button>
      </div>
    </div>
  )
}