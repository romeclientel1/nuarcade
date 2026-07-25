// soundPolish.test.js ---------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx cannot be imported here: it's JSX (see Wheel.test.js's own
// limitations note). These are source-level structural assertions on the
// real committed file proving the specific sound-wiring claims this
// milestone made about Wheel's Exit/RetroArch dialogs: left/right only
// sound on an actual choice change, confirm produces exactly one cue per
// branch (and the RetroArch launch-commit branch never plays select()
// before launch()), back produces exactly one cue, the launch-error sound
// is deduplicated via a plain ref, and the existing accepted-launch/coin-
// on-mount paths are untouched. Combined with the real behavioral tests in
// uiSoundEngine.test.js/uiSoundConfig.test.js, this is proof at the actual
// call sites, not a restated copy of the source.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8")

// -- sound hook wiring, config normalization -----------------------------------

test("useArcadeSounds is wired with the raw ui-sound config props, never pre-converted -- useArcadeSounds itself is the single normalization/conversion boundary", () => {
  assert.match(jsx, /const sounds = useArcadeSounds\(\{ enabled: uiSoundsEnabled, volume: uiSoundVolume \}\)/)
  assert.doesNotMatch(jsx, /uiSoundVolumeToGainScale|normalizeUiSoundsEnabled/, "Wheel must not duplicate the conversion useArcadeSounds already performs")
})

test("the new uiSoundsEnabled/onUiSoundsChange/uiSoundVolume/onUiSoundVolumeChange props are threaded into Settings, mirroring the existing crtEnabled/onCRTChange pattern", () => {
  const settingsLine = jsx.split("\n").find(l => l.includes("<Settings "))
  assert.ok(settingsLine, "expected a <Settings ...> render line")
  for (const attr of ["uiSoundsEnabled={uiSoundsEnabled}", "onUiSoundsChange={onUiSoundsChange}", "uiSoundVolume={uiSoundVolume}", "onUiSoundVolumeChange={onUiSoundVolumeChange}"]) {
    assert.ok(settingsLine.includes(attr), "missing " + attr)
  }
})

// -- accepted launch: retains its existing single sound path -------------------

test("Wheel's launch cue still comes exclusively from playLaunchSound: sounds.launch wired into useGameLauncher (unchanged this milestone)", () => {
  assert.match(jsx, /playLaunchSound:\s*sounds\.launch,/)
})

test("launchGame() itself still does not call any sound function directly -- the launch cue is owned entirely by useGameLauncher's dispatch-acceptance gate", () => {
  const fn = jsx.slice(jsx.indexOf("const launchGame = () => {"), jsx.indexOf("// Clear any stale auto-launch state"))
  assert.doesNotMatch(fn, /sounds\./)
})

// -- Exit/RetroArch dialogs: left/right only sound on an actual choice change -

test("RetroArch dialog Left/Right only sound when the choice actually changes (gamepad left)", () => {
  const left = jsx.slice(jsx.indexOf("left: () => {"), jsx.indexOf("right: () => {"))
  assert.match(left, /if \(retroArchChoiceRef\.current !== 0\) \{ sounds\.navigate\(\); setRetroArchChoice\(0\) \}/)
})

test("RetroArch dialog Left/Right only sound when the choice actually changes (gamepad right)", () => {
  const right = jsx.slice(jsx.indexOf("right: () => {"), jsx.indexOf("up: () => {"))
  assert.match(right, /if \(retroArchChoiceRef\.current !== 1\) \{ sounds\.navigate\(\); setRetroArchChoice\(1\) \}/)
})

// -- confirm: exactly one cue per branch, RetroArch launch-commit never double-sounds

test("RetroArch dialog confirm: choosing Yes plays launch() only (never select() first) since it commits an external-app launch", () => {
  const block = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("settings: () => {"))
  const retroArchBlock = block.slice(block.indexOf("showRetroArchPopupRef.current) {"), block.indexOf("if (consoleOpenRef.current"))
  assert.match(retroArchBlock, /if \(retroArchChoiceRef\.current === 0\) \{ sounds\.launch\(\); window\.nuarcade\?\.launchRetroArch\?\.\(\) \}/)
  assert.doesNotMatch(retroArchBlock, /sounds\.select\(\)/)
})

test("RetroArch dialog confirm: choosing No plays back() only", () => {
  const block = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("settings: () => {"))
  const retroArchBlock = block.slice(block.indexOf("showRetroArchPopupRef.current) {"), block.indexOf("if (consoleOpenRef.current"))
  assert.match(retroArchBlock, /else \{ sounds\.back\(\) \}/)
})

test("Depart confirm and cancel each play exactly one cue", () => {
  const accept = jsx.slice(jsx.indexOf("const acceptDepart"), jsx.indexOf("const declineDepart"))
  const decline = jsx.slice(jsx.indexOf("const declineDepart"), jsx.indexOf("// Background music"))
  assert.match(accept, /sounds\.select\(\)/)
  assert.doesNotMatch(accept, /sounds\.back/)
  assert.match(decline, /sounds\.back\(\)/)
  assert.doesNotMatch(decline, /sounds\.select/)
})

// -- back (B button): exactly one cue per dialog -------------------------------

test("RetroArch dialog back (B button) plays exactly one back() cue", () => {
  const block = jsx.slice(jsx.indexOf("back: () => {"), jsx.indexOf("if (showDetailRef.current)"))
  assert.match(block, /if \(showRetroArchPopupRef\.current\) \{ sounds\.back\(\); setShowRetroArchPopup\(false\); setRetroArchChoice\(1\); return \}/)
})

// -- mouse click handlers on the dialog buttons mirror the same rules ---------

test("RetroArch dialog mouse click handlers use launch() for Yes and back() for No, matching the gamepad path", () => {
  assert.match(jsx, /onClick=\{\(\) => \{ sounds\.launch\(\); window\.nuarcade\?\.launchRetroArch\?\.\(\); setShowRetroArchPopup\(false\); setRetroArchChoice\(1\) \}\}/)
  assert.match(jsx, /onClick=\{\(\) => \{ sounds\.back\(\); setShowRetroArchPopup\(false\); setRetroArchChoice\(1\) \}\}/)
})

test("Depart dialog delegates mouse/controller commits to one-cue shared callbacks", () => {
  assert.match(jsx, /const acceptDepart = useCallback\(\(\) => \{\s*sounds\.select\(\)\s*window\.nuarcade\?\.quit\?\.\(\)/)
  assert.match(jsx, /const declineDepart = useCallback\(\(\) => \{\s*sounds\.back\(\)\s*cancelDepart\(\)/)
  assert.match(jsx, /onConfirm=\{acceptDepart\}/)
  assert.match(jsx, /onCancel=\{declineDepart\}/)
})

// -- launch-error sound: deduplicated via seq (locale-safe), surface-scoped ---

test("Wheel's launch-error sound effect uses a plain ref (not new React state) and introduces no timer", () => {
  const effect = jsx.slice(jsx.indexOf("const lastPlayedLaunchErrorSeqRef"), jsx.indexOf("const launchGame = () => {"))
  assert.match(effect, /useRef\(null\)/)
  assert.doesNotMatch(effect, /useState/)
  assert.doesNotMatch(effect, /setTimeout|setInterval/)
})

test("Wheel's launch-error sound decision is delegated to the shared, locale-safe shouldPlayLaunchErrorCue helper -- not an inline string comparison", () => {
  assert.match(jsx, /import \{ shouldPlayLaunchErrorCue \} from "\.\.\/\.\.\/hooks\/launchErrorSoundGuard\.js"/)
  const effect = jsx.slice(jsx.indexOf("const lastPlayedLaunchErrorSeqRef"), jsx.indexOf("const launchGame = () => {"))
  assert.match(effect, /shouldPlayLaunchErrorCue\(launchError, launchErrorSeq, lastPlayedLaunchErrorSeqRef\.current\)/)
  assert.doesNotMatch(effect, /launchError !== lastPlayedLaunchErrorSeqRef\.current/, "must not compare the translated string directly")
})

test("Wheel destructures launchErrorSeq from useGameLauncher alongside launchError", () => {
  assert.match(jsx, /launching, launchError, launchErrorSeq, needsControllerPrompt,/)
})

test("Wheel's launch-error sound is not wired through useErrorToast/ErrorToast -- that shared component's API is untouched", () => {
  assert.doesNotMatch(jsx, /useErrorToast\([^)]+\)/, "useErrorToast must still be called with no arguments")
})

// -- existing behavior explicitly preserved this milestone ---------------------

test("Wheel's existing coin-on-mount behavior is untouched (still present, not removed or altered)", () => {
  assert.match(jsx, /sounds\.coin\?\.\(\)/)
})

test("category/selection movement (navigate()) at zone 2 (the card wheel itself) still routes through the existing navigate(-1)/navigate(1) function, untouched by this milestone", () => {
  assert.match(jsx, /if \(z === 2\) \{ navigate\(-1\); return \}/)
  assert.match(jsx, /if \(z === 2\) \{ navigate\(1\); return \}/)
})
