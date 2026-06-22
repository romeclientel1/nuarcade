import { useState } from 'react'
import { useGamepad } from '../../../hooks/useGamepad'
import { useWizardNav } from '../../../hooks/useWizardNav'
import styles from './Screen.module.css'
import wizStyles from '../Wizard.module.css'

const MODES = [
  { key: 'arc+pin',  icon: 'ARC+PIN',  name: 'Arcade + Pinball', sub: 'TeknoParrot & RPCS3 arcade games plus Visual Pinball X tables' },
  { key: 'arcade',   icon: 'ARCADE',   name: 'Arcade only',       sub: 'TeknoParrot & RPCS3 arcade games, no pinball models' },
  { key: 'pinball',  icon: 'PINBALL',  name: 'Pinball only',      sub: 'Visual Pinball X tables only' },
]

// Focus indices: 0=EXIT  1=ARC+PIN  2=ARCADE  3=PINBALL  4=Continue
const EXIT_IDX     = 0
const FIRST_CARD   = 1
const LAST_CARD    = 3
const CONTINUE_IDX = 4

export default function WelcomeScreen({ config, updateConfig, next }) {
  const { exitConfirm, handleExit } = useWizardNav()
  const [selectedKey, setSelectedKey] = useState(config.mode || 'arc+pin')
  const [focusIdx,    setFocusIdx   ] = useState(FIRST_CARD)

  const handleContinue = () => {
    updateConfig({ mode: selectedKey })
    next()
  }

  // A button: select card, confirm EXIT, or press Continue -- never skips accidentally
  const confirmFocused = () => {
    if (focusIdx === EXIT_IDX)     { handleExit(); return }
    if (focusIdx === CONTINUE_IDX) { handleContinue(); return }
    // Cards -- A selects (blue highlight) but does NOT advance the wizard
    setSelectedKey(MODES[focusIdx - FIRST_CARD].key)
  }

  useGamepad({
    // Left/Right only moves between the 3 cards
    left:  () => {
      if (focusIdx >= FIRST_CARD && focusIdx <= LAST_CARD)
        setFocusIdx(i => i > FIRST_CARD ? i - 1 : LAST_CARD)
    },
    right: () => {
      if (focusIdx >= FIRST_CARD && focusIdx <= LAST_CARD)
        setFocusIdx(i => i < LAST_CARD ? i + 1 : FIRST_CARD)
    },
    // Up always goes to EXIT
    up:   () => setFocusIdx(EXIT_IDX),
    // Down moves focus to Continue -- does NOT call next() directly (prevents stick drift advancing)
    down: () => {
      if (focusIdx === EXIT_IDX) setFocusIdx(FIRST_CARD)
      else setFocusIdx(CONTINUE_IDX)
    },
    // A confirms whatever is focused
    confirm: confirmFocused,
    // RB is the only way to jump straight to next screen
    filterRight: handleContinue,
  })

  return (
    <div className={styles.screen} style={{ position: 'relative' }}>

      <button
        className={[
          wizStyles.exitBtn,
          focusIdx === EXIT_IDX ? wizStyles.exitFocused : '',
          exitConfirm           ? wizStyles.exitConfirm : '',
        ].join(' ')}
        onClick={handleExit}
        onMouseEnter={() => setFocusIdx(EXIT_IDX)}
      >
        {exitConfirm ? 'CONFIRM' : 'EXIT'}
      </button>

      <div className={styles.eyebrow} style={{ marginTop: '28px' }}>Welcome</div>
      <div className={styles.title}>Let's get your cabinet ready.</div>
      <div className={styles.sub}>
        NuArcade will configure everything automatically -- security exclusions,
        game detection, and controls mapping. This takes about 5 minutes and
        you'll never have to do it again.
      </div>

      <div className={styles.modeGrid}>
        {MODES.map((m, i) => {
          const cardIdx    = FIRST_CARD + i
          const isSelected = selectedKey === m.key
          const isFocused  = focusIdx === cardIdx
          return (
            <div
              key={m.key}
              className={[
                styles.modeCard,
                isSelected ? styles.modeSelected : '',
                isFocused  ? styles.modeFocused  : '',
              ].join(' ')}
              onClick={() => { setFocusIdx(cardIdx); setSelectedKey(m.key) }}
              onMouseEnter={() => setFocusIdx(cardIdx)}
            >
              <div className={styles.modeIcon}>{m.icon}</div>
              <div className={styles.modeName}>{m.name}</div>
              <div className={styles.modeSub}>{m.sub}</div>
            </div>
          )
        })}
      </div>

      <div className={styles.btnRow}>
        <button
          className={[
            styles.btn,
            focusIdx === CONTINUE_IDX ? styles.btnFocused : '',
          ].join(' ')}
          onClick={handleContinue}
          onMouseEnter={() => setFocusIdx(CONTINUE_IDX)}
        >
          Continue
        </button>
      </div>

    </div>
  )
}
