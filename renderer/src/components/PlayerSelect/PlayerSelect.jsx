import { useState, useEffect, useRef } from 'react'
import { useGamepad } from '../../hooks/useGamepad'
import { useWizardNav } from '../../hooks/useWizardNav'
import styles from './PlayerSelect.module.css'

const MAX_NAME_LEN = 12

export default function PlayerSelect({ profiles, onSelect, onGuest, onAdd, onDelete, onRestartWizard }) {
  const { exitConfirm, handleExit } = useWizardNav()
  const [adding,   setAdding  ] = useState(false)
  const [name,     setName    ] = useState('')
  const [selected, setSelected] = useState(null)
  const inputRef = useRef(null)

  // Focus index:
  // 0           = EXIT
  // 1..N        = existing profiles
  // N+1         = New Player
  // N+2         = Play as Guest
  // N+3         = Restart Wizard
  const EXIT_IDX     = 0
  const FIRST_IDX    = 1
  const lastIdx      = () => profiles.length + 3
  const newPlayerIdx = profiles.length + 1
  const guestIdx     = profiles.length + 2
  const wizardIdx    = profiles.length + 3

  const [focusIdx, setFocusIdx] = useState(newPlayerIdx)

  // Keep focusIdx on New Player if profiles change
  useEffect(() => {
    setFocusIdx(profiles.length + 1)
  }, [profiles.length])

  // Keyboard handler for name input
  useEffect(() => {
    const onKey = (e) => {
      if (!adding) return
      if (e.key === 'Enter') { handleAdd(); return }
      if (e.key === 'Escape') { setAdding(false); setName(''); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding, name])

  const handleAdd = () => {
    const trimmed = name.trim().toUpperCase().slice(0, MAX_NAME_LEN)
    if (!trimmed) return
    onAdd(trimmed)
    setAdding(false)
    setName('')
  }

  const formatTime = (ms) => {
    if (!ms) return ''
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? h + 'h ' + m + 'm' : m + 'm'
  }

  const confirmFocused = () => {
    if (adding) return
    if (focusIdx === EXIT_IDX)   { handleExit(); return }
    if (focusIdx >= FIRST_IDX && focusIdx <= profiles.length) {
      const p = profiles[focusIdx - 1]
      setSelected(p.id)
      onSelect(p)
      return
    }
    if (focusIdx === newPlayerIdx) { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); return }
    if (focusIdx === guestIdx)    { onGuest(); return }
    if (focusIdx === wizardIdx)   { onRestartWizard?.(); return }
  }

  const total = profiles.length + 4 // EXIT + profiles + NewPlayer + Guest + Wizard

  useGamepad({
    up:      () => { if (!adding) setFocusIdx(i => Math.max(EXIT_IDX, i - 1)) },
    down:    () => { if (!adding) setFocusIdx(i => Math.min(wizardIdx, i + 1)) },
    confirm: confirmFocused,
    back:    () => { if (!adding) onGuest() },
  })

  return (
    <div className={styles.overlay}>
      <div className={styles.grid} />
      <div className={styles.scanlines} />

      {/* Spinning coin animation */}
      <div className={styles.coin} aria-hidden="true">
        <div className={styles.coinFace}>Nu</div>
      </div>

      {/* Running pixel character */}
      <div className={styles.runner} aria-hidden="true">
        <div className={styles.runnerHead} />
        <div className={styles.runnerVisor} />
        <div className={styles.runnerBody} />
        <div className={styles.runnerLegL} />
        <div className={styles.runnerLegR} />
        <div className={styles.runnerArmL} />
        <div className={styles.runnerArmR} />
      </div>

      {/* EXIT button top-left */}
      <button
        className={styles.exitBtn + (exitConfirm ? ' ' + styles.exitConfirm : '')}
        onClick={handleExit}
      >
        {exitConfirm ? 'CONFIRM EXIT' : 'EXIT'}
      </button>

      <div className={styles.content}>

        {/* Brand + Headline */}
        <div className={styles.brand}>NuArcade</div>
        <div className={styles.headline}>INSERT COIN</div>
        <div className={styles.sub}>Select your player</div>

        {/* Existing profiles */}
        {profiles.length > 0 && (
          <div className={styles.profileRow}>
            {profiles.map((p, i) => (
              <button
                key={p.id}
                className={styles.profileBtn + (selected === i ? ' ' + styles.profileBtnActive : '')}
                onClick={() => { setSelected(i); onSelect(p) }}
              >
                <span className={styles.profileIcon}>{p.name[0].toUpperCase()}</span>
                <span className={styles.profileName}>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Add new player */}
        {adding ? (
          <div className={styles.addRow}>
            <input
              ref={inputRef}
              className={styles.nameInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name..."
              maxLength={MAX_NAME_LEN}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) { onAdd(name.trim()); setAdding(false); setName('') }
                if (e.key === 'Escape') { setAdding(false); setName('') }
              }}
              autoFocus
            />
            <button className={styles.confirmBtn} onClick={() => { if (name.trim()) { onAdd(name.trim()); setAdding(false); setName('') } }}>OK</button>
            <button className={styles.cancelBtn} onClick={() => { setAdding(false); setName('') }}>Cancel</button>
          </div>
        ) : (
          <div className={styles.actionRow}>
            <button className={styles.btnNewPlayer} onClick={() => setAdding(true)}>
              <span className={styles.btnIcon}>+</span>
              New Player
            </button>
            <button className={styles.btnGuest} onClick={onGuest}>
              Play as Guest
            </button>
          </div>
        )}
      </div>

      {/* Restart Wizard -- bottom right, subtle */}
      <button className={styles.wizardLink} onClick={onRestartWizard}>
        &#9881; Setup Wizard
      </button>
    </div>
  )
}
