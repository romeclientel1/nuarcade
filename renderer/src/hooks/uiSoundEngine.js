// uiSoundEngine.js -- plain, framework-free core of the UI tone player. No
// React/DOM import, so it's directly importable and testable under native
// `node --test` against a mocked AudioContext-like object, and reused
// identically by the real useArcadeSounds hook (which supplies the real
// lazy/resumable AudioContext getter). Mirrors the existing pattern of
// factoring real logic out of a hook into plain functions (see
// useGameLauncher.js / launchSession/*.js).
//
// Everything in this module operates purely in `gainScale` (0-1) terms --
// it never sees the 0-100 config-percent representation at all. The one
// and only 0-100 -> 0-1 conversion happens in useArcadeSounds.js, via
// uiSoundConfig.js's uiSoundVolumeToGainScale().
import { normalizeGainScale } from "./uiSoundConfig.js"

// Whether a cue should play at all. Deliberately checked BEFORE any
// AudioContext is created or resumed -- a disabled or fully-silent
// (gainScale 0) player must never trigger context creation, resume, or
// oscillator/gain node creation.
export function shouldPlay(enabled, gainScale) {
  return enabled === true && normalizeGainScale(gainScale) > 0
}

// Schedules one short, self-disposing tone against an already-resolved
// AudioContext-like object (a real AudioContext in the browser, or a
// plain test double exposing createOscillator/createGain/currentTime/
// destination). Gain is scaled by gainScale (already-normalized 0-1) --
// multiplying the tone's own base gain, so multiple tones within one cue
// (e.g. select()'s two notes) keep their relative balance regardless of
// the overall volume setting. Fire-and-forget, no return value, matches
// the existing oscillator .start()/.stop() self-cleanup -- no queue, no
// timers, nothing retained past this call.
export function scheduleTone(ctx, { freq, type, duration, gain, delay = 0 }, gainScale) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.connect(g)
  g.connect(ctx.destination)
  o.type = type
  o.frequency.setValueAtTime(freq, ctx.currentTime + delay)
  g.gain.setValueAtTime(gain * gainScale, ctx.currentTime + delay)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
  o.start(ctx.currentTime + delay)
  o.stop(ctx.currentTime + delay + duration)
}
