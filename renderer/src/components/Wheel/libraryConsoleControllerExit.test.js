// libraryConsoleControllerExit.test.js -------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Originally Milestone 2.2's final correction pass (Down exits the console
// into the tab zone, Up is a documented boundary no-op). Milestone D5
// (Parts 7-9) replaced the underlying focus system these behaviors sat on
// top of -- see libraryConsoleControllerFocus.test.js and
// libraryToolsDrawerMilestoneD5.test.js for the current architecture. This
// file keeps the Down/Up exit-behavior coverage, updated to the new guard.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")

// -- 1. Down exits the drawer and enters the existing category/tab zone -----

test("Down closes the drawer and transitions focusZone to 1 (tabs), whenever it's open", () => {
  const downBlock = jsx.slice(jsx.indexOf("down: () => {"), jsx.indexOf("confirm: () => {"))
  assert.match(downBlock, /if \(consoleOpenRef\.current\) \{ setConsoleOpen\(false\); setFocusZone\(1\); sounds\.navigate\(\); return \}/)
})

test("the zone-0 -> tabs branch remains present for the drawer-closed (trigger-focused) case", () => {
  const downBlock = jsx.slice(jsx.indexOf("down: () => {"), jsx.indexOf("confirm: () => {"))
  assert.match(downBlock, /if \(z === 0\) \{ setFocusZone\(1\); sounds\.navigate\(\); return \}\s*\/\/ topMenu -> tabs/)
})

// -- 2. The destination category/tab has visible controller focus -----------

test("landing in focusZone 1 (tabs) via Down still drives the existing, unchanged catFocused visual", () => {
  assert.match(jsx, /focusZone === 1 && visibleTabsRef\.current\[tabFocusIdx\] === cat \? " " \+ styles\.catFocused : ""/)
})

// -- 3. Up has the chosen, documented boundary behavior ----------------------

test("Up is a documented no-op while the drawer is open -- Left/Right/Confirm/Back remain live, this is not a silent trap", () => {
  const upBlock = jsx.slice(jsx.indexOf("up: () => {"), jsx.indexOf("down: () => {"))
  assert.match(upBlock, /if \(consoleOpenRef\.current\) return/)
})

test("the zone-based Up chain remains present and untouched below the drawer-open check", () => {
  const upBlock = jsx.slice(jsx.indexOf("up: () => {"), jsx.indexOf("down: () => {"))
  assert.match(upBlock, /if \(z === 4\) \{ setFocusZone\(3\); sounds\.navigate\(\); return \}\s*\/\/ hintBar -> launch/)
  assert.match(upBlock, /if \(z === 1\) \{ setFocusZone\(0\); sounds\.navigate\(\); return \}\s*\/\/ tabs -> topMenu/)
})

// -- 4. Back still closes and restores focus ---------------------------------

test("gamepad Back still closes an open drawer via closeConsole before the wheel-return fallback", () => {
  const backBlock = jsx.slice(jsx.indexOf("back: () => {"), jsx.indexOf("favorite:"))
  assert.match(backBlock, /if \(consoleOpenRef\.current\)\s*\{ closeConsole\(\); return \}/)
  assert.match(backBlock, /if \(focusZoneRef\.current !== 2\) \{ setFocusZone\(2\); return \}\s*\n\s*\},/)
})

test("closeConsole still restores focus to the trigger button, unchanged", () => {
  assert.match(jsx, /const closeConsole = useCallback\(\(\) => \{\s*\n\s*setConsoleOpen\(false\)\s*\n\s*consoleTriggerRef\.current\?\.focus\(\)\s*\n\s*\}, \[\]\)/)
})

test("keyboard Escape and backdrop-click still close an open drawer via closeConsole, unchanged", () => {
  const escapeBlock = jsx.slice(jsx.indexOf('if (e.key === "Escape") {'), jsx.indexOf("// Single-key shortcuts only fire when no overlay is open"))
  assert.match(escapeBlock, /if \(consoleOpenRef\.current\) closeConsole\(\)/)
  assert.match(jsx, /className=\{styles\.consoleBackdrop\} onClick=\{closeConsole\}/)
})

// -- 5. RetroArch/Exit popup priority and other zone handling untouched -----

test("RetroArch/Exit popup priority, wheel/launch/hintBar zone handling, and category filterLeft/filterRight remain untouched", () => {
  assert.match(jsx, /if \(showRetroArchPopupRef\.current\) \{ if \(retroArchChoiceRef\.current !== 0\) \{ sounds\.navigate\(\); setRetroArchChoice\(0\) \} return \}/)
  assert.match(jsx, /if \(z === 2\) \{ navigate\(-1\); return \}/)
  assert.match(jsx, /if \(z === 3\) \{ launchGame\(\); return \}/)
  assert.match(jsx, /if \(z === 4\) \{ hintBarActions\[barFocusIdxRef\.current\]\?\.\(\); return \}/)
  assert.match(jsx, /filterLeft:\s*\(\) => \{/)
  assert.match(jsx, /filterRight: \(\) => \{/)
})
