import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const GENRE_ASSIGNMENTS = [
  { genre: 'Racing',   icon: 'WHL', ctrl: 'wheel',    label: 'Racing wheel' },
  { genre: 'Shooter',  icon: 'GUN', ctrl: 'lightgun',  label: 'Light gun' },
  { genre: 'Fighting', icon: 'PAD', ctrl: 'gamepad',   label: 'Xbox controller' },
  { genre: 'Rhythm',   icon: 'BTN', ctrl: 'gamepad',   label: 'Xbox controller' },
  { genre: 'Flying',   icon: 'STK', ctrl: 'gamepad',   label: 'Xbox controller' },
  { genre: 'Pinball',  icon: 'FLP', ctrl: 'gamepad',   label: 'Xbox controller' },
]

const CONTROLLER_CARDS = [
  { key: 'wheel',    icon: 'WHL', name: 'Racing wheel',    sub: 'DirectInput ? Force feedback' },
  { key: 'lightgun', icon: 'GUN', name: 'Light gun',        sub: 'RawInput ? Sinden / GUN4IR' },
  { key: 'gamepad',  icon: 'PAD', name: 'Xbox controller',  sub: 'XInput ? controller 1' },
  { key: 'joystick', icon: 'STK', name: 'Flight stick',     sub: 'Connect to enable flying games' },
]

export default function ControllersScreen({ config, updateConfig, next, prev }) {
  const [detected, setDetected] = useState(['gamepad'])

  useEffect(() => {
    detectControllers()
  }, [])

  const detectControllers = async () => {
    // Real gamepad detection via browser Gamepad API
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
    const found = ['gamepad'] // gamepad always shown as default

    for (const gp of gamepads) {
      if (!gp) continue
      const name = gp.id.toLowerCase()
      if (name.includes('wheel') || name.includes('logitech') || name.includes('thrustmaster')) {
        found.push('wheel')
      }
      if (name.includes('sinden') || name.includes('gun4ir') || name.includes('aimtrak')) {
        found.push('lightgun')
      }
      if (name.includes('joystick') || name.includes('hotas') || name.includes('flight')) {
        found.push('joystick')
      }
    }

    setDetected([...new Set(found)])
    updateConfig({
      controllers: {
        wheel:    found.includes('wheel')    ? 'detected' : null,
        lightgun: found.includes('lightgun') ? 'detected' : null,
        gamepad:  'detected',
      }
    })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 3 ? Controllers</div>
      <div className={styles.title}>Controllers detected.</div>
      <div className={styles.sub}>
        NuArcade found the following devices. Each genre is automatically
        assigned the right controller. You can override per-game later
        from the game info panel.
      </div>

      <div className={styles.ctrlGrid}>
        {CONTROLLER_CARDS.map(c => {
          const isDetected = detected.includes(c.key)
          return (
            <div key={c.key} className={`${styles.ctrlCard} ${isDetected ? styles.ctrlDetected : styles.ctrlMissing}`}>
              <div className={styles.ctrlTop}>
                <span className={styles.ctrlIcon}>{c.icon}</span>
                <span className={styles.ctrlName}>{c.name}</span>
                <span className={isDetected ? styles.badgeOk : styles.badgeNo}>
                  {isDetected ? 'Detected' : 'Not found'}
                </span>
              </div>
              <div className={styles.ctrlSub}>{c.sub}</div>
            </div>
          )
        })}
      </div>

      <div className={styles.assignTable}>
        <div className={styles.assignHeader}>Auto assignment</div>
        {GENRE_ASSIGNMENTS.map(a => (
          <div key={a.genre} className={styles.assignRow}>
            <div className={styles.assignGenre}>
              <span>{a.icon}</span>
              <span>{a.genre}</span>
            </div>
            <div className={styles.assignCtrl}>
              ? {detected.includes(a.ctrl) ? a.label : 'Xbox controller'}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btnNext} onClick={next}>Continue ?</button>
      </div>
    </div>
  )
}