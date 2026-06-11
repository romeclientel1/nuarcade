import { useEffect, useRef, useState } from 'react'
import styles from './Intro.module.css'

// Procedural sound engine -- no files needed
function createAudio() {
  try { return new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
}

function playSound(ctx, type, opts = {}) {
  if (!ctx) return
  const { freq = 440, freq2, duration = 0.3, gain = 0.3, delay = 0, shape = 'square', ramp = 'exp' } = opts
  const osc = ctx.createOscillator()
  const vol = ctx.createGain()
  const now = ctx.currentTime + delay

  osc.connect(vol)
  vol.connect(ctx.destination)
  osc.type = shape
  osc.frequency.setValueAtTime(freq, now)
  if (freq2) osc.frequency.linearRampToValueAtTime(freq2, now + duration)
  vol.gain.setValueAtTime(gain, now)
  if (ramp === 'exp') vol.gain.exponentialRampToValueAtTime(0.001, now + duration)
  else vol.gain.linearRampToValueAtTime(0, now + duration)
  osc.start(now)
  osc.stop(now + duration + 0.01)
}

function playCoin(ctx) {
  if (!ctx) return
  // Two-tone coin jingle
  playSound(ctx, 'coin', { freq: 988,  duration: 0.08, gain: 0.4, shape: 'square' })
  playSound(ctx, 'coin', { freq: 1319, duration: 0.12, gain: 0.4, shape: 'square', delay: 0.07 })
}

function playBassHit(ctx) {
  if (!ctx) return
  // Deep bass thud
  playSound(ctx, 'bass', { freq: 80, freq2: 40, duration: 0.5, gain: 0.6, shape: 'sine' })
  // High crack
  playSound(ctx, 'crack', { freq: 2200, freq2: 400, duration: 0.15, gain: 0.25, shape: 'sawtooth' })
}

function playLogoSlam(ctx) {
  if (!ctx) return
  // Impact thud
  playSound(ctx, 'thud', { freq: 60, freq2: 30, duration: 0.4, gain: 0.7, shape: 'sine' })
  // Metallic shimmer
  playSound(ctx, 'shimmer', { freq: 3200, freq2: 1600, duration: 0.3, gain: 0.15, shape: 'square', delay: 0.05 })
  // Rising sweep
  playSound(ctx, 'sweep', { freq: 200, freq2: 800, duration: 0.25, gain: 0.2, shape: 'sawtooth', delay: 0.05 })
}

function startAmbient(ctx) {
  if (!ctx) return null
  // Low hum like arcade machines idling
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const vol  = ctx.createGain()
  const now  = ctx.currentTime

  osc1.type = 'sine'; osc1.frequency.value = 60
  osc2.type = 'sine'; osc2.frequency.value = 63  // slight detune for thickness

  osc1.connect(vol); osc2.connect(vol)
  vol.connect(ctx.destination)

  vol.gain.setValueAtTime(0, now)
  vol.gain.linearRampToValueAtTime(0.04, now + 1.5)

  osc1.start(); osc2.start()
  return { osc1, osc2, vol, stop: () => { try { osc1.stop(); osc2.stop() } catch(e){} } }
}

const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  duration: 2.5 + Math.random() * 4,
  delay: Math.random() * 4,
  size: 1 + Math.random() * 2.5,
  opacity: 0.2 + Math.random() * 0.6,
}))

export default function Intro({ onComplete }) {
  const [phase, setPhase] = useState('dark')  // dark -> flicker -> logo -> tagline -> fadeout
  const ctxRef   = useRef(null)
  const ambRef   = useRef(null)
  const timersRef = useRef([])

  const at = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
  }

  const completedRef = useRef(false)
  const done = () => {
    if (completedRef.current) return
    completedRef.current = true
    ambRef.current?.stop()
    onComplete()
  }

  useEffect(() => {
    ctxRef.current = createAudio()
    const ctx = ctxRef.current
    ambRef.current = startAmbient(ctx)

    // Guaranteed completion -- if anything hangs, force complete after 6s
    const safetyTimer = setTimeout(() => done(), 6000)
    timersRef.current.push(safetyTimer)

    // Timeline
    at(() => {
      playCoin(ctx)
      setPhase('flicker')

      at(() => {
        playLogoSlam(ctx)
        setPhase('logo')

        at(() => {
          playBassHit(ctx)
          setPhase('tagline')

          at(() => {
            setPhase('fadeout')
            at(() => done(), 700)
          }, 2200)
        }, 1000)
      }, 350)
    }, 600)

    // Skip on any input -- brief lockout so early clicks don't fire before IPC is ready
    let skipEnabled = false
    const skipLockout = setTimeout(() => { skipEnabled = true }, 800)
    const skip = () => {
      if (!skipEnabled) return
      timersRef.current.forEach(clearTimeout)
      done()
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('click',   skip)

    return () => {
      timersRef.current.forEach(clearTimeout)
      clearTimeout(skipLockout)
      ambRef.current?.stop()
      window.removeEventListener('keydown', skip)
      window.removeEventListener('click',   skip)
    }
  }, [])

  return (
    <div className={styles.stage + ' ' + (phase === 'fadeout' ? styles.fadeOut : '') + ' ' + (phase === 'flicker' ? styles.flicker : '')}>

      {/* Grid background */}
      <div className={styles.grid} />
      <div className={styles.vignette} />
      <div className={styles.scanlines} />

      {/* Particles */}
      {(phase === 'logo' || phase === 'tagline' || phase === 'fadeout') && (
        <div className={styles.particles}>
          {PARTICLES.map(p => (
            <div key={p.id} className={styles.particle} style={{
              left: p.left + '%',
              width: p.size + 'px', height: p.size + 'px',
              animationDuration: p.duration + 's',
              animationDelay: p.delay + 's',
              opacity: p.opacity,
            }} />
          ))}
        </div>
      )}

      {/* Logo */}
      {(phase === 'logo' || phase === 'tagline' || phase === 'fadeout') && (
        <div className={styles.logoWrap}>
          <div className={styles.logoGlow} />
          <div className={styles.logoText}>
            <span className={styles.logoNu}>Nu</span>
            <span className={styles.logoArcade}>Arcade</span>
          </div>
          <div className={styles.logoUnderline} />
          <div className={styles.scanline} />
        </div>
      )}

      {/* Tagline */}
      {(phase === 'tagline' || phase === 'fadeout') && (
        <div className={styles.tagline}>
          Modern arcade. One cabinet. Zero compromises.
        </div>
      )}

      {/* Version */}
      <div className={styles.version}>v3.4.5</div>

      {/* Skip hint */}
      {phase !== 'dark' && phase !== 'fadeout' && (
        <div className={styles.skipHint}>Press any key to skip</div>
      )}
    </div>
  )
}
