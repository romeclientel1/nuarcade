import { useState, useEffect, useRef } from 'react'
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'
import styles from './GameCoach.module.css'
import { useI18n } from '../../i18n/I18nContext.js'

// Sentinels stored in `error` state instead of pre-translated text, so the
// displayed message is resolved via t() at render time and stays reactive
// to a locale change even though the error itself was set once,
// asynchronously, well before any later render.
const NO_RESPONSE = "__no_response__"
const CONNECT_FAILED = "__connect_failed__"

export default function GameCoach({ game, onClose }) {
  const { t } = useI18n()
  const [text,    setText   ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState(null)
  const scrollRef = useRef(null)
  const doneRef   = useRef(false)

  useOverlayGamepad({
    onClose,
    onUp:   () => scrollRef.current?.scrollBy({ top: -80, behavior: 'smooth' }),
    onDown: () => scrollRef.current?.scrollBy({ top:  80, behavior: 'smooth' }),
  })

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
        setError(NO_RESPONSE)
      }
    }).catch(e => {
      console.log('[COACH UI] catch:', e.message)
      setLoading(false)
      setError(e.message || CONNECT_FAILED)
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

  const gameTitle = game?.title || game?.id || game?.profile || t("coach.unknownGame")

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.badge}>{t("coach.title")}</div>
            <div className={styles.gameTitle}>{gameTitle}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>ESC</button>
        </div>

        <div className={styles.body} ref={scrollRef}>
          {loading && (
            <div className={styles.thinking}>
              <div className={styles.dot} /><div className={styles.dot} /><div className={styles.dot} />
              <span>{t("coach.analyzing", { game: gameTitle })}</span>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              {error === NO_RESPONSE ? t("coach.noResponse")
                : error === CONNECT_FAILED ? t("coach.connectionFailed")
                : error.includes('API key') ? t("coach.noApiKey")
                : error}
            </div>
          )}

          {text && (
            <div className={styles.content}>
              {formatText(text)}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {t("coach.footer")}
        </div>
      </div>
    </div>
  )
}
