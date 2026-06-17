import { useState, useEffect, useRef } from 'react'
import styles from './GameCoach.module.css'

export default function GameCoach({ game, onClose }) {
  const [text,    setText   ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState(null)
  const scrollRef = useRef(null)
  const doneRef   = useRef(false)

  useEffect(() => {
    if (!game || doneRef.current) return
    doneRef.current = true

    // Fire the IPC call -- response comes back as { success, text } or { error }
    window.nuarcade?.gameCoach({
      gameTitle: game.title || game.id || game.profile,
      system:    game.system || '',
      genre:     game.genre  || '',
      emulator:  game.emulator || '',
    }).then(result => {
      console.log('[COACH UI] result:', JSON.stringify(result).slice(0, 200))
      setLoading(false)
      if (result?.error) {
        setError(result.error)
      } else if (result?.text) {
        setText(result.text)
      } else {
        setError('No response received')
      }
    }).catch(e => {
      console.log('[COACH UI] catch:', e.message)
      setLoading(false)
      setError(e.message || 'Failed to connect to AI coach')
    })

    // Also listen for chunk events as fallback
    const handler = (_, { text: chunk }) => {
      setText(prev => prev + chunk)
      setLoading(false)
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }
    window.nuarcade?.onCoachChunk?.(({ text: chunk }) => {
      setText(prev => prev + chunk)
      setLoading(false)
    })

    // Close on Escape or C
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const formatText = (raw) => {
    if (!raw) return null
    return raw.split('\n').map((line, i) => {
      const labelMatch = line.match(/^(ABOUT|HOW TO WIN|SECRETS|PRO MOVE):(.*)/)
      if (labelMatch) {
        return (
          <div key={i} className={styles.section}>
            <span className={styles.label}>{labelMatch[1]}</span>
            <span className={styles.sectionText}>{labelMatch[2]}</span>
          </div>
        )
      }
      return line ? <p key={i} className={styles.para}>{line}</p> : <br key={i} />
    })
  }

  const gameTitle = game?.title || game?.id || game?.profile || 'Unknown Game'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.badge}>AI COACH</div>
            <div className={styles.gameTitle}>{gameTitle}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>ESC</button>
        </div>

        <div className={styles.body} ref={scrollRef}>
          {loading && (
            <div className={styles.thinking}>
              <div className={styles.dot} /><div className={styles.dot} /><div className={styles.dot} />
              <span>Analyzing {gameTitle}...</span>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              {error.includes('API key') ? (
                <>No Anthropic API key set. Add it in Settings.</>
              ) : error}
            </div>
          )}

          {text && (
            <div className={styles.content}>
              {formatText(text)}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          Press C or ESC to close
        </div>
      </div>
    </div>
  )
}
