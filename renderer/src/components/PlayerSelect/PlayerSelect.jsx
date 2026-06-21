import { useState, useEffect, useRef } from 'react'
import { useGamepad } from '../../hooks/useGamepad'
import styles from './PlayerSelect.module.css'

const MAX_NAME_LEN = 12

export default function PlayerSelect({ profiles, onSelect, onGuest, onAdd, onDelete }) {
  const [adding,   setAdding  ] = useState(false)
  const [name,     setName    ] = useState('')
  const [focusIdx, setFocusIdx] = useState(0)
  const inputRef = useRef(null)

  // Total focusable items: profiles + New Player button + Play as Guest button
  const TOTAL          = profiles.length + 2
  const NEW_PLAYER_IDX = profiles.length
  const GUEST_IDX      = profiles.length + 1

  const confirmFocused = () => {
    if (adding) return
    if (focusIdx < profiles.length)   onSelect(profiles[focusIdx])
    else if (focusIdx === NEW_PLAYER_IDX) { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }
    else if (focusIdx === GUEST_IDX)  onGuest()
  }

  useGamepad({
    confirm: confirmFocused,
    back:    onGuest,
    up:      () => !adding && setFocusIdx(i => (i - 1 + TOTAL) % TOTAL),
    down:    () => !adding && setFocusIdx(i => (i + 1) % TOTAL),
    left:    () => !adding && setFocusIdx(i => (i - 1 + TOTAL) % TOTAL),
    right:   () => !adding && setFocusIdx(i => (i + 1) % TOTAL),
  })

  // Keyboard support
  useEffect(() => {
    const onKey = e => {
      if (adding) {
        if (e.key === 'Enter') handleAdd()
        if (e.key === 'Escape') { setAdding(false); setName('') }
        return
      }
      if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  setFocusIdx(i => (i - 1 + TOTAL) % TOTAL)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') setFocusIdx(i => (i + 1) % TOTAL)
      if (e.key === 'Enter' || e.key === ' ') confirmFocused()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding, focusIdx, profiles])

  const handleAdd = () => {
    const trimmed = name.trim().toUpperCase().slice(0, MAX_NAME_LEN)
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
    setAdding(false)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <div className={styles.title}>INSERT COIN</div>

        <div className={styles.profiles}>
          {profiles.map((p, i) => (
            <button
              key={p.id}
              className={styles.profile + (focusIdx === i ? ' ' + styles.focused : '')}
              onClick={() => onSelect(p)}
              onMouseEnter={() => setFocusIdx(i)}
            >
              <span className={styles.avatar}>{p.name[0]}</span>
              <span className={styles.pname}>{p.name}</span>
            </button>
          ))}
        </div>

        {adding ? (
          <div className={styles.addRow}>
            <input
              ref={inputRef}
              className={styles.nameInput}
              value={name}
              maxLength={MAX_NAME_LEN}
              placeholder="ENTER NAME"
              onChange={e => setName(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setName('') } }}
            />
            <button className={styles.addBtn} onClick={handleAdd}>OK</button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              className={styles.newPlayer + (focusIdx === NEW_PLAYER_IDX ? ' ' + styles.focused : '')}
              onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
              onMouseEnter={() => setFocusIdx(NEW_PLAYER_IDX)}
            >
              NEW PLAYER
            </button>
            <button
              className={styles.guest + (focusIdx === GUEST_IDX ? ' ' + styles.focused : '')}
              onClick={onGuest}
              onMouseEnter={() => setFocusIdx(GUEST_IDX)}
            >
              PLAY AS GUEST
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
