// useArcadeSounds -- procedural arcade sound effects via Web Audio API
// No audio files needed -- all generated in the browser

import { useRef, useCallback, useEffect } from 'react'

function createCtx() {
  try { return new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
}

export function useArcadeSounds() {
  const ctxRef = useRef(null)

  const ctx = () => {
    if (!ctxRef.current) ctxRef.current = createCtx()
    // Resume if suspended (browser requires user gesture)
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume().catch(() => {})
    }
    return ctxRef.current
  }

  // Unlock AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (!ctxRef.current) ctxRef.current = createCtx()
      if (ctxRef.current?.state === 'suspended') {
        ctxRef.current.resume().catch(() => {})
      }
    }
    window.addEventListener('click',    unlock, { once: true })
    window.addEventListener('keydown',  unlock, { once: true })
    window.addEventListener('gamepadconnected', unlock, { once: true })
    return () => {
      window.removeEventListener('click',   unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const playTone = useCallback((freq, type, duration, gain = 0.15, delay = 0) => {
    const c = ctx()
    if (!c) return
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g)
    g.connect(c.destination)
    o.type = type
    o.frequency.setValueAtTime(freq, c.currentTime + delay)
    g.gain.setValueAtTime(gain, c.currentTime + delay)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
    o.start(c.currentTime + delay)
    o.stop(c.currentTime + delay + duration)
  }, [])

  const navigate = useCallback(() => {
    playTone(220, 'square', 0.06, 0.08)
  }, [playTone])

  const select = useCallback(() => {
    playTone(440, 'square', 0.08, 0.12)
    playTone(660, 'square', 0.08, 0.1, 0.06)
  }, [playTone])

  const launch = useCallback(() => {
    playTone(330, 'sawtooth', 0.1, 0.15)
    playTone(440, 'sawtooth', 0.1, 0.15, 0.08)
    playTone(660, 'square', 0.15, 0.2, 0.16)
  }, [playTone])

  const back = useCallback(() => {
    playTone(220, 'square', 0.08, 0.1)
    playTone(165, 'square', 0.08, 0.08, 0.07)
  }, [playTone])

  const favorite = useCallback(() => {
    playTone(523, 'sine', 0.1, 0.15)
    playTone(659, 'sine', 0.12, 0.15, 0.08)
  }, [playTone])

  const coin = useCallback(() => {
    playTone(988, 'square', 0.08, 0.2)
    playTone(1319, 'square', 0.12, 0.2, 0.07)
  }, [playTone])

  return { navigate, select, launch, back, favorite, coin }
}
