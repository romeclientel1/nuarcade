// launchErrorSoundGuard.test.js -----------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
// launchErrorSoundGuard.js is plain JS with no React import, so it's
// imported and exercised directly here -- the real production decision
// logic VesparaHome.jsx and Wheel.jsx both call, not a restated copy.
//
// This is the focused proof that error-sound deduplication is locale-safe:
// every scenario below is expressed purely in terms of (launchError
// presence, launchErrorSeq, lastPlayedSeq) -- never a translated string --
// because that is exactly the contract the real call sites use.

import { test } from "node:test"
import assert from "node:assert/strict"
import { shouldPlayLaunchErrorCue } from "./launchErrorSoundGuard.js"

test("a newly surfaced failure (seq differs from last-played, error present) plays once", () => {
  const result = shouldPlayLaunchErrorCue("Game exe not found", 1, null)
  assert.equal(result.play, true)
  assert.equal(result.nextLastPlayedSeq, 1)
})

test("an ordinary rerender with the same error and same seq stays silent", () => {
  const result = shouldPlayLaunchErrorCue("Game exe not found", 1, 1)
  assert.equal(result.play, false)
  assert.equal(result.nextLastPlayedSeq, 1)
})

test("no active error is always silent and resets the guard to null", () => {
  const result = shouldPlayLaunchErrorCue(null, 1, 1)
  assert.equal(result.play, false)
  assert.equal(result.nextLastPlayedSeq, null)
})

test("clearing and later resurfacing the exact same message (a new seq) permits a new cue", () => {
  const cleared = shouldPlayLaunchErrorCue(null, 1, 1)
  assert.equal(cleared.play, false)
  assert.equal(cleared.nextLastPlayedSeq, null)
  // Same message text, but a new occurrence -> useGameLauncher would have
  // incremented the seq again (2), independent of the text being identical.
  const resurfaced = shouldPlayLaunchErrorCue("Game exe not found", 2, cleared.nextLastPlayedSeq)
  assert.equal(resurfaced.play, true)
  assert.equal(resurfaced.nextLastPlayedSeq, 2)
})

test("a genuinely new failure replacing the previous one (seq increments, no clear in between) cues once", () => {
  const first = shouldPlayLaunchErrorCue("Path missing: gameA.exe", 1, null)
  assert.equal(first.play, true)
  // A second, distinct failure occurs before the first's toast/inline
  // message ever cleared -- launchError jumps straight from one truthy
  // string to another, launchErrorSeq increments to 2.
  const second = shouldPlayLaunchErrorCue("Path missing: gameB.exe", 2, first.nextLastPlayedSeq)
  assert.equal(second.play, true)
  assert.equal(second.nextLastPlayedSeq, 2)
})

// -- the specific locale-safety scenario ---------------------------------------

test("changing locale while the same failure remains visible stays silent -- the guard never inspects the message text", () => {
  const firstRender = shouldPlayLaunchErrorCue("Game exe not found. Check if the file has moved: F:/x.exe", 1, null)
  assert.equal(firstRender.play, true)
  // Simulates a locale switch: if launchError were ever retranslated in
  // place for the SAME underlying occurrence, the displayed string would
  // change but launchErrorSeq would not (useGameLauncher only increments
  // it inside showLaunchError, never as a side effect of setLocale()).
  const retranslatedSameOccurrence = shouldPlayLaunchErrorCue(
    "No se encontró el ejecutable del juego. Comprueba si el archivo se movió: F:/x.exe",
    1, // seq unchanged -- same occurrence, only the text differs
    firstRender.nextLastPlayedSeq
  )
  assert.equal(retranslatedSameOccurrence.play, false)
  assert.equal(retranslatedSameOccurrence.nextLastPlayedSeq, 1)
})

test("two unrelated failures that happen to translate to the identical string are still treated as distinct occurrences", () => {
  const first = shouldPlayLaunchErrorCue("Launch failed", 1, null)
  assert.equal(first.play, true)
  // Coincidentally identical text, but a genuinely different occurrence --
  // string-equality-based dedup would have wrongly stayed silent here.
  const second = shouldPlayLaunchErrorCue("Launch failed", 2, first.nextLastPlayedSeq)
  assert.equal(second.play, true)
})

test("the guard's decision never reads or compares the launchError string itself, only its presence and the seq", () => {
  // Sanity check on the exported function's own arity/shape: passing
  // wildly different string content with the same seq must not change
  // the outcome, proving text content plays no role in the decision.
  const a = shouldPlayLaunchErrorCue("Error A", 5, 5)
  const b = shouldPlayLaunchErrorCue("Completely different Error B", 5, 5)
  assert.deepEqual(a, b)
})
