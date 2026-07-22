// useArcadeSounds.test.js -----------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// useArcadeSounds.js itself cannot be invoked here: it's a React hook
// (useRef/useCallback/useEffect) and this project has no DOM/React-hook
// test harness (no jsdom, no @testing-library/react -- see
// useGameLauncher.test.js for the same limitation applied to hooks). Its
// actual gating/scaling logic is factored out into uiSoundEngine.js/
// uiSoundConfig.js (plain, no React), which get real behavioral tests in
// their own *.test.js files. This file instead does source-level
// structural checks on the specific, narrow claims this milestone made
// about useArcadeSounds.js's own shape: the bounded cue vocabulary,
// no per-render object churn beyond what React itself already handles via
// useCallback, and no new dependency/network audio source.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(HERE, "useArcadeSounds.js"), "utf8")
const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../package.json"), "utf8"))

test("the returned cue set is exactly the approved vocabulary plus the two explicitly-preserved legacy cues -- nothing else", () => {
  const returnMatch = src.match(/return \{ ([^}]+) \}/)
  assert.ok(returnMatch, "expected a single object-literal return statement")
  const returned = returnMatch[1].split(",").map(s => s.trim())
  assert.deepEqual(returned.sort(), ["back", "error", "favorite", "coin", "launch", "navigate", "select"].sort())
})

test("select() was not renamed to confirm() -- existing consumers (PlayerSelect, Wheel, useGameLauncher) are untouched by a naming change", () => {
  assert.match(src, /const select = useCallback/)
  assert.doesNotMatch(src, /const confirm = useCallback/)
})

test("favorite() and coin() cue bodies are byte-identical to before this milestone -- not refactored", () => {
  assert.match(src, /const favorite = useCallback\(\(\) => \{\s*playTone\(523, 'sine', 0\.1, 0\.15\)\s*playTone\(659, 'sine', 0\.12, 0\.15, 0\.08\)\s*\}, \[playTone\]\)/)
  assert.match(src, /const coin = useCallback\(\(\) => \{\s*playTone\(988, 'square', 0\.08, 0\.2\)\s*playTone\(1319, 'square', 0\.12, 0\.2, 0\.07\)\s*\}, \[playTone\]\)/)
})

test("useArcadeSounds's public volume contract is 0-100 (matching the config percent Settings stores), not a 0-1 gain scale", () => {
  assert.match(src, /export function useArcadeSounds\(\{ enabled = true, volume = DEFAULT_UI_SOUND_VOLUME \} = \{\}\)/)
  assert.doesNotMatch(src, /volume = 1 \}/, "volume must not default to a bare 1 -- that would silently imply a 0-1 contract")
})

test("useArcadeSounds performs the 0-100 -> 0-1 conversion exactly once, via uiSoundVolumeToGainScale -- never a second/duplicate conversion", () => {
  const bodySrc = src.slice(src.indexOf("export function useArcadeSounds"))
  const conversionCalls = bodySrc.match(/uiSoundVolumeToGainScale\(/g) || []
  assert.equal(conversionCalls.length, 1, "expected exactly one call to the conversion boundary (the import line is excluded)")
  assert.match(bodySrc, /const gainScale = uiSoundVolumeToGainScale\(volume\)/)
})

test("uiSoundEngine.js operates purely in gainScale (0-1) terms -- shouldPlay's parameter is named gainScale, not volume", () => {
  const engineSrc = readFileSync(join(HERE, "uiSoundEngine.js"), "utf8")
  assert.match(engineSrc, /export function shouldPlay\(enabled, gainScale\)/)
})

test("playTone gates on shouldPlay before calling ctx() -- an AudioContext is never created/resumed when disabled or silent", () => {
  const playToneBody = src.slice(src.indexOf("const playTone"), src.indexOf("const navigate"))
  const shouldPlayLine = playToneBody.indexOf("shouldPlay")
  const ctxCallLine = playToneBody.indexOf("ctx()")
  assert.ok(shouldPlayLine >= 0 && ctxCallLine >= 0 && shouldPlayLine < ctxCallLine, "shouldPlay must be checked before ctx() is called")
})

test("playTone is memoized via useCallback (not recreated as a new function/object on every render beyond React's own hook identity rules)", () => {
  assert.match(src, /const playTone = useCallback\(/)
})

test("no per-cue AudioContext or node is created outside a play call -- context creation only happens lazily inside ctx()/the unlock effect", () => {
  const outsideFunctions = src.split(/const \w+ = useCallback/)[0]
  assert.doesNotMatch(outsideFunctions, /createOscillator|createGain/)
})

test("rejected play()/resume() promises are handled without throwing or logging noise (.catch(() => {}))", () => {
  const resumeCalls = src.match(/\.resume\(\)/g) || []
  assert.ok(resumeCalls.length > 0)
  for (const _ of resumeCalls) {
    assert.match(src, /\.resume\(\)\.catch\(\(\) => \{\}\)/)
  }
})

test("AudioContext creation itself is wrapped in try/catch -- safe when the browser/Electron audio API is unavailable", () => {
  assert.match(src, /function createCtx\(\) \{\s*try \{ return new \(window\.AudioContext \|\| window\.webkitAudioContext\)\(\) \} catch \{ return null \}\s*\}/)
})

test("no network audio source -- no fetch/XHR/remote URL anywhere in the UI sound engine", () => {
  const engineSrc = readFileSync(join(HERE, "uiSoundEngine.js"), "utf8")
  const configSrc = readFileSync(join(HERE, "uiSoundConfig.js"), "utf8")
  for (const text of [src, engineSrc, configSrc]) {
    assert.doesNotMatch(text, /fetch\(|XMLHttpRequest|https?:\/\//)
  }
})

test("no HTML Audio element and no new Audio() construction -- procedural Web Audio only", () => {
  assert.doesNotMatch(src, /new Audio\(/)
  assert.doesNotMatch(src, /document\.createElement\(['"]audio['"]\)/)
})

test("no third-party audio library dependency was added to renderer/package.json", () => {
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const before = ["@fontsource/orbitron", "howler", "react", "react-dom"]
  assert.deepEqual(Object.keys(rendererPkg.dependencies).sort(), before.sort())
  const knownAudioLibs = ["tone", "howler2", "pizzicato", "soundjs", "wavesurfer.js"]
  for (const lib of knownAudioLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})

test("useNavSound.js (the unused/duplicate sound implementation) is left untouched -- deferred cleanup, not removed or altered", () => {
  const navSoundSrc = readFileSync(join(HERE, "useNavSound.js"), "utf8")
  assert.match(navSoundSrc, /export function useNavSound\(volume = 0\.3\)/)
  assert.match(navSoundSrc, /playClick/)
  assert.match(navSoundSrc, /playSelect/)
})
