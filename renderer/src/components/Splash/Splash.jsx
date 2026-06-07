import { useState, useEffect } from 'react'
import styles from './Splash.module.css'

export default function Splash({ onComplete }) {
  const [phase, setPhase] = useState('logo')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tagline'), 800)
    const t2 = setTimeout(() => setPhase('fade'), 2000)
    const t3 = setTimeout(() => onComplete(), 2600)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [])

  return (
    <div className={`${styles.shell} ${phase === 'fade' ? styles.fade : ''}`}>
      <div className={styles.grid} />
      <div className={styles.center}>
        <div className={`${styles.logo} ${phase !== 'logo' ? styles.logoUp : ''}`}>
          <span className={styles.nu}>Nu</span>
          <span className={styles.arcade}>Arcade</span>
        </div>
        <div className={`${styles.tagline} ${phase === 'tagline' || phase === 'fade' ? styles.taglineIn : ''}`}>
          INSERT COIN TO CONTINUE
        </div>
        <div className={`${styles.version} ${phase === 'tagline' || phase === 'fade' ? styles.versionIn : ''}`}>
          v1.3.0
        </div>
      </div>
      <div className={styles.scanline} />
    </div>
  )
}
