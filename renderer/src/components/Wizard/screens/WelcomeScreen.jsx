import styles from './Screen.module.css'

const STEPS = [
  { num: '1', label: 'Security',    desc: 'Add Windows Defender exclusions so your games are never quarantined.' },
  { num: '2', label: 'Emulators',   desc: 'Download and install TeknoParrot, RPCS3, and any others you need.'   },
  { num: '3', label: 'Paths',       desc: 'Point NuArcade to your emulator and game folders on the F: drive.'   },
  { num: '4', label: 'Controllers', desc: 'Map your racing wheel, light gun, and Xbox controller.'               },
  { num: '5', label: 'Scan',        desc: 'NuArcade scans your folders and builds your game library.'            },
  { num: '6', label: 'Media',       desc: 'Fetch artwork and video snaps for your games from SteamGridDB.'       },
]

export default function WelcomeScreen({ config, updateConfig, next }) {
  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Welcome</div>
      <div className={styles.title}>Let's get your cabinet ready.</div>
      <div className={styles.sub}>
        This wizard configures NuArcade in about 5 minutes.
        You can skip any step and come back via Settings anytime.
      </div>

      <div className={styles.stepList}>
        {STEPS.map(s => (
          <div key={s.num} className={styles.stepListItem}>
            <div className={styles.stepListNum}>{s.num}</div>
            <div className={styles.stepListContent}>
              <div className={styles.stepListLabel}>{s.label}</div>
              <div className={styles.stepListDesc}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btn} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  )
}
