// uiSoundEngine.test.js -------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project. uiSoundEngine.js
// is plain JS with no React import, so it's imported and exercised directly
// against a mocked AudioContext-like object here -- the real production
// gating/scheduling logic useArcadeSounds itself calls, not a restated copy.
// This also proves the engine runs fine in a Node test environment with no
// window/AudioContext/browser API at all -- shouldPlay and scheduleTone take
// their audio objects as plain arguments, never reach for a global.

import { test } from "node:test"
import assert from "node:assert/strict"
import { shouldPlay, scheduleTone } from "./uiSoundEngine.js"

function makeMockAudioContext() {
  const oscillators = []
  const gains = []
  const ctx = {
    currentTime: 0,
    destination: { __isDestination: true },
    createOscillator() {
      const osc = {
        type: null,
        frequency: { setValueAtTime: (freq, at) => { osc._freqCalls.push([freq, at]) } },
        _freqCalls: [],
        connectedTo: null,
        started: null,
        stopped: null,
        connect(target) { osc.connectedTo = target },
        start(at) { osc.started = at },
        stop(at) { osc.stopped = at },
      }
      oscillators.push(osc)
      return osc
    },
    createGain() {
      const gainParam = { _calls: [], setValueAtTime(v, at) { gainParam._calls.push(["set", v, at]) }, exponentialRampToValueAtTime(v, at) { gainParam._calls.push(["ramp", v, at]) } }
      const g = { gain: gainParam, connectedTo: null, connect(target) { g.connectedTo = target } }
      gains.push(g)
      return g
    },
  }
  return { ctx, oscillators, gains }
}

// -- shouldPlay: the gate that decides whether a context is ever touched -----

test("shouldPlay is true only when enabled is literally true and volume normalizes above zero", () => {
  assert.equal(shouldPlay(true, 1), true)
  assert.equal(shouldPlay(true, 0.01), true)
})

test("shouldPlay is false when disabled, regardless of volume", () => {
  assert.equal(shouldPlay(false, 1), false)
  assert.equal(shouldPlay(false, 0.5), false)
})

test("shouldPlay is false when volume is exactly zero", () => {
  assert.equal(shouldPlay(true, 0), false)
})

test("shouldPlay is false when volume normalizes to zero or below (negative/non-finite treated safely)", () => {
  assert.equal(shouldPlay(true, -1), false)
  // NaN normalizes to the engine's default gain scale (1) via
  // normalizeGainScale, so it does NOT fall through to false here --
  // malformed volume falls back to audible, not silent, matching "malformed
  // stored values must safely fall back" (to the default, not to muted).
  assert.equal(shouldPlay(true, NaN), true)
})

test("shouldPlay treats any non-`true` enabled value as disabled (only a real true opts in)", () => {
  assert.equal(shouldPlay(undefined, 1), false)
  assert.equal(shouldPlay(1, 1), false)
  assert.equal(shouldPlay("true", 1), false)
})

// -- scheduleTone: only ever called after shouldPlay -- verify node creation -

test("scheduleTone creates exactly one oscillator and one gain node per call, connected in sequence", () => {
  const { ctx, oscillators, gains } = makeMockAudioContext()
  scheduleTone(ctx, { freq: 440, type: "square", duration: 0.08, gain: 0.12, delay: 0 }, 1)
  assert.equal(oscillators.length, 1)
  assert.equal(gains.length, 1)
  assert.equal(oscillators[0].connectedTo, gains[0])
  assert.equal(gains[0].connectedTo, ctx.destination)
})

test("scheduleTone starts and stops the oscillator -- short, self-disposing, no retained handle", () => {
  const { ctx, oscillators } = makeMockAudioContext()
  scheduleTone(ctx, { freq: 220, type: "square", duration: 0.06, gain: 0.08, delay: 0 }, 1)
  assert.equal(oscillators[0].started, 0)
  assert.ok(oscillators[0].stopped > oscillators[0].started)
})

test("scheduleTone scales the base gain by gainScale -- volume 1 preserves the original value exactly", () => {
  const { ctx, gains } = makeMockAudioContext()
  scheduleTone(ctx, { freq: 440, type: "square", duration: 0.08, gain: 0.12, delay: 0 }, 1)
  const setCall = gains[0].gain._calls.find(c => c[0] === "set")
  assert.equal(setCall[1], 0.12)
})

test("scheduleTone at half volume scales gain proportionally", () => {
  const { ctx, gains } = makeMockAudioContext()
  scheduleTone(ctx, { freq: 440, type: "square", duration: 0.08, gain: 0.12, delay: 0 }, 0.5)
  const setCall = gains[0].gain._calls.find(c => c[0] === "set")
  assert.equal(setCall[1], 0.06)
})

test("volume scaling preserves the relative balance between multiple tones in one cue (e.g. select()'s two notes)", () => {
  const { ctx, gains } = makeMockAudioContext()
  // select()'s real base gains: 0.12 and 0.1
  scheduleTone(ctx, { freq: 440, type: "square", duration: 0.08, gain: 0.12, delay: 0 }, 0.5)
  scheduleTone(ctx, { freq: 660, type: "square", duration: 0.08, gain: 0.1, delay: 0.06 }, 0.5)
  const gain1 = gains[0].gain._calls.find(c => c[0] === "set")[1]
  const gain2 = gains[1].gain._calls.find(c => c[0] === "set")[1]
  // Original ratio 0.12 / 0.1 = 1.2, must survive scaling unchanged.
  assert.ok(Math.abs((gain1 / gain2) - (0.12 / 0.1)) < 1e-9)
})

test("scheduleTone honors the delay offset for both frequency and gain scheduling, and stop is scheduled after delay+duration", () => {
  const { ctx, oscillators, gains } = makeMockAudioContext()
  ctx.currentTime = 10
  scheduleTone(ctx, { freq: 660, type: "square", duration: 0.15, gain: 0.2, delay: 0.16 }, 1)
  assert.equal(oscillators[0]._freqCalls[0][1], 10.16)
  assert.equal(oscillators[0].started, 10.16)
  assert.ok(Math.abs(oscillators[0].stopped - 10.31) < 1e-9)
  const setCall = gains[0].gain._calls.find(c => c[0] === "set")
  assert.equal(setCall[2], 10.16)
})

// -- disabled/zero-volume gating means scheduleTone is simply never called --

test("the shouldPlay gate is what a caller checks before ever invoking scheduleTone -- disabled or silent produces zero node creation by construction", () => {
  const { ctx, oscillators, gains } = makeMockAudioContext()
  // Mirrors useArcadeSounds' playTone: `if (!shouldPlay(...)) return` before
  // any ctx()/scheduleTone call.
  function playIfAllowed(enabled, volume) {
    if (!shouldPlay(enabled, volume)) return
    scheduleTone(ctx, { freq: 220, type: "square", duration: 0.06, gain: 0.08, delay: 0 }, volume)
  }
  playIfAllowed(false, 1)
  playIfAllowed(true, 0)
  assert.equal(oscillators.length, 0)
  assert.equal(gains.length, 0)
})
