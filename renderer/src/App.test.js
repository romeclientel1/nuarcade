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
// Normalized to LF: on the windows-latest CI runner, git checks this file
// out as CRLF, which would silently break any indexOf/slice anchor further
// down that (incorrectly) embedded a literal "\n".
const jsx = readFileSync(join(HERE, "App.jsx"), "utf8").replace(/\r\n/g, "\n")

// Extracts the substring between two anchors, throwing a descriptive error
// instead of silently returning "" when an anchor is missing -- a missing
// anchor is a broken test, not an empty (and therefore vacuously
// assert.doesNotMatch-passing) block.
function sliceBetween(src, startAnchor, endAnchor, label) {
  const start = src.indexOf(startAnchor)
  if (start === -1) throw new Error(`sliceBetween(${label}): start anchor not found: ${JSON.stringify(startAnchor)}`)
  const end = src.indexOf(endAnchor, start)
  if (end === -1) throw new Error(`sliceBetween(${label}): end anchor not found: ${JSON.stringify(endAnchor)}`)
  return src.slice(start, end)
}

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
  const wheelBlock = sliceBetween(jsx, "<Wheel", "/>", "<Wheel ... /> render block")
  const homeBlock = sliceBetween(jsx, "<VesparaHome", "/>", "<VesparaHome ... /> render block")
  // Each block must not contain the other component's tag -- proves the
  // anchors can't have accidentally spanned into the wrong component.
  assert.doesNotMatch(wheelBlock, /<VesparaHome/)
  assert.doesNotMatch(homeBlock, /<Wheel\b/)
  assert.match(wheelBlock, /uiSoundsEnabled=\{uiSoundsEnabled\}/)
  assert.match(wheelBlock, /uiSoundVolume=\{uiSoundVolume\}/)
  assert.match(homeBlock, /uiSoundsEnabled=\{uiSoundsEnabled\}/)
  assert.match(homeBlock, /uiSoundVolume=\{uiSoundVolume\}/)
})

test("only Wheel (which renders Settings) receives the setters -- Home does not, since it never renders Settings", () => {
  const wheelBlock = sliceBetween(jsx, "<Wheel", "/>", "<Wheel ... /> render block")
  const homeBlock = sliceBetween(jsx, "<VesparaHome", "/>", "<VesparaHome ... /> render block")
  assert.match(wheelBlock, /onUiSoundsChange=\{setUiSoundsEnabled\}/)
  assert.match(wheelBlock, /onUiSoundVolumeChange=\{setUiSoundVolume\}/)
  assert.doesNotMatch(homeBlock, /onUiSoundsChange|onUiSoundVolumeChange/)
})

test("sliceBetween fails loudly (not with a silent empty string) when an anchor is missing", () => {
  assert.throws(
    () => sliceBetween(jsx, "<TotallyMissingTag", "/>", "bogus start anchor"),
    /start anchor not found/
  )
  assert.throws(
    () => sliceBetween(jsx, "<Wheel", "TOTALLY_MISSING_END", "bogus end anchor"),
    /end anchor not found/
  )
})

test("this wiring introduces no new main-process/preload API -- getConfig/setConfig are the only IPC surface touched, and setConfig is untouched here (Settings.jsx owns writes)", () => {
  assert.doesNotMatch(jsx, /window\.nuarcade\.setConfig|window\.nuarcade\?\.setConfig/)
})
