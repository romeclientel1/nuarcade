import { useState } from 'react'
import styles from './Screen.module.css'

const MODES = [
  { key: 'arc+pin',  icon: 'ARC+PIN',  name: 'Arcade + Pinball', sub: 'TeknoParrot & RPCS3 arcade games plus Visual Pinball X tables' },
  { key: 'arcade',   icon: 'ARCADE',   name: 'Arcade only',       sub: 'TeknoParrot & RPCS3 arcade games, no pinball models' },
  { key: 'pinball',  icon: 'PINBALL',  name: 'Pinball only',      sub: 'Visual Pinball X tables only' },
]

export default function WelcomeScreen({ config, updateConfig, next }) {
  const [selectedKey, setSelectedKey] = useState(config.mode || 'arc+pin')

  const handleContinue = () => {
    updateConfig({ mode: selectedKey })
    next()
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Welcome</div>
      <div className={styles.title}>Let's get your cabinet ready.</div>
      <div className={styles.sub}>
        NuArcade will configure everything automatically -- security exclusions,
        game detection, and controls mapping. This takes about 5 minutes and
        you'll never have to do it again.
      </div>

      <div className={styles.modeGrid}>
        {MODES.map(m => (
          <div
            key={m.key}
            className={[
              styles.modeCard,
              selectedKey === m.key ? styles.modeSelected : '',
            ].join(' ')}
            onClick={() => setSelectedKey(m.key)}
          >
            <div className={styles.modeIcon}>{m.icon}</div>
            <div className={styles.modeName}>{m.name}</div>
            <div className={styles.modeSub}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btn} onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  )
}
