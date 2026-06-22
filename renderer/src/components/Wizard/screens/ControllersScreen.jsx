import { useState, useEffect } from 'react'
import styles from './Screen.module.css'

const CARDS = [
  { key: 'wheel',    icon: 'WHL', name: 'Racing wheel',    sub: 'DirectInput / Force feedback'  },
  { key: 'lightgun', icon: 'GUN', name: 'Light gun',        sub: 'RawInput / Sinden / GUN4IR'   },
  { key: 'gamepad',  icon: 'PAD', name: 'Xbox controller', sub: 'XInput / controller 1'          },
]

export default function ControllersScreen({ config, updateConfig, next, prev }) {
  const [selected, setSelected] = useState(() => {
    const saved = config.controllers || {}
    return new Set(Object.keys(saved).filter(k => saved[k]))
  })

  // Auto-detect connected gamepad on mount
  useEffect(() => {
    const detect = () => {
      const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean)
      if (pads.length > 0) setSelected(prev => new Set([...prev, 'gamepad']))
    }
    detect()
    window.addEventListener('gamepadconnected', detect)
    return () => window.removeEventListener('gamepadconnected', detect)
  }, [])

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
        Choose which controllers you have connected. NuArcade will assign
        each genre to the right controller. You can override per-game later.
      </div>

      <div className={styles.ctrlTopRow}>
        {CARDS.filter(c => c.key !== 'gamepad').map(c => (
          <div
            key={c.key}
            className={[styles.ctrlCard, selected.has(c.key) ? styles.ctrlSelected : styles.ctrlOff].join(' ')}
            onClick={() => toggle(c.key)}
          >
            <div className={styles.ctrlIcon}>{c.icon}</div>
            <div className={styles.ctrlStatus}>{selected.has(c.key) ? 'ON' : 'OFF'}</div>
            <div className={styles.ctrlName}>{c.name}</div>
            <div className={styles.ctrlSub}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div
        className={[styles.ctrlCard, selected.has('gamepad') ? styles.ctrlSelected : styles.ctrlOff].join(' ')}
        style={{ marginTop: '12px', cursor: 'pointer' }}
        onClick={() => toggle('gamepad')}
      >
        <div className={styles.ctrlIcon}>PAD</div>
        <div className={styles.ctrlStatus}>{selected.has('gamepad') ? 'ON' : 'OFF'}</div>
        <div className={styles.ctrlName}>Xbox controller</div>
        <div className={styles.ctrlSub}>XInput / controller 1</div>
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnBack} onClick={prev}>Back</button>
        <button className={styles.btn} onClick={handleContinue}>Continue</button>
      </div>
    </div>
  )
}
