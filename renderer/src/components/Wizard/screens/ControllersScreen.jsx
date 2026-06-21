import { useState, useEffect } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import styles from './Screen.module.css'

const CONTROLLER_CARDS = [
  { key: 'wheel',    icon: 'WHL', name: 'Racing wheel',   sub: 'DirectInput / Force feedback' },
  { key: 'lightgun', icon: 'GUN', name: 'Light gun',       sub: 'RawInput / Sinden / GUN4IR' },
  { key: 'gamepad',  icon: 'PAD', name: 'Xbox controller', sub: 'XInput / controller 1' },
]

// Focus: 0..2 = controller cards, 3 = Continue button
const CONTINUE_IDX = CONTROLLER_CARDS.length

export default function ControllersScreen({ config, updateConfig, next }) {
  const [selected, setSelected] = useState(() => {
    const c = config.controllers || {}
    return new Set(Object.keys(c).filter(k => c[k]))
  })
  const [focusIdx, setFocusIdx] = useState(0)

  const toggleCard = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleContinue = () => {
    const controllers = {}
    CONTROLLER_CARDS.forEach(c => {
      controllers[c.key] = selected.has(c.key) ? 'detected' : null
    })
    updateConfig({ controllers })
    next()
  }

  const confirmFocused = () => {
    if (focusIdx === CONTINUE_IDX) handleContinue()
    else toggleCard(CONTROLLER_CARDS[focusIdx].key)
  }

  useGamepad({
    left:    () => setFocusIdx(i => i === 0 ? CONTINUE_IDX : i - 1),
    right:   () => setFocusIdx(i => i >= CONTINUE_IDX ? 0 : i + 1),
    up:      () => setFocusIdx(i => i === 0 ? CONTINUE_IDX : i - 1),
    down:    () => setFocusIdx(i => i >= CONTINUE_IDX ? 0 : i + 1),
    confirm: confirmFocused,
    back:    () => setFocusIdx(CONTINUE_IDX),
  })

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        setFocusIdx(i => i === 0 ? CONTINUE_IDX : i - 1)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        setFocusIdx(i => i >= CONTINUE_IDX ? 0 : i + 1)
      if (e.key === 'Enter' || e.key === ' ') confirmFocused()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusIdx, selected])

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 5 -- Controllers</div>
      <div className={styles.title}>Select your controllers.</div>
      <div className={styles.sub}>
        Choose which controllers you have connected. NuArcade will automatically
        assign each genre to the right controller. You can override per-game later.
      </div>

      <div className={styles.ctrlGrid}>
        {CONTROLLER_CARDS.map((c, i) => {
          const isSelected = selected.has(c.key)
          const isFocused  = focusIdx === i
          return (
            <div
              key={c.key}
              className={[
                styles.ctrlCard,
                isSelected ? styles.ctrlDetected : styles.ctrlMissing,
                isFocused  ? styles.ctrlFocused  : '',
              ].join(' ')}
              onClick={() => { setFocusIdx(i); toggleCard(c.key) }}
              onMouseEnter={() => setFocusIdx(i)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.ctrlTop}>
                <span className={styles.ctrlIcon}>{c.icon}</span>
                <span className={styles.ctrlStatus}>{isSelected ? 'ON' : 'OFF'}</span>
              </div>
              <div className={styles.ctrlName}>{c.name}</div>
              <div className={styles.ctrlSub}>{c.sub}</div>
            </div>
          )
        })}
      </div>

      <button
        className={styles.btn + (focusIdx === CONTINUE_IDX ? ' ' + styles.btnFocused : '')}
        onClick={handleContinue}
        onMouseEnter={() => setFocusIdx(CONTINUE_IDX)}
      >
        Continue
      </button>
    </div>
  )
}
