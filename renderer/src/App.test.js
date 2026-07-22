// App.test.js -----------------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project. App.jsx
// cannot be imported here (JSX, no DOM/React-hook harness -- see
// VesparaHome.test.js's own limitations note for the same constraint).
//
// These are source-level structural assertions proving the specific
// UI-sound config wiring claims this milestone made about App.jsx: it's
// loaded through the existing getConfig() call (no new IPC), normalized
// with the same helpers used everywhere else, defaults preserve today's
// behavior, and both surfaces get the live values plus Wheel additionally
// gets the setters (for Settings' immediate-update callback pattern,
// mirroring the existing crtEnabled/onCRTChange wiring).

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "App.jsx"), "utf8")

test("UI-sound config state defaults to the normalization module's own defaults, not a locally re-declared value", () => {
  assert.match(jsx, /useState\(DEFAULT_UI_SOUNDS_ENABLED\)/)
  assert.match(jsx, /useState\(DEFAULT_UI_SOUND_VOLUME\)/)
})

test("UI-sound config is loaded through the existing window.nuarcade.getConfig() call -- no new IPC channel introduced", () => {
  const getConfigCalls = jsx.match(/window\.nuarcade\?\.getConfig\?\.\(\)/g) || []
  assert.equal(getConfigCalls.length, 1, "expected exactly one getConfig() call, extended (not duplicated) for UI sounds")
  const effectBlock = jsx.slice(jsx.indexOf("window.nuarcade?.getConfig?.()"), jsx.indexOf("}, [])"))
  assert.match(effectBlock, /setUiSoundsEnabled\(normalizeUiSoundsEnabled\(cfg\.uiSoundsEnabled\)\)/)
  assert.match(effectBlock, /setUiSoundVolume\(normalizeUiSoundVolume\(cfg\.uiSoundVolume\)\)/)
})

test("loaded config values are normalized through the same shared helpers Settings/useArcadeSounds use, not re-implemented inline", () => {
  assert.match(jsx, /import \{\s*DEFAULT_UI_SOUNDS_ENABLED, DEFAULT_UI_SOUND_VOLUME,\s*normalizeUiSoundsEnabled, normalizeUiSoundVolume,\s*\} from "\.\/hooks\/uiSoundConfig\.js"/)
})

test("both Wheel and VesparaHome receive the live uiSoundsEnabled/uiSoundVolume values", () => {
  const wheelBlock = jsx.slice(jsx.indexOf("<Wheel\n"), jsx.indexOf("/>", jsx.indexOf("<Wheel\n")))
  const homeBlock = jsx.slice(jsx.indexOf("<VesparaHome"), jsx.indexOf("/>", jsx.indexOf("<VesparaHome")))
  assert.match(wheelBlock, /uiSoundsEnabled=\{uiSoundsEnabled\}/)
  assert.match(wheelBlock, /uiSoundVolume=\{uiSoundVolume\}/)
  assert.match(homeBlock, /uiSoundsEnabled=\{uiSoundsEnabled\}/)
  assert.match(homeBlock, /uiSoundVolume=\{uiSoundVolume\}/)
})

test("only Wheel (which renders Settings) receives the setters -- Home does not, since it never renders Settings", () => {
  const wheelBlock = jsx.slice(jsx.indexOf("<Wheel\n"), jsx.indexOf("/>", jsx.indexOf("<Wheel\n")))
  const homeBlock = jsx.slice(jsx.indexOf("<VesparaHome"), jsx.indexOf("/>", jsx.indexOf("<VesparaHome")))
  assert.match(wheelBlock, /onUiSoundsChange=\{setUiSoundsEnabled\}/)
  assert.match(wheelBlock, /onUiSoundVolumeChange=\{setUiSoundVolume\}/)
  assert.doesNotMatch(homeBlock, /onUiSoundsChange|onUiSoundVolumeChange/)
})

test("this wiring introduces no new main-process/preload API -- getConfig/setConfig are the only IPC surface touched, and setConfig is untouched here (Settings.jsx owns writes)", () => {
  assert.doesNotMatch(jsx, /window\.nuarcade\.setConfig|window\.nuarcade\?\.setConfig/)
})
