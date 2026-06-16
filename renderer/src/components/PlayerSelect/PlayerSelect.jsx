import { useState, useEffect, useRef } from 'react'
import styles from './PlayerSelect.module.css'

const MAX_NAME_LEN = 12

export default function PlayerSelect({ profiles, onSelect, onGuest, onAdd }) {
  const [adding,    setAdding   ] = useState(false)
  const [name,      setName     ] = useState('')
  const [selected,  setSelected ] = useState(null)
  const inputRef = useRef(null)

  // Auto-focus input when adding
  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus()
  }, [adding])

  // Keyboard: Enter to confirm, Escape to cancel
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (adding) { setAdding(false); setName('') }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding])

  const handleAdd = () => {
    const trimmed = name.trim().toUpperCase().slice(0, MAX_NAME_LEN)
    if (!trimmed) return
    onAdd(trimmed)  // parent handles create + select + phase change
    setAdding(false)
    setName('')
  }

  const formatTime = (ms) => {
    if (!ms) return '0h'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return h + 'h ' + m + 'm'
    return m + 'm'
  }

  const timeAgo = (ts) => {
    if (!ts) return 'Never'
    const diff = Date.now() - ts
    const d = Math.floor(diff / 86400000)
    const h = Math.floor(diff / 3600000)
    const m = Math.floor(diff / 60000)
    if (d > 0) return d + 'd ago'
    if (h > 0) return h + 'h ago'
    if (m > 0) return m + 'm ago'
    return 'Just now'
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.scanlines} />

      <div className={styles.content}>
        <div className={styles.brand}>NuArcade</div>
        <div className={styles.headline}>INSERT COIN</div>
        <div className={styles.sub}>Select your player</div>

        <div className={styles.profiles}>
          {profiles.map(p => (
            <div
              key={p.id}
              className={styles.profileCard + (selected === p.id ? ' ' + styles.profileSelected : '')}
              style={{ '--profile-color': p.color }}
              onClick={() => setSelected(selected === p.id ? null : p.id)}
              onDoubleClick={() => onSelect(p.id)}
            >
              <div className={styles.avatar} style={{ background: p.color + '22', borderColor: p.color + '66' }}>
                <span style={{ color: p.color }}>{p.name[0]}</span>
              </div>
              <div className={styles.profileInfo}>
                <div className={styles.profileName} style={{ color: p.color }}>{p.name}</div>
                <div className={styles.profileStats}>
                  {p.gamesPlayed || 0} games played
                </div>
                <div className={styles.profileStats}>
                  {formatTime(p.totalPlaytime)} total
                </div>
                <div className={styles.profileLast}>
                  Last seen: {timeAgo(p.lastSeen)}
                </div>
              </div>
              {selected === p.id && (
                <button
                  className={styles.selectBtn}
                  style={{ background: p.color, color: '#000' }}
                  onClick={(e) => { e.stopPropagation(); onSelect(p.id) }}
                >
                  PLAY
                </button>
              )}
            </div>
          ))}

          {adding ? (
            <div className={styles.addCard}>
              <div className={styles.addTitle}>Enter your name</div>
              <input
                ref={inputRef}
                className={styles.nameInput}
                value={name}
                onChange={e => setName(e.target.value.toUpperCase().slice(0, MAX_NAME_LEN))}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                placeholder="AAA"
                maxLength={MAX_NAME_LEN}
              />
              <div className={styles.addActions}>
                <button className={styles.confirmBtn} onClick={handleAdd} disabled={!name.trim()}>
                  CREATE
                </button>
                <button className={styles.cancelBtn} onClick={() => { setAdding(false); setName('') }}>
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.addCard} onClick={() => setAdding(true)}>
              <div className={styles.addIcon}>+</div>
              <div className={styles.addLabel}>New Player</div>
            </div>
          )}
        </div>

        <button className={styles.guestBtn} onClick={onGuest}>
          Play as Guest
        </button>
      </div>
    </div>
  )
}
