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

      <button
        className={[
          styles.exitBtn,
          focusIdx === EXIT_IDX ? styles.exitFocused : '',
          exitConfirm           ? styles.exitConfirm : '',
        ].join(' ')}
        onClick={handleExit}
        onMouseEnter={() => setFocusIdx(EXIT_IDX)}
      >{exitConfirm ? 'CONFIRM EXIT' : 'EXIT'}</button>

      <div className={styles.content}>
        <div className={styles.brand}>NuArcade</div>
        <div className={styles.headline}>INSERT COIN</div>
        <div className={styles.sub}>Select your player</div>

        <div className={styles.profiles}>
          {profiles.map((p, i) => {
            const idx = FIRST_IDX + i
            return (
              <div
                key={p.id}
                className={[
                  styles.profileCard,
                  selected === p.id ? styles.profileSelected : '',
                  focusIdx === idx  ? styles.profileFocused  : '',
                ].join(' ')}
                style={{ '--profile-color': p.color }}
                onClick={() => { setSelected(p.id); setFocusIdx(idx); onSelect(p) }}
                onMouseEnter={() => setFocusIdx(idx)}
              >
                <div className={styles.profileInitial}>{p.name[0]}</div>
                <div className={styles.profileName}>{p.name}</div>
                {p.playTime && <div className={styles.profileTime}>{formatTime(p.playTime)}</div>}
                <button
                  className={styles.profileDelete}
                  onClick={e => { e.stopPropagation(); onDelete(p.id) }}
                >x</button>
              </div>
            )
          })}

          {!adding ? (
            <div
              className={[styles.newPlayer, focusIdx===newPlayerIdx?styles.newPlayerFocused:''].join(' ')}
              onClick={() => { setFocusIdx(newPlayerIdx); setAdding(true); setTimeout(()=>inputRef.current?.focus(),50) }}
              onMouseEnter={() => setFocusIdx(newPlayerIdx)}
            >
              <span className={styles.plus}>+</span>
              <span>New Player</span>
            </div>
          ) : (
            <div className={styles.addForm}>
              <input
                ref={inputRef}
                className={styles.nameInput}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter name..."
                maxLength={MAX_NAME_LEN}
                autoFocus
              />
              <button className={styles.addBtn} onClick={handleAdd}>ADD</button>
            </div>
          )}
        </div>

        <button
          className={[styles.guest, focusIdx===guestIdx?styles.guestFocused:''].join(' ')}
          onClick={onGuest}
          onMouseEnter={() => setFocusIdx(guestIdx)}
        >Play as Guest</button>

        <button
          className={[styles.restartWizard, focusIdx===wizardIdx?styles.restartFocused:''].join(' ')}
          onClick={() => onRestartWizard?.()}
          onMouseEnter={() => setFocusIdx(wizardIdx)}
        >Restart Setup Wizard</button>
      </div>
    </div>
  )
}
