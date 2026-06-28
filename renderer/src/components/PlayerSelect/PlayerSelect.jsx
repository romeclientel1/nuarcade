import { useState, useEffect, useRef } from 'react'
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import { useArcadeSounds } from '../../hooks/useArcadeSounds'
import styles from './PlayerSelect.module.css'

const MAX_NAME_LEN = 12

// Focus indices
const EXIT_IDX    = 0
const NEW_P_IDX   = 1
const GUEST_IDX   = 2

export default function PlayerSelect({ profiles, onSelect, onGuest, onAdd, onDelete }) {
  const [exitConfirm, setExitConfirm] = useState(false)
  const handleExit = () => {
    if (exitConfirm) { window.nuarcade?.quit?.() }
    else { setExitConfirm(true); setTimeout(() => setExitConfirm(false), 3000) }
  }
  const snd = useArcadeSounds()

  const [adding,    setAdding   ] = useState(false)
  const [name,      setName     ] = useState('')
  const [selected,  setSelected ] = useState(null)
  const [focusIdx,  setFocusIdx ] = useState(NEW_P_IDX)
  const focusRef = useRef(NEW_P_IDX)
  const inputRef = useRef(null)

  // Keep focusRef in sync
  useEffect(() => { focusRef.current = focusIdx }, [focusIdx])

  // Play coin sound on mount
  useEffect(() => { snd.coin() }, [])

  // Profile focus slots: EXIT(0), profiles(1..N), NewPlayer(N+1), Guest(N+2), Wizard(N+3)
  const profileStart = 1
  const profileEnd   = profiles.length
  const newPIdx      = profileEnd + 1
  const guestIdx     = profileEnd + 2

  const confirmFocused = () => {
    if (adding) return
    snd.select()
    const cur = focusRef.current
    if (cur === 0)         { handleExit(); return }
    if (cur >= profileStart && cur <= profileEnd) {
      const p = profiles[cur - profileStart]
      setSelected(cur); onSelect(p); return
    }
    if (cur === newPIdx)   { setAdding(true); return }
    if (cur === guestIdx)  { onGuest(); return }
    if (cur === wizardIdx) { /* wizard removed */null(); return }
  }

  useOverlayGamepad({
    onUp:      () => { if (!adding) { snd.navigate(); setFocusIdx(i => Math.max(0, i - 1)) } },
    onDown:    () => { if (!adding) { snd.navigate(); setFocusIdx(i => Math.min(guestIdx, i + 1)) } },
    onLeft:    () => { if (!adding) { snd.navigate(); setFocusIdx(i => Math.max(0, i - 1)) } },
    onRight:   () => { if (!adding) { snd.navigate(); setFocusIdx(i => Math.min(wizardIdx, i + 1)) } },
    onConfirm: () => confirmFocused(),
    onClose:   () => { if (adding) { setAdding(false); setName('') } },
    enabled:   true,
  })

  const isFocused = (idx) => focusIdx === idx

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
        className={[styles.exitBtn, exitConfirm ? styles.exitConfirm : '', isFocused(0) ? styles.focused : ''].join(' ')}
        onClick={() => { snd.back(); handleExit() }}
        onMouseEnter={() => { if (focusIdx !== 0) snd.navigate(); setFocusIdx(0) }}
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
                className={[styles.profileBtn, isFocused(profileStart + i) ? styles.profileBtnActive : ''].join(' ')}
                onClick={() => { setSelected(profileStart + i); onSelect(p) }}
                onMouseEnter={() => { if (focusIdx !== profileStart + i) snd.navigate(); setFocusIdx(profileStart + i) }}
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
                if (e.key === 'Enter' && name.trim()) { snd.select(); onAdd(name.trim()); setAdding(false); setName('') }
                if (e.key === 'Escape') { setAdding(false); setName('') }
              }}
              autoFocus
            />
            <button className={styles.confirmBtn} onClick={() => {
              if (name.trim()) { snd.select(); onAdd(name.trim()); setAdding(false); setName('') }
            }}>OK</button>
            <button className={styles.cancelBtn} onClick={() => { setAdding(false); setName('') }}>Cancel</button>
          </div>
        ) : (
          <div className={styles.actionRow}>
            <button
              className={[styles.btnNewPlayer, isFocused(newPIdx) ? styles.focused : ''].join(' ')}
              onClick={() => setAdding(true)}
              onMouseEnter={() => { if (focusIdx !== newPIdx) snd.navigate(); setFocusIdx(newPIdx) }}
            >
              <span className={styles.btnIcon}>+</span>
              New Player
            </button>
            <button
              className={[styles.btnGuest, isFocused(guestIdx) ? styles.focused : ''].join(' ')}
              onClick={onGuest}
              onMouseEnter={() => { if (focusIdx !== guestIdx) snd.navigate(); setFocusIdx(guestIdx) }}
            >
              Play as Guest
            </button>
          </div>
        )}
      </div>


    </div>
  )
}
