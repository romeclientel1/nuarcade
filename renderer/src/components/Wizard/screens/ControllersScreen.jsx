import { useState, useEffect } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import styles from './Screen.module.css'

const CONTROLLER_CARDS = [
  { key: 'wheel',    icon: 'WHL', name: 'Racing wheel',   sub: 'DirectInput / Force feedback' },
  { key: 'lightgun', icon: 'GUN', name: 'Light gun',       sub: 'RawInput / Sinden / GUN4IR'  },
  { key: 'gamepad',  icon: 'PAD', name: 'Xbox controller', sub: 'XInput / controller 1'        },
]

// Focus: 0..2 = controller cards, 3 = Back, 4 = Continue
const BACK_IDX     = CONTROLLER_CARDS.length
const CONTINUE_IDX = CONTROLLER_CARDS.length + 1
const TOTAL        = CONTROLLER_CARDS.length + 2

export default function ControllersScreen({ config, updateConfig, next, prev }) {
  const [selected, setSelected] = useState(() => {
    // Pre-select from saved config
    const c = config.controllers || {}
    const s = new Set(Object.keys(c).filter(k => c[k]))
    // Also pre-select gamepad if a controller is currently connected
    if (navigator.getGamepads?.().length > 0 || [...(navigator.getGamepads?.() || [])].some(g => g)) {
      s.add('gamepad')
    }
    return s
  })
  const [focusIdx, setFocusIdx] = useState(0)

  // Auto-detect connected controllers on mount
  useEffect(() => {
    const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean)
    if (pads.length > 0) {
      setSelected(prev => new Set([...prev, 'gamepad']))
    }
    const onConnect = () => setSelected(prev => new Set([...prev, 'gamepad']))
    window.addEventListener('gamepadconnected', onConnect)
    return () => window.removeEventListener('gamepadconnected', onConnect)
  }, [])

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
    CONTROLLER_CARDS.forEach(c => { controllers[c.key] = selected.has(c.key) ? 'detected' : null })
    updateConfig({ controllers })
    next()
  }

  const confirmFocused = () => {
    if (focusIdx === BACK_IDX)     prev()
    else if (focusIdx === CONTINUE_IDX) handleContinue()
    else toggleCard(CONTROLLER_CARDS[focusIdx].key)
  }

  useGamepad({
    left:    () => setFocusIdx(i => (i - 1 + TOTAL) % TOTAL),
    right:   () => setFocusIdx(i => (i + 1) % TOTAL),
    up:      () => setFocusIdx(i => (i - 1 + TOTAL) % TOTAL),
    down:    () => setFocusIdx(i => (i + 1) % TOTAL),
    confirm: confirmFocused,
    back:    prev,
  })

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        setFocusIdx(i => (i - 1 + TOTAL) % TOTAL)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        setFocusIdx(i => (i + 1) % TOTAL)
      if (e.key === 'Enter' || e.key === ' ') confirmFocused()
      if (e.key === 'Escape') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusIdx, selected])

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Step 5 -- Controllers</div>
      <div className={styles.title}>Select your controllers.</div>
      <div className={styles.sub}>
        Choose which controllers you have connected. NuArcade will assign
        each genre to the right controller. You can override per-game later.
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

      <div className={styles.btnRow}>
        <button
          className={styles.btnBack + (focusIdx === BACK_IDX ? ' ' + styles.btnFocused : '')}
          onClick={prev}
          onMouseEnter={() => setFocusIdx(BACK_IDX)}
        >
          Back
        </button>
        <button
          className={styles.btn + (focusIdx === CONTINUE_IDX ? ' ' + styles.btnFocused : '')}
          onClick={handleContinue}
          onMouseEnter={() => setFocusIdx(CONTINUE_IDX)}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
