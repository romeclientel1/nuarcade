// soundPolish.test.js ---------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// VesparaHome.jsx cannot be imported here: it's JSX (see VesparaHome.test.js's
// own limitations note). These are source-level structural assertions on the
// real committed file proving the specific sound-wiring claims this milestone
// made: navigation sounds are boundary-gated, launch gets exactly one sound
// path (through useGameLauncher, never a duplicate select() first), the
// depart dialog produces exactly one cue per action, launch-error sound is
// deduplicated via a plain ref (no timers, no new state), restoration/mount
// stays silent, and mouse hover never triggers sound. Combined with the real
// behavioral tests in uiSoundEngine.test.js/uiSoundConfig.test.js (which
// prove the underlying gating/scaling logic), this is proof at the actual
// call sites, not a restated copy of the source.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "VesparaHome.jsx"), "utf8")

// -- sound hook wiring, config normalization -----------------------------------

test("useArcadeSounds is wired with the raw ui-sound config props, never pre-converted -- useArcadeSounds itself is the single normalization/conversion boundary", () => {
  assert.match(jsx, /useArcadeSounds\(\{ enabled: uiSoundsEnabled, volume: uiSoundVolume \}\)/)
  assert.doesNotMatch(jsx, /uiSoundVolumeToGainScale|normalizeUiSoundsEnabled/, "Home must not duplicate the conversion useArcadeSounds already performs")
})

// -- launch: exactly one sound path, never a duplicate select() first ---------

test("Home's launch cue comes exclusively from playLaunchSound: sounds.launch wired into useGameLauncher", () => {
  assert.match(jsx, /playLaunchSound:\s*sounds\.launch,/)
})

test("launchFocused's recent-game-launch branch never calls sounds.select()/sounds.navigate() before launch() -- one action, one cue", () => {
  const fn = jsx.slice(jsx.indexOf("const launchFocused"), jsx.indexOf("// Main Home controller handling"))
  const recentBranch = fn.slice(fn.indexOf('focusZone === "recents"'), fn.indexOf("} else if"))
  assert.doesNotMatch(recentBranch, /sounds\.(select|navigate)\(\)/)
  assert.match(recentBranch, /launch\(displayedRecentGames\[recentIndex\]\)/)
})

test("launchFocused's action branch (Library/Switch Player/open Depart dialog) plays exactly one select() cue", () => {
  const fn = jsx.slice(jsx.indexOf("const launchFocused"), jsx.indexOf("// Main Home controller handling"))
  const actionBranch = fn.slice(fn.indexOf("} else if"))
  const selectCalls = actionBranch.match(/sounds\.select\(\)/g) || []
  assert.equal(selectCalls.length, 1)
})

// -- navigation: boundary-gated, only sounds on a real index/zone change ------

test("recent-row Left/Right only sound when the index is not already at the boundary (gamepad handler)", () => {
  const block = jsx.slice(jsx.indexOf("onLeft: () => {\n      acceptManualFocus()"), jsx.indexOf("onUp: () => {"))
  assert.match(block, /if \(recentIndex > 0\) \{ sounds\.navigate\(\)/)
  assert.match(block, /if \(recentIndex < displayedRecentGames\.length - 1\) \{ sounds\.navigate\(\)/)
  assert.match(block, /else if \(actionIndex > 0\) \{\s*sounds\.navigate\(\)/)
  assert.match(block, /else if \(actionIndex < ACTIONS\.length - 1\) \{\s*sounds\.navigate\(\)/)
})

test("Up/Down zone switches only sound when the zone actually changes", () => {
  const block = jsx.slice(jsx.indexOf("onUp: () => { acceptManualFocus()"), jsx.indexOf("onConfirm: launchFocused"))
  assert.match(block, /if \(hasRecents && focusZone !== "recents"\) \{ sounds\.navigate\(\)/)
  assert.match(block, /if \(focusZone === "recents"\) \{ sounds\.navigate\(\)/)
})

test("keyboard handler mirrors the same boundary-gated navigate() guards as the gamepad handler", () => {
  const kb = jsx.slice(jsx.indexOf('if (e.key === "ArrowLeft") {\n        acceptManualFocus()'), jsx.indexOf('if (e.key === "Enter") launchFocused()'))
  assert.match(kb, /if \(recentIndex > 0\) \{ sounds\.navigate\(\)/)
  assert.match(kb, /else if \(actionIndex > 0\) \{\s*sounds\.navigate\(\)/)
  assert.match(kb, /if \(hasRecents && focusZone !== "recents"\) \{ sounds\.navigate\(\)/)
})

// -- depart dialog: exactly one cue per action, launch-style commit rules -----

test("depart dialog Left/Right only sound when the choice actually changes", () => {
  const block = jsx.slice(jsx.indexOf("Depart confirmation's own"), jsx.indexOf("// Keyboard parity"))
  assert.match(block, /onLeft:\s*\(\) => \{ if \(departChoice !== 0\) \{ sounds\.navigate\(\); setDepartChoice\(0\) \} \}/)
  assert.match(block, /onRight:\s*\(\) => \{ if \(departChoice !== 1\) \{ sounds\.navigate\(\); setDepartChoice\(1\) \} \}/)
})

test("depart dialog confirm plays exactly one cue per branch -- select() for quitting, back() for cancelling, never both", () => {
  const block = jsx.slice(jsx.indexOf("Depart confirmation's own"), jsx.indexOf("// Keyboard parity"))
  const onConfirmBlock = block.slice(block.indexOf("onConfirm:"), block.indexOf("onClose:"))
  assert.match(onConfirmBlock, /sounds\.select\(\); window\.nuarcade\?\.quit\?\.\(\)/)
  assert.match(onConfirmBlock, /sounds\.back\(\); setShowDepartConfirm\(false\)/)
})

test("depart dialog close (B button) plays exactly one back() cue", () => {
  const block = jsx.slice(jsx.indexOf("Depart confirmation's own"), jsx.indexOf("// Keyboard parity"))
  assert.match(block, /onClose:\s*\(\) => \{ sounds\.back\(\); setShowDepartConfirm\(false\) \}/)
})

// -- restoration / initial focus / mount stay silent ---------------------------

test("the initial-focus derivation effect never calls any sound function", () => {
  const effect = jsx.slice(jsx.indexOf("useEffect(() => {\n    if (hasAcceptedInitialFocus) return"), jsx.indexOf("useEffect(() => {\n    if (!hasRecents"))
  assert.doesNotMatch(effect, /sounds\./)
})

test("the restoration-consuming effect never calls any sound function", () => {
  const effect = jsx.slice(jsx.indexOf("if (!shouldConsumeRestoration"), jsx.indexOf("// Visual-only correction"))
  assert.doesNotMatch(effect, /sounds\./)
})

// -- launch-error sound: deduplicated via seq (locale-safe), no timers, no new state --

test("the launch-error sound effect uses a plain ref (not new React state) and introduces no timer", () => {
  const effect = jsx.slice(jsx.indexOf("const lastPlayedLaunchErrorSeqRef"), jsx.indexOf("// Completes any Recently Played credit"))
  assert.match(effect, /useRef\(null\)/)
  assert.doesNotMatch(effect, /useState/)
  assert.doesNotMatch(effect, /setTimeout|setInterval/)
})

test("the launch-error sound decision is delegated to the shared, locale-safe shouldPlayLaunchErrorCue helper -- not an inline string comparison", () => {
  assert.match(jsx, /import \{ shouldPlayLaunchErrorCue \} from "\.\.\/\.\.\/hooks\/launchErrorSoundGuard\.js"/)
  const effect = jsx.slice(jsx.indexOf("const lastPlayedLaunchErrorSeqRef"), jsx.indexOf("// Completes any Recently Played credit"))
  assert.match(effect, /shouldPlayLaunchErrorCue\(launchError, launchErrorSeq, lastPlayedLaunchErrorSeqRef\.current\)/)
  assert.doesNotMatch(effect, /launchError !== lastPlayedLaunchErrorSeqRef\.current/, "must not compare the translated string directly")
})

test("Home destructures launchErrorSeq from useGameLauncher alongside launchError", () => {
  assert.match(jsx, /launching, launchError, launchErrorSeq, needsControllerPrompt,/)
})

// -- mouse hover stays silent ---------------------------------------------------

test("no onMouseEnter/onMouseOver handler in VesparaHome.jsx plays a sound", () => {
  const hoverHandlers = jsx.match(/onMouse(Enter|Over)=\{[^}]*\}/g) || []
  for (const handler of hoverHandlers) {
    assert.doesNotMatch(handler, /sounds\./)
  }
})

// -- click handlers use the same one-action-one-cue rules as gamepad/keyboard -

test("the recent-card click handler dispatches launch directly with no confirm sound before it (matches the gamepad/keyboard path)", () => {
  const clickHandler = jsx.match(/onClick=\{\(\) => \{ acceptManualFocus\(\); setFocusZone\("recents"\); setRecentIndex\(i\); launch\(g\) \}\}/)
  assert.ok(clickHandler, "recent card click should launch directly without an extra select() call")
})

test("the action-button click handler plays exactly one select() cue, matching the keyboard/gamepad confirm path", () => {
  assert.match(jsx, /onClick=\{\(\) => \{ acceptManualFocus\(\); setFocusZone\("actions"\); setActionIndex\(i\); sounds\.select\(\); runAction\(action\) \}\}/)
})

test("depart dialog mouse click handlers use select() for quit and back() for cancel, matching the gamepad/keyboard paths", () => {
  assert.match(jsx, /onClick=\{\(\) => \{ sounds\.select\(\); window\.nuarcade\?\.quit\?\.\(\) \}\}/)
  assert.match(jsx, /onClick=\{\(\) => \{ sounds\.back\(\); setShowDepartConfirm\(false\) \}\}/)
})
