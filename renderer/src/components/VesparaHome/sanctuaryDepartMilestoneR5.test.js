// sanctuaryDepartMilestoneR5.test.js ---------------------------------------
// Regression coverage for Vespara 6.0.2's Sanctuary Depart investigation.
//
// Investigation summary (see the task report for full detail): Sanctuary's
// "Depart" destination, its shared confirmation dialog, and the safe
// window.nuarcade.quit() -> 'quit-app' IPC -> app.quit() path were already
// present and wired (added by commit ddcc292, "Add universal Vespara Depart
// access"). Two genuine gaps remained, both fixed by this milestone:
//   1. The shared Depart confirmation dialog's two choices were labeled
//      with the generic common.yes/common.no strings -- perfectly
//      functional, but not in-world language ("Remain"/"Depart"), which
//      this task's brief specifically calls for.
//   2. window.nuarcade?.quit?.() was never given a .catch -- a missing
//      bridge was already safe via optional chaining alone, but a REJECTED
//      quit-app IPC round-trip (main process throwing) would have produced
//      an unhandled promise rejection in the renderer instead of failing
//      silently and safely.
//
// This file is source-level for anything embedded in JSX (VesparaHome.jsx,
// Wheel.jsx, ControlRoom.jsx, and the shared DepartConfirmation.jsx cannot
// be imported directly -- no jsdom/testing-library anywhere in this
// project, matching every other *.test.js here), and genuinely functional
// for anything that's plain, importable JS (departInteraction.js's
// acceptDepartOnce).

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { acceptDepartOnce } from "../Depart/departInteraction.js"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")

const home = read("VesparaHome.jsx")
const wheel = read("../Wheel/Wheel.jsx")
const controlRoom = read("../ControlRoom/ControlRoom.jsx")
const dialog = read("../Depart/DepartConfirmation.jsx")
const en = read("../../i18n/en.js")
const es = read("../../i18n/es.js")

// -- 1. Depart destination is rendered --------------------------------------

test("Depart is a real Sanctuary destination, not a no-op or placeholder", () => {
  assert.match(home, /const ACTIONS = \["library", "controlRoom", "switchPlayer", "depart"\]/)
  assert.match(home, /depart:\s*t\("home\.depart"\)/)
  assert.match(home, /else if \(action === "depart"\) \{ setDepartChoice\(1\); setShowDepartConfirm\(true\) \}/)
  // Rendered as a real, focusable tile (not merely present in the data
  // array) -- ref-attached so focus can be restored to it after cancel.
  assert.match(home, /ref=\{action === "depart" \? departTriggerRef : undefined\}/)
})

// -- 2. Keyboard/controller navigation can reach it -------------------------

test("Depart is reachable by keyboard and gamepad through the same generic, unbounded-index action navigation", () => {
  // No special-casing excludes the last action from Right/Left traversal --
  // Depart is simply ACTIONS[ACTIONS.length - 1], reached like any other.
  assert.match(home, /actionIndex < ACTIONS\.length - 1/)
  assert.match(home, /setActionIndex\(i => Math\.min\(ACTIONS\.length - 1, i \+ 1\)\)/)
  // Both the gamepad (useOverlayGamepad) and the keyboard listener drive
  // the identical bounds check -- confirmed by the pattern appearing twice
  // (once in the gamepad-facing onRight, once in the raw keydown handler).
  const occurrences = (home.match(/actionIndex < ACTIONS\.length - 1/g) || []).length
  assert.equal(occurrences, 2, "expected the same Right-bound check in both the gamepad and keyboard input paths")
})

// -- 3 & 5. Activation invokes the quit bridge exactly once, and a second --
//           confirm can never double-trigger it ----------------------------

test("acceptDepartOnce invokes onConfirm exactly once, even under a synchronous double-call", () => {
  const acceptedRef = { current: false }
  let calls = 0
  const onConfirm = () => { calls += 1 }

  const first = acceptDepartOnce(acceptedRef, onConfirm)
  assert.equal(first, true, "the first call should report it actually accepted")
  assert.equal(calls, 1)

  const second = acceptDepartOnce(acceptedRef, onConfirm)
  assert.equal(second, false, "a second call must report it did nothing")
  assert.equal(calls, 1, "onConfirm must not be invoked a second time")

  const third = acceptDepartOnce(acceptedRef, onConfirm)
  assert.equal(third, false)
  assert.equal(calls, 1, "repeated calls stay a permanent no-op once accepted")
})

test("every Depart confirmation surface routes its confirm button through acceptDepartOnce, not a bare onConfirm() call", () => {
  assert.match(dialog, /const confirmOnce = useCallback\(\(\) => \{\s*\n\s*acceptDepartOnce\(acceptedRef, onConfirm\)/)
  assert.match(dialog, /onClick=\{confirmOnce\}/)
  // The keyboard Enter path and the gamepad confirm path both dispatch
  // through the same acceptChoice -> confirmOnce -> acceptDepartOnce chain,
  // not a separate, ungated call.
  assert.match(dialog, /const acceptChoice = useCallback\(\(\) => \{\s*\n\s*if \(choice === 0\) confirmOnce\(\)/)
  assert.match(dialog, /confirm:\s*acceptChoice/)
  assert.match(dialog, /event\.key === "Enter"\) acceptChoice\(\)/)
})

// -- 4. Cancellation does not quit -------------------------------------------

test("choosing Remain (or Escape/Back) takes the onCancel branch and never reaches confirmOnce/acceptDepartOnce", () => {
  assert.match(dialog, /const acceptChoice = useCallback\(\(\) => \{\s*\n\s*if \(choice === 0\) confirmOnce\(\)\s*\n\s*else onCancel\(\)/)
  assert.match(dialog, /event\.key === "Escape"\) onCancel\(\)/)
  assert.match(dialog, /back:\s*onCancel/)
  // Home's own cancel handler never calls confirmDepart/quit -- it only
  // resets dialog state and restores focus.
  const cancelBlock = home.slice(home.indexOf("const cancelDepart = useCallback"), home.indexOf("const chooseDepart = useCallback"))
  assert.doesNotMatch(cancelBlock, /confirmDepart|window\.nuarcade/)
})

// -- 6. A missing or failed quit bridge is handled safely --------------------

test("every Depart confirm handler chains a .catch after the optional-chained quit call", () => {
  for (const [name, src] of [["VesparaHome", home], ["Wheel", wheel], ["ControlRoom", controlRoom]]) {
    assert.match(src, /window\.nuarcade\?\.quit\?\.\(\)\?\.catch\?\.\(\(\) => \{\}\)/, `${name} must chain a safe .catch after quit()`)
  }
})

test("the hardened quit call never throws for a missing bridge, a missing method, or a rejecting quit(), and never produces an unhandled rejection", async () => {
  // Reconstructs the exact production expression against three fixtures --
  // this is plain JS, so unlike the JSX call sites above it can be
  // genuinely executed, not just pattern-matched.
  function safeQuit(nuarcade) {
    const priorWindow = globalThis.window
    globalThis.window = { nuarcade }
    try {
      // eslint-disable-next-line no-eval -- deliberately exercises the
      // literal production expression, not a paraphrase of it.
      // eslint-disable-next-line no-new-func
      return new Function("return window.nuarcade?.quit?.()?.catch?.(() => {})")()
    } finally {
      globalThis.window = priorWindow
    }
  }

  let unhandled = null
  const onUnhandled = (err) => { unhandled = err }
  process.on("unhandledRejection", onUnhandled)
  try {
    assert.doesNotThrow(() => safeQuit(undefined), "missing window.nuarcade must not throw")
    assert.doesNotThrow(() => safeQuit({}), "window.nuarcade without a quit method must not throw")
    assert.doesNotThrow(() => safeQuit({ quit: () => Promise.reject(new Error("main process quit-app handler threw")) }),
      "a rejecting quit() must not throw synchronously")
    // Give the rejected promise's microtask queue a turn to (safely) settle.
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(unhandled, null, "a rejected quit() must never surface as an unhandled promise rejection")
  } finally {
    process.off("unhandledRejection", onUnhandled)
  }
})

// -- World language: in-world choice labels, not generic Yes/No -------------

test("the shared Depart dialog uses in-world Remain/Depart labels, not the generic common.yes/common.no, everywhere it is rendered", () => {
  for (const [name, src] of [["VesparaHome", home], ["Wheel", wheel], ["ControlRoom", controlRoom]]) {
    const departBlock = src.slice(src.indexOf("<DepartConfirmation"), src.indexOf("<DepartConfirmation") + 400)
    assert.match(departBlock, /yesLabel=\{t\("depart\.depart"\)\}/, `${name} yesLabel`)
    assert.match(departBlock, /noLabel=\{t\("depart\.remain"\)\}/, `${name} noLabel`)
    assert.doesNotMatch(departBlock, /common\.yes|common\.no/, `${name} must not fall back to generic Yes/No for Depart`)
  }
})

test("depart.remain and depart.depart are defined in every currently supported locale", () => {
  for (const [name, src] of [["en", en], ["es", es]]) {
    assert.match(src, /"depart\.remain":\s*"[^"]+"/, `${name} missing depart.remain`)
    assert.match(src, /"depart\.depart":\s*"[^"]+"/, `${name} missing depart.depart`)
  }
  assert.match(en, /"depart\.remain":\s*"Remain"/)
  assert.match(en, /"depart\.depart":\s*"Depart"/)
  assert.match(es, /"depart\.remain":\s*"Permanecer"/)
  assert.match(es, /"depart\.depart":\s*"Partir"/)
})

// -- Safe application-exit path traced end-to-end ----------------------------

test("Depart's confirm handler is the same safe bridge used everywhere else in the app -- no direct process/window-close workaround", () => {
  assert.doesNotMatch(home, /require\(['"]child_process['"]\)|process\.exit|window\.close\(\)/)
  const confirmBlock = home.slice(home.indexOf("const confirmDepart = useCallback"), home.indexOf("const cancelDepart = useCallback"))
  assert.match(confirmBlock, /window\.nuarcade\?\.quit\?\.\(\)/)
})
