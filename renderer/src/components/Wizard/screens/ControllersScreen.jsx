import { useState, useEffect } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import { useWizardNav } from '../../../hooks/useWizardNav'
import styles from './Screen.module.css'
import wizStyles from '../Wizard.module.css'

const CARDS = [
  { key: 'wheel',    icon: 'WHL', name: 'Racing wheel',    sub: 'DirectInput / Force feedback',  row: 'top',    col: 0 },
  { key: 'lightgun', icon: 'GUN', name: 'Light gun',        sub: 'RawInput / Sinden / GUN4IR',   row: 'top',    col: 1 },
  { key: 'gamepad',  icon: 'PAD', name: 'Xbox controller', sub: 'XInput / controller 1',          row: 'bottom', col: 0 },
]

// Focus index map:
// 0 = EXIT
// 1 = WHL  (top row left)
// 2 = GUN  (top row right)
// 3 = PAD  (middle row -- full width)
// 4 = BACK (bottom left)
// 5 = CONTINUE (bottom right)

const EXIT_IDX     = 0
const WHL_IDX      = 1
const GUN_IDX      = 2
const PAD_IDX      = 3
const BACK_IDX     = 4
const CONTINUE_IDX = 5

export default function ControllersScreen({ config, updateConfig, next, prev }) {
  const { exitConfirm, handleExit } = useWizardNav()

  // selectedKeys = which controllers are toggled ON (blue persistent highlight)
  // focusIdx     = where the D-pad cursor is right now (cyan outline)
  const [selectedKeys, setSelectedKeys] = useState(() => {
    const saved = config.controllers || {}
    const s = new Set(Object.keys(saved).filter(k => saved[k]))
    return s
  })
  const [focusIdx, setFocusIdx] = useState(CONTINUE_IDX)

  // Auto-detect connected gamepad on mount
  useEffect(() => {
    const detect = () => {
      const pads = [...(navigator.getGamepads?.() || [])].filter(Boolean)
      if (pads.length > 0) setSelectedKeys(prev => new Set([...prev, 'gamepad']))
    }
    detect()
    window.addEventListener('gamepadconnected', detect)
    return () => window.removeEventListener('gamepadconnected', detect)
  }, [])

  const toggleCard = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleContinue = () => {
    const controllers = {}
    CARDS.forEach(c => { controllers[c.key] = selectedKeys.has(c.key) ? 'detected' : null })
    updateConfig({ controllers })
    next()
  }

  const confirmFocused = () => {
    if (focusIdx === EXIT_IDX)     { handleExit(); return }
    if (focusIdx === BACK_IDX)     { prev(); return }
    if (focusIdx === CONTINUE_IDX) { handleContinue(); return }
    if (focusIdx === WHL_IDX) toggleCard('wheel')
    if (focusIdx === GUN_IDX) toggleCard('lightgun')
    if (focusIdx === PAD_IDX) toggleCard('gamepad')
  }

  useGamepad({
    up: () => {
      if (focusIdx === CONTINUE_IDX || focusIdx === BACK_IDX) setFocusIdx(PAD_IDX)
      else if (focusIdx === PAD_IDX)  setFocusIdx(WHL_IDX)
      else if (focusIdx === WHL_IDX || focusIdx === GUN_IDX) setFocusIdx(EXIT_IDX)
    },
    down: () => {
      if (focusIdx === EXIT_IDX)  setFocusIdx(WHL_IDX)
      else if (focusIdx === WHL_IDX || focusIdx === GUN_IDX) setFocusIdx(PAD_IDX)
      else if (focusIdx === PAD_IDX)  setFocusIdx(CONTINUE_IDX)
    },
    left: () => {
      if (focusIdx === GUN_IDX)      setFocusIdx(WHL_IDX)
      else if (focusIdx === CONTINUE_IDX) setFocusIdx(BACK_IDX)
    },
    right: () => {
      if (focusIdx === WHL_IDX)  setFocusIdx(GUN_IDX)
      else if (focusIdx === BACK_IDX) setFocusIdx(CONTINUE_IDX)
    },
    confirm:     confirmFocused,
    back:        prev,
    filterRight: handleContinue,
  })

  const cardClass = (key, idx) => [
    styles.ctrlCard,
    selectedKeys.has(key) ? styles.ctrlSelected : styles.ctrlOff,
    focusIdx === idx       ? styles.ctrlFocused  : '',
  ].join(' ')

  return (
    <div className={styles.screen} style={{ position: 'relative' }}>

      <button
        className={[wizStyles.exitBtn, focusIdx===EXIT_IDX?wizStyles.exitFocused:'', exitConfirm?wizStyles.exitConfirm:''].join(' ')}
        onClick={handleExit}
        onMouseEnter={() => setFocusIdx(EXIT_IDX)}
      >{exitConfirm ? 'CONFIRM' : 'EXIT'}</button>

      <div className={styles.eyebrow}>Step 4 -- Controllers</div>
      <div className={styles.title}>Select your controllers.</div>
      <div className={styles.sub}>
        Choose which controllers you have connected. NuArcade will assign
        each genre to the right controller. You can override per-game later.
      </div>

      <div className={styles.ctrlTopRow}>
        <div className={cardClass('wheel', WHL_IDX)}
          onClick={() => { setFocusIdx(WHL_IDX); toggleCard('wheel') }}
          onMouseEnter={() => setFocusIdx(WHL_IDX)}
        >
          <div className={styles.ctrlIcon}>WHL</div>
          <div className={styles.ctrlStatus}>{selectedKeys.has('wheel') ? 'ON' : 'OFF'}</div>
          <div className={styles.ctrlName}>Racing wheel</div>
          <div className={styles.ctrlSub}>DirectInput / Force feedback</div>
        </div>
        <div className={cardClass('lightgun', GUN_IDX)}
          onClick={() => { setFocusIdx(GUN_IDX); toggleCard('lightgun') }}
          onMouseEnter={() => setFocusIdx(GUN_IDX)}
        >
          <div className={styles.ctrlIcon}>GUN</div>
          <div className={styles.ctrlStatus}>{selectedKeys.has('lightgun') ? 'ON' : 'OFF'}</div>
          <div className={styles.ctrlName}>Light gun</div>
          <div className={styles.ctrlSub}>RawInput / Sinden / GUN4IR</div>
        </div>
      </div>

      <div className={cardClass('gamepad', PAD_IDX)}
        style={{ marginTop: '12px' }}
        onClick={() => { setFocusIdx(PAD_IDX); toggleCard('gamepad') }}
        onMouseEnter={() => setFocusIdx(PAD_IDX)}
      >
        <div className={styles.ctrlIcon}>PAD</div>
        <div className={styles.ctrlStatus}>{selectedKeys.has('gamepad') ? 'ON' : 'OFF'}</div>
        <div className={styles.ctrlName}>Xbox controller</div>
        <div className={styles.ctrlSub}>XInput / controller 1</div>
      </div>

      <div className={styles.btnRow} style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <button className={[styles.btnBack, focusIdx===BACK_IDX?styles.btnFocused:''].join(' ')}
          onClick={prev} onMouseEnter={() => setFocusIdx(BACK_IDX)}>Back</button>
        <button className={[styles.btn, focusIdx===CONTINUE_IDX?styles.btnFocused:''].join(' ')}
          onClick={handleContinue} onMouseEnter={() => setFocusIdx(CONTINUE_IDX)}>Continue</button>
      </div>

    </div>
  )
}
