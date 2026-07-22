// uiSoundConfig.test.js -------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project. uiSoundConfig.js
// is plain JS with no React/DOM/Audio import, so it's imported and exercised
// directly here -- the real production normalization helpers, not a
// restated copy.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_UI_SOUNDS_ENABLED,
  DEFAULT_UI_SOUND_VOLUME,
  normalizeUiSoundsEnabled,
  normalizeUiSoundVolume,
  uiSoundVolumeToGainScale,
  normalizeGainScale,
} from "./uiSoundConfig.js"

// -- defaults preserve today's original always-on, unscaled behavior ---------

test("default enabled is true and default volume is 100 (gain scale 1.0) -- preserves current perceived loudness for a player who never touches the setting", () => {
  assert.equal(DEFAULT_UI_SOUNDS_ENABLED, true)
  assert.equal(DEFAULT_UI_SOUND_VOLUME, 100)
  assert.equal(uiSoundVolumeToGainScale(DEFAULT_UI_SOUND_VOLUME), 1)
})

// -- normalizeUiSoundsEnabled: malformed values fall back safely --------------

test("normalizeUiSoundsEnabled accepts real booleans unchanged", () => {
  assert.equal(normalizeUiSoundsEnabled(true), true)
  assert.equal(normalizeUiSoundsEnabled(false), false)
})

test("normalizeUiSoundsEnabled falls back to the default for every non-boolean value", () => {
  const malformed = [undefined, null, "true", "false", 1, 0, {}, [], NaN]
  for (const value of malformed) {
    assert.equal(normalizeUiSoundsEnabled(value), DEFAULT_UI_SOUNDS_ENABLED, "for value: " + String(value))
  }
})

// -- normalizeUiSoundVolume: rejects non-finite, clamps to 0-100 -------------

test("normalizeUiSoundVolume accepts in-range integers unchanged", () => {
  assert.equal(normalizeUiSoundVolume(0), 0)
  assert.equal(normalizeUiSoundVolume(50), 50)
  assert.equal(normalizeUiSoundVolume(100), 100)
})

test("normalizeUiSoundVolume clamps negative and excessive values into [0, 100]", () => {
  assert.equal(normalizeUiSoundVolume(-5), 0)
  assert.equal(normalizeUiSoundVolume(-1000), 0)
  assert.equal(normalizeUiSoundVolume(150), 100)
  assert.equal(normalizeUiSoundVolume(1e9), 100)
})

test("normalizeUiSoundVolume rejects NaN and +/-Infinity, falling back to the default", () => {
  assert.equal(normalizeUiSoundVolume(NaN), DEFAULT_UI_SOUND_VOLUME)
  assert.equal(normalizeUiSoundVolume(Infinity), DEFAULT_UI_SOUND_VOLUME)
  assert.equal(normalizeUiSoundVolume(-Infinity), DEFAULT_UI_SOUND_VOLUME)
})

test("normalizeUiSoundVolume rejects non-numbers, falling back to the default", () => {
  const malformed = [undefined, null, "70", {}, [], true, false]
  for (const value of malformed) {
    assert.equal(normalizeUiSoundVolume(value), DEFAULT_UI_SOUND_VOLUME, "for value: " + String(value))
  }
})

test("normalizeUiSoundVolume rounds fractional values to the nearest integer", () => {
  assert.equal(normalizeUiSoundVolume(49.6), 50)
  assert.equal(normalizeUiSoundVolume(49.4), 49)
})

// -- uiSoundVolumeToGainScale: the single 0-100 -> 0-1 boundary --------------

test("uiSoundVolumeToGainScale converts a 0-100 percent to a 0-1 gain scale at exactly one boundary", () => {
  assert.equal(uiSoundVolumeToGainScale(0), 0)
  assert.equal(uiSoundVolumeToGainScale(50), 0.5)
  assert.equal(uiSoundVolumeToGainScale(100), 1)
})

test("uiSoundVolumeToGainScale normalizes malformed input the same way normalizeUiSoundVolume does before converting", () => {
  assert.equal(uiSoundVolumeToGainScale(-40), 0)
  assert.equal(uiSoundVolumeToGainScale(500), 1)
  assert.equal(uiSoundVolumeToGainScale(NaN), DEFAULT_UI_SOUND_VOLUME / 100)
})

// -- normalizeGainScale: defensive 0-1 normalizer used inside the hook -------

test("normalizeGainScale clamps to [0, 1] and rejects non-finite values", () => {
  assert.equal(normalizeGainScale(0.5), 0.5)
  assert.equal(normalizeGainScale(-1), 0)
  assert.equal(normalizeGainScale(5), 1)
  assert.equal(normalizeGainScale(NaN), 1)
  assert.equal(normalizeGainScale(Infinity), 1)
  assert.equal(normalizeGainScale(undefined), 1)
})

test("normalizeGainScale honors a custom fallback for non-finite input", () => {
  assert.equal(normalizeGainScale(NaN, 0.7), 0.7)
  assert.equal(normalizeGainScale(undefined, 0), 0)
})
