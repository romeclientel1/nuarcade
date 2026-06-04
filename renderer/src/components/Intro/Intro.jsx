import { useEffect, useRef, useState } from 'react'
import styles from './Intro.module.css'

const PHASE_TIMINGS = [800, 200, 600, 1200, 800, 600]

export default function Intro({ onComplete }) {
  const [waiting, setWaiting] = useState(true)
  const [logoVisible, setLogoVisible] = useState(false)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [flicker, setFlicker] = useState(false)
  const coinAudioRef = useRef(null)
  const ambientAudioRef = useRef(null)
  const timeoutsRef = useRef([])
  const startedRef = useRef(false)

  const addTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay)
    timeoutsRef.current.push(id)
    return id
  }

  const startIntro = () => {
    if (startedRef.current) return
    startedRef.current = true
    setWaiting(false)
    coinAudioRef.current = new Audio('/sounds/coin.wav')
    coinAudioRef.current.volume = 0.9
    ambientAudioRef.current = new Audio('/sounds/arcade-ambient.wav')
    ambientAudioRef.current.volume = 0
    ambientAudioRef.current.loop = true
    ambientAudioRef.current.play().catch(() => {})
    addTimeout(() => {
      setFlicker(true)
      coinAudioRef.current.play().catch(() => {})
      fadeAudio(ambientAudioRef.current, 0, 0.35, 3000)
      addTimeout(() => {
        setFlicker(false)
        setLogoVisible(true)
        addTimeout(() => {
          addTimeout(() => {
            setTaglineVisible(true)
            addTimeout(() => {
              setFadeOut(true)
              addTimeout(() => onComplete(), PHASE_TIMINGS[5])
            }, PHASE_TIMINGS[4])
          }, PHASE_TIMINGS[3])
        }, PHASE_TIMINGS[2])
      }, PHASE_TIMINGS[1])
    }, PHASE_TIMINGS[0])
  }

  useEffect(() => {
    const handle = () => { if (!startedRef.current) startIntro() }
    window.addEventListener('keydown', handle)
    window.addEventListener('click', handle)
    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      window.removeEventListener('keydown', handle)
      window.removeEventListener('click', handle)
    }
  }, [])

  return (
    <div
      className={`${styles.stage} ${flicker ? styles.flicker : ''} ${fadeOut ? styles.fadeOut : ''}`}
      onClick={waiting ? startIntro : undefined}
    >
      <div className={styles.grid} />
      <div className={styles.vignette} />
      {waiting && (
        <div className={styles.pressStart}>
          Press any key or click to start
        </div>
      )}
      {!waiting && logoVisible && (
        <div className={`${styles.logoWrap} ${styles.logoIn}`}>
          <div className={styles.logoGlow} />
          <div className={styles.logoText}>
            <span className={styles.logoNu}>Nu</span>
            <span className={styles.logoArcade}>Arcade</span>
          </div>
          <div className={styles.scanline} />
        </div>
      )}
      {taglineVisible && (
        <div className={`${styles.tagline} ${styles.taglineIn}`}>
          Modern arcade. One cabinet. Zero compromises.
        </div>
      )}
      {!waiting && (
        <div className={styles.skipHint}>Press any key to skip</div>
      )}
    </div>
  )
}

function fadeAudio(audio, from, to, duration) {
  const steps = 30
  const interval = duration / steps
  const delta = (to - from) / steps
  let current = from
  audio.volume = from
  const timer = setInterval(() => {
    current += delta
    if ((delta > 0 && current >= to) || (delta < 0 && current <= to)) {
      audio.volume = Math.max(0, Math.min(1, to))
      clearInterval(timer)
    } else {
      audio.volume = Math.max(0, Math.min(1, current))
    }
  }, interval)
  return timer
}