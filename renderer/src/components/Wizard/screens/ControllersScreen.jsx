import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const CARDS = [
  { key: 'wheel',    icon: 'WHL', name: 'Racing Wheel',    sub: 'DirectInput / Force feedback' },
  { key: 'lightgun', icon: 'GUN', name: 'Light Gun',       sub: 'RawInput / Sinden / GUN4IR'  },
  { key: 'gamepad',  icon: 'PAD', name: 'Xbox Controller', sub: 'XInput / controller 1'        },
]

export default function ControllersScreen({ config, updateConfig, next, prev }) {
  const [selected,  setSelected ] = useState(() => {
    const saved = config.controllers || {}
    return new Set(Object.keys(saved).filter(k => saved[k]))
  })
  const [detected, setDetected] = useState(false)

  // Listen for gamepadconnected -- fires when user presses a button
  useEffect(() => {
    const onConnect = (e) => {
      console.log('[Controllers] gamepad connected:', e.gamepad.id)
      setSelected(prev => new Set([...prev, 'gamepad']))
      setDetected(true)
    }
    window.addEventListener('gamepadconnected', onConnect)
    return () => window.removeEventListener('gamepadconnected', onConnect)
  }, [])

  // Manual re-detect -- polls navigator.getGamepads() after user clicks
  const handleReDetect = () => {
    const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean)
    if (pads.length > 0) {
      setSelected(prev => new Set([...prev, 'gamepad']))
      setDetected(true)
    } else {
      setDetected(false)
    }
  }

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleContinue = () => {
    const controllers = {}
    CARDS.forEach(c => { controllers[c.key] = selected.has(c.key) ? 'detected' : null })
    updateConfig({ controllers })
    next()
  }

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 4 -- Controllers</div>
      <div className={styles.title}>Select your controllers.</div>
      <div className={styles.sub}>
        Click each controller you have connected. Press any button on your
        Xbox controller first, then click Re-detect if it wasn't found automatically.
      </div>

      <div className={styles.ctrlGrid}>
        {CARDS.map(c => (
          <div
            key={c.key}
            className={[
              styles.ctrlCard,
              selected.has(c.key) ? styles.ctrlSelected : styles.ctrlOff,
            ].join(' ')}
            onClick={() => toggle(c.key)}
          >
            <div className={styles.ctrlIcon}>{c.icon}</div>
            <div className={styles.ctrlName}>{c.name}</div>
            <div className={styles.ctrlSub}>{c.sub}</div>
            <div className={styles.ctrlStatus}>
              {selected.has(c.key) ? 'ON' : 'OFF'}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.ctrlDetectRow}>
        <button className={styles.ctrlDetectBtn} onClick={handleReDetect}>
          Re-detect Controller
        </button>
        {detected && (
          <span className={styles.ctrlDetectOk}>Xbox controller detected</span>
        )}
        {!detected && (
          <span className={styles.ctrlDetectHint}>
            Press a button on your controller, then click Re-detect
          </span>
        )}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={handleContinue}>Continue</button>
      </div>
    </div>
  )
}
