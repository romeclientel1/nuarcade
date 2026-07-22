// useArcadeSounds -- procedural arcade sound effects via Web Audio API
// No audio files needed -- all generated in the browser.
//
// Public contract: `volume` is always the same 0-100 percent Settings
// itself stores and displays (matching ambientVolume/musicVolume) -- NOT
// a 0-1 gain scale. This hook is the single, exact place that value is
// converted, via uiSoundVolumeToGainScale(), into the 0-1 `gainScale`
// uiSoundEngine.js actually multiplies tone gains by. No caller of this
// hook should ever pre-convert -- pass the raw config/prop value straight
// through. Defaults (enabled: true, volume: 100) reproduce today's
// original always-on, unscaled behavior exactly, so existing callers that
// pass nothing (PlayerSelect.jsx) are unaffected. The actual gating/
// scheduling logic lives in uiSoundEngine.js (plain, no React, and
// entirely in gainScale terms -- it never sees the 0-100 representation)
// so it's testable directly against a mocked AudioContext; this hook is a
// thin wrapper supplying the real lazy/resumable context.

import { useRef, useCallback, useEffect } from 'react'
import { normalizeUiSoundsEnabled, uiSoundVolumeToGainScale, DEFAULT_UI_SOUND_VOLUME } from './uiSoundConfig.js'
import { shouldPlay, scheduleTone } from './uiSoundEngine.js'

function createCtx() {
  try { return new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
}

export function useArcadeSounds({ enabled = true, volume = DEFAULT_UI_SOUND_VOLUME } = {}) {
  const ctxRef = useRef(null)
  const isEnabled = normalizeUiSoundsEnabled(enabled)
  // The one conversion point: 0-100 config percent -> 0-1 engine gain scale.
  const gainScale = uiSoundVolumeToGainScale(volume)

  const ctx = () => {
    if (!ctxRef.current) ctxRef.current = createCtx()
    // Resume if suspended (browser requires user gesture)
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume().catch(() => {})
    }
    return ctxRef.current
  }

  // Unlock AudioContext on first user interaction. Re-armed whenever
  // `isEnabled` changes so toggling the setting back on doesn't require a
  // remount -- the listeners themselves are still { once: true } and cost
  // nothing until they actually fire.
  useEffect(() => {
    if (!isEnabled) return
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
  }, [isEnabled])

  const playTone = useCallback((freq, type, duration, gain = 0.15, delay = 0) => {
    // Gate BEFORE touching the AudioContext at all -- disabled or
    // fully-silent (volume 0) must never create/resume a context or any
    // oscillator/gain node, not merely play one at zero gain.
    if (!shouldPlay(isEnabled, gainScale)) return
    const c = ctx()
    if (!c) return
    scheduleTone(c, { freq, type, duration, gain, delay }, gainScale)
  }, [isEnabled, gainScale])

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

  // A restrained, clearly-negative descending tone -- distinct from back()
  // (which is also a small descending pair, but square/brighter) by using
  // a darker sawtooth timbre and a lower register, so an error reads as
  // "something went wrong" rather than "you backed out of a menu".
  const error = useCallback(() => {
    playTone(196, 'sawtooth', 0.12, 0.16)
    playTone(147, 'sawtooth', 0.14, 0.14, 0.08)
  }, [playTone])

  const favorite = useCallback(() => {
    playTone(523, 'sine', 0.1, 0.15)
    playTone(659, 'sine', 0.12, 0.15, 0.08)
  }, [playTone])

  const coin = useCallback(() => {
    playTone(988, 'square', 0.08, 0.2)
    playTone(1319, 'square', 0.12, 0.2, 0.07)
  }, [playTone])

  return { navigate, select, launch, back, error, favorite, coin }
}
