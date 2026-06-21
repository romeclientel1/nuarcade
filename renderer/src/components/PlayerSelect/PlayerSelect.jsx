import { useState, useEffect, useRef } from 'react'
import { useGamepad } from '../../hooks/useGamepad'
import styles from './PlayerSelect.module.css'

const MAX_NAME_LEN = 12

export default function PlayerSelect({ profiles, onSelect, onGuest, onAdd, onDelete }) {
  const [adding,      setAdding     ] = useState(false)
  const [name,        setName       ] = useState('')
  const [focusIdx,    setFocusIdx   ] = useState(1)  // start on first profile
  const [exitConfirm, setExitConfirm] = useState(false)
  const exitTimer = useRef(null)
  const inputRef  = useRef(null)

  // Focus map:
  // 0          = EXIT button
  // 1..N       = profile slots (profiles[focusIdx - 1])
  // N+1        = New Player button
  // N+2        = Play as Guest button
  const EXIT_IDX        = 0
  const FIRST_IDX       = 1
  const NEW_PLAYER_IDX  = profiles.length + 1
  const GUEST_IDX       = profiles.length + 2
  const TOTAL           = profiles.length + 3  // exit + profiles + newplayer + guest

  const handleExit = () => {
    if (exitConfirm) {
      window.nuarcade?.closeApp?.()
    } else {
      setExitConfirm(true)
      clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => setExitConfirm(false), 3000)
    }
  }

  const confirmFocused = () => {
    if (adding) return
    if (focusIdx === EXIT_IDX) {
      handleExit()
    } else if (focusIdx >= FIRST_IDX && focusIdx <= profiles.length) {
      onSelect(profiles[focusIdx - 1])
    } else if (focusIdx === NEW_PLAYER_IDX) {
      setAdding(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else if (focusIdx === GUEST_IDX) {
      onGuest()
    }
  }

  useGamepad({
    confirm: confirmFocused,
    back:    onGuest,
    up:      () => !adding && setFocusIdx(i => (i - 1 + TOTAL) % TOTAL),
    down:    () => !adding && setFocusIdx(i => (i + 1) % TOTAL),
    left:    () => !adding && setFocusIdx(i => i <= FIRST_IDX ? GUEST_IDX : i - 1),
    right:   () => !adding && setFocusIdx(i => i >= GUEST_IDX ? FIRST_IDX : i + 1),
  })

  useEffect(() => {
    const onKey = e => {
      if (adding) {
        if (e.key === 'Enter')  handleAdd()
        if (e.key === 'Escape') { setAdding(false); setName('') }
        return
      }
      if (e.key === 'ArrowUp')    setFocusIdx(i => (i - 1 + TOTAL) % TOTAL)
      if (e.key === 'ArrowDown')  setFocusIdx(i => (i + 1) % TOTAL)
      if (e.key === 'ArrowLeft')  setFocusIdx(i => i <= FIRST_IDX ? GUEST_IDX : i - 1)
      if (e.key === 'ArrowRight') setFocusIdx(i => i >= GUEST_IDX ? FIRST_IDX : i + 1)
      if (e.key === 'Enter' || e.key === ' ') confirmFocused()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding, focusIdx, profiles, exitConfirm])

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

        <button
          className={styles.exitBtn + (focusIdx === EXIT_IDX ? ' ' + styles.focused : '') + (exitConfirm ? ' ' + styles.exitConfirm : '')}
          onClick={handleExit}
          onMouseEnter={() => setFocusIdx(EXIT_IDX)}
        >
          {exitConfirm ? 'CONFIRM EXIT' : 'EXIT'}
        </button>

        <div className={styles.title}>INSERT COIN</div>

        <div className={styles.profiles}>
          {profiles.map((p, i) => (
            <button
              key={p.id}
              className={styles.profile + (focusIdx === i + FIRST_IDX ? ' ' + styles.focused : '')}
              onClick={() => onSelect(p)}
              onMouseEnter={() => setFocusIdx(i + FIRST_IDX)}
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
              onKeyDown={e => {
                if (e.key === 'Enter')  handleAdd()
                if (e.key === 'Escape') { setAdding(false); setName('') }
              }}
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
