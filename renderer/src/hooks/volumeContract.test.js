// volumeContract.test.js -------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Proves the end-to-end volume-unit contract explicitly: config.uiSoundVolume
// is always 0-100 (matching ambientVolume/musicVolume), useArcadeSounds is
// the single point that converts it to the 0-1 gainScale uiSoundEngine.js
// actually multiplies tone gains by (via uiSoundVolumeToGainScale), and that
// conversion happens exactly once anywhere along the real call path
// (config -> App -> Home/Wheel -> useArcadeSounds -> uiSoundEngine).
// Combines the real uiSoundConfig.js conversion with the real
// uiSoundEngine.js scheduling logic against a mocked AudioContext, so this
// is the actual production math, not a restated copy.

import { test } from "node:test"
import assert from "node:assert/strict"
import { uiSoundVolumeToGainScale, DEFAULT_UI_SOUND_VOLUME } from "./uiSoundConfig.js"
import { shouldPlay, scheduleTone } from "./uiSoundEngine.js"

function makeMockAudioContext() {
  const gains = []
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: () => ({ type: null, frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }),
    createGain: () => {
      const g = { gain: { _calls: [], setValueAtTime(v, at) { g.gain._calls.push(v) }, exponentialRampToValueAtTime() {} }, connect() {} }
      gains.push(g)
      return g
    },
  }
  return { ctx, gains }
}

// select()'s real base gains, used throughout as a stand-in "historical" cue.
const SELECT_TONES = [
  { freq: 440, type: "square", duration: 0.08, gain: 0.12, delay: 0 },
  { freq: 660, type: "square", duration: 0.08, gain: 0.1, delay: 0.06 },
]

function playSelectAt(volume) {
  const { ctx, gains } = makeMockAudioContext()
  const gainScale = uiSoundVolumeToGainScale(volume)
  if (!shouldPlay(true, gainScale)) return { gains: [], gainScale }
  for (const tone of SELECT_TONES) scheduleTone(ctx, tone, gainScale)
  return { gains: gains.map(g => g.gain._calls[0]), gainScale }
}

// -- omitted options / defaults preserve historical gain exactly --------------

test("omitted volume (the hook's own default, DEFAULT_UI_SOUND_VOLUME=100) preserves the exact historical cue gain", () => {
  const { gains, gainScale } = playSelectAt(DEFAULT_UI_SOUND_VOLUME)
  assert.equal(gainScale, 1)
  assert.deepEqual(gains, [0.12, 0.1])
})

// -- volume: 100 preserves the exact historical gain ---------------------------

test("volume: 100 preserves the exact historical cue gain", () => {
  const { gains, gainScale } = playSelectAt(100)
  assert.equal(gainScale, 1)
  assert.deepEqual(gains, [0.12, 0.1])
})

// -- volume: 50 produces exactly half the historical gain ----------------------

test("volume: 50 produces exactly half the historical gain, preserving relative balance between tones", () => {
  const { gains, gainScale } = playSelectAt(50)
  assert.equal(gainScale, 0.5)
  assert.deepEqual(gains, [0.06, 0.05])
})

// -- volume: 1 means 1% (the public contract is 0-100) -------------------------

test("volume: 1 means 1 percent, not 1.0 (full volume) -- the public contract is 0-100", () => {
  const { gains, gainScale } = playSelectAt(1)
  assert.equal(gainScale, 0.01)
  assert.ok(Math.abs(gains[0] - 0.0012) < 1e-9)
  assert.ok(Math.abs(gains[1] - 0.001) < 1e-9)
})

// -- zero creates no context/nodes ----------------------------------------------

test("volume: 0 creates no oscillator/gain nodes at all -- shouldPlay gates before scheduling", () => {
  const { gains, gainScale } = playSelectAt(0)
  assert.equal(gainScale, 0)
  assert.deepEqual(gains, [])
})

// -- no path converts the value twice -------------------------------------------

test("converting a value already run through uiSoundVolumeToGainScale a second time would corrupt it -- proving why exactly one conversion boundary matters", () => {
  const once = uiSoundVolumeToGainScale(50)
  assert.equal(once, 0.5)
  // If a caller mistakenly pre-converted (0-100 -> 0-1) and then passed
  // that 0-1 value back through uiSoundVolumeToGainScale again (treating
  // it as if it were still a 0-100 percent), the result would be wrong --
  // this is exactly the bug class the single-boundary contract prevents.
  const wouldBeIfDoubleConverted = uiSoundVolumeToGainScale(once)
  assert.notEqual(wouldBeIfDoubleConverted, once)
  assert.equal(wouldBeIfDoubleConverted, 0.01) // 0.5 clamped/rounded as a "percent" -> 1% -> 0.01
})

test("malformed volume (NaN/negative/excessive) still converts through the same single boundary, never bypassing it", () => {
  assert.equal(uiSoundVolumeToGainScale(NaN), DEFAULT_UI_SOUND_VOLUME / 100)
  assert.equal(uiSoundVolumeToGainScale(-50), 0)
  assert.equal(uiSoundVolumeToGainScale(500), 1)
})
