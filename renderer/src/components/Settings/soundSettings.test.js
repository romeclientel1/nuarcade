// soundSettings.test.js --------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project. Settings.jsx
// cannot be imported here (JSX, no DOM/React-hook harness -- see
// VesparaHome.test.js's own limitations note for the same constraint).
//
// Source-level structural assertions proving the specific claims made
// about the new "UI sounds" Settings controls: displayed values are always
// routed through the shared normalizeUiSoundsEnabled/normalizeUiSoundVolume
// helpers (so a malformed persisted value can never reach the toggle/
// slider unclamped), writes go through the existing update()/config
// pattern (same as ambientVolume/crtEffect), and the immediate-update
// callback (onUiSoundsChange/onUiSoundVolumeChange) fires exactly like the
// existing crtEffect -> onCRTChange wiring. Real clamping/normalization
// behavior itself is covered directly (with real numbers) in
// uiSoundConfig.test.js -- this file only proves Settings.jsx actually
// calls through to that shared logic rather than re-implementing it.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Settings.jsx"), "utf8")

test("Settings imports the shared normalization helpers rather than re-implementing clamping inline", () => {
  assert.match(jsx, /import \{ normalizeUiSoundsEnabled, normalizeUiSoundVolume \} from "\.\.\/\.\.\/hooks\/uiSoundConfig\.js"/)
})

test("the UI sounds toggle's displayed On/Off state is always routed through normalizeUiSoundsEnabled, never the raw config value", () => {
  const block = jsx.slice(jsx.indexOf('t("settings.uiSounds")'), jsx.indexOf('t("settings.uiSoundVolume")'))
  assert.match(block, /normalizeUiSoundsEnabled\(config\.uiSoundsEnabled\)/)
  assert.doesNotMatch(block, /config\.uiSoundsEnabled\s*===/, "must not compare the raw unnormalized value directly")
})

test("the UI sound volume slider's value/label are always routed through normalizeUiSoundVolume, never the raw config value", () => {
  const block = jsx.slice(jsx.indexOf('t("settings.uiSoundVolume")'), jsx.indexOf('t("settings.uiSoundVolume")') + 700)
  const normalizedCalls = block.match(/normalizeUiSoundVolume\(config\.uiSoundVolume\)/g) || []
  assert.ok(normalizedCalls.length >= 2, "expected the slider's value and its displayed percent label to both be normalized")
})

test("writes go through the existing update()/config pattern -- same shape as ambientVolume/crtEffect, not a separate storage mechanism", () => {
  assert.match(jsx, /update\("uiSoundsEnabled", m === "on"\)/)
  assert.match(jsx, /update\("uiSoundVolume", parseInt\(e\.target\.value\)\)/)
})

test("update() propagates uiSoundsEnabled/uiSoundVolume changes immediately via callback props, mirroring the existing crtEffect -> onCRTChange wiring", () => {
  const updateFn = jsx.slice(jsx.indexOf("const update = (key, val) => {"), jsx.indexOf("if (RESTART_KEYS.has(key))"))
  assert.match(updateFn, /if \(key === "crtEffect"\) onCRTChange\?\.\(val\)/)
  assert.match(updateFn, /if \(key === "uiSoundsEnabled"\) onUiSoundsChange\?\.\(val\)/)
  assert.match(updateFn, /if \(key === "uiSoundVolume"\) onUiSoundVolumeChange\?\.\(val\)/)
})

test("uiSoundsEnabled/uiSoundVolume are not added to RESTART_KEYS -- they apply immediately, no restart required", () => {
  const restartKeysBlock = jsx.slice(jsx.indexOf("const RESTART_KEYS"), jsx.indexOf("])"))
  assert.doesNotMatch(restartKeysBlock, /uiSoundsEnabled|uiSoundVolume/)
})

test("the volume slider is clamped to the 0-100 range at the DOM level too (min/max attributes), not just in JS", () => {
  const block = jsx.slice(jsx.indexOf('t("settings.uiSoundVolume")'), jsx.indexOf('t("settings.uiSoundVolume")') + 700)
  assert.match(block, /min="0"/)
  assert.match(block, /max="100"/)
})

test("Settings receives the new props in its function signature", () => {
  assert.match(jsx, /export default function Settings\(\{[^}]*uiSoundsEnabled, onUiSoundsChange, uiSoundVolume, onUiSoundVolumeChange[^}]*\}\)/)
})
