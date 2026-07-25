// libraryConsoleControllerExit.test.js -------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/Wheel.module.css cannot be imported here (JSX and CSS -- see
// Wheel.test.js's own limitations note). These tests read the real
// committed source text and assert on the specific promises this final
// Milestone 2.2 correction made: Down exits the Library Console into the
// existing category/tab zone (matching the former zone-0-to-tabs spatial
// behavior, with visible focus there), Up is a documented boundary
// no-op rather than a silent trap, Back/Escape/backdrop-close and
// trigger-focus restoration are untouched, Left/Right/Confirm still
// cover every console item including Search, topMenuActions/TOP_MENU_MAX/
// indices remain byte-for-byte unchanged, and mouse/keyboard/update-badge/
// filtering/Return-to-Sanctuary behavior are all unaffected.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")

// -- 1. Down exits the console and enters the existing category/tab zone -----

test("Down closes the console (if mouse-opened) and transitions focusZone to 1 (tabs), whenever the console is visible", () => {
  const downBlock = jsx.slice(jsx.indexOf("down: () => {"), jsx.indexOf("confirm: () => {"))
  assert.match(downBlock, /if \(consoleOpenRef\.current \|\| focusZoneRef\.current === 0\) \{ setConsoleOpen\(false\); setFocusZone\(1\); sounds\.navigate\(\); return \}/)
})

test("the old zone-0 -> tabs branch remains present in source (unreachable while console-active), preserving the historical spatial mapping", () => {
  const downBlock = jsx.slice(jsx.indexOf("down: () => {"), jsx.indexOf("confirm: () => {"))
  assert.match(downBlock, /if \(z === 0\) \{ setFocusZone\(1\); sounds\.navigate\(\); return \}\s*\/\/ topMenu -> tabs/)
})

// -- 2. The destination category/tab has visible controller focus -----------

test("landing in focusZone 1 (tabs) via Down still drives the existing, unchanged catFocused visual", () => {
  assert.match(jsx, /focusZone === 1 && visibleTabsRef\.current\[tabFocusIdx\] === cat \? " " \+ styles\.catFocused : ""/)
})

// -- 3. Up has the chosen, documented boundary behavior ----------------------

test("Up is a documented no-op while the console is visible -- console-local Left/Right/Confirm/Back remain live, this is not a silent trap", () => {
  const upBlock = jsx.slice(jsx.indexOf("up: () => {"), jsx.indexOf("down: () => {"))
  assert.match(upBlock, /Documented boundary \(2\.2 correction\) -- Up while the console is\s*\n\s*\/\/ visible is a deliberate no-op, not a silent trap/)
  assert.match(upBlock, /if \(consoleOpenRef\.current \|\| focusZoneRef\.current === 0\) return/)
})

test("the old zone-based Up chain remains present and untouched below the console-boundary check", () => {
  const upBlock = jsx.slice(jsx.indexOf("up: () => {"), jsx.indexOf("down: () => {"))
  assert.match(upBlock, /if \(z === 4\) \{ setFocusZone\(3\); sounds\.navigate\(\); return \}\s*\/\/ hintBar -> launch/)
  assert.match(upBlock, /if \(z === 1\) \{ setFocusZone\(0\); sounds\.navigate\(\); return \}\s*\/\/ tabs -> topMenu/)
})

// -- 4. Back still closes and restores focus ---------------------------------

test("gamepad Back still closes a mouse-opened console via closeConsole before the wheel-return fallback, unchanged by this pass", () => {
  const backBlock = jsx.slice(jsx.indexOf("back: () => {"), jsx.indexOf("favorite:"))
  assert.match(backBlock, /if \(consoleOpenRef\.current\)\s*\{ closeConsole\(\); return \}/)
  assert.match(backBlock, /if \(focusZoneRef\.current !== 2\) \{ setFocusZone\(2\); return \}\s*\n\s*\},/)
})

test("closeConsole still restores focus to the trigger button, unchanged", () => {
  assert.match(jsx, /const closeConsole = useCallback\(\(\) => \{\s*\n\s*setConsoleOpen\(false\)\s*\n\s*consoleTriggerRef\.current\?\.focus\(\)\s*\n\s*\}, \[\]\)/)
})

test("keyboard Escape and backdrop-click still close a mouse-opened console via closeConsole, unchanged", () => {
  const escapeBlock = jsx.slice(jsx.indexOf('if (e.key === "Escape") {'), jsx.indexOf("// Single-key shortcuts only fire when no overlay is open"))
  assert.match(escapeBlock, /if \(consoleOpenRef\.current\) closeConsole\(\)/)
  assert.match(jsx, /className=\{styles\.consoleBackdrop\} onClick=\{closeConsole\}/)
})

// -- 5. Left/Right and Confirm still work across all console items ----------

test("Left/Right still drive consoleFocusIdx (clamped 0..CONSOLE_FOCUS_MAX) whenever the console is visible, unchanged by this pass", () => {
  const leftBlock = jsx.slice(jsx.indexOf("left: () => {"), jsx.indexOf("right: () => {"))
  const rightBlock = jsx.slice(jsx.indexOf("right: () => {"), jsx.indexOf("up: () => {"))
  assert.match(leftBlock, /if \(consoleOpenRef\.current \|\| focusZoneRef\.current === 0\) \{ setConsoleFocusIdx\(i => Math\.max\(0, i - 1\)\); sounds\.navigate\(\); return \}/)
  assert.match(rightBlock, /if \(consoleOpenRef\.current \|\| focusZoneRef\.current === 0\) \{ setConsoleFocusIdx\(i => Math\.min\(CONSOLE_FOCUS_MAX, i \+ 1\)\); sounds\.navigate\(\); return \}/)
})

test("Confirm still activates Search at consoleFocusIdx 0 and every other item via the unchanged topMenuActions array, unchanged by this pass", () => {
  const confirmBlock = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("settings: () => {"))
  assert.match(confirmBlock, /if \(consoleOpenRef\.current \|\| focusZoneRef\.current === 0\) \{/)
  assert.match(confirmBlock, /if \(consoleFocusIdxRef\.current === 0\) \{ setShowSearch\(true\); setConsoleOpen\(false\); return \}/)
  assert.match(confirmBlock, /const actionIdx = CONSOLE_ACTION_INDICES\[consoleFocusIdxRef\.current - 1\]/)
  assert.match(confirmBlock, /topMenuActions\[actionIdx\]\?\.\(\)/)
})

// -- 6. Search remains controller-accessible ---------------------------------

test("consoleFocusIdx 0 (Search) is reachable via Left/Right from any other console item (clamped range includes 0)", () => {
  assert.match(jsx, /const CONSOLE_ACTION_INDICES = \[0, 1, 2, 3, 4, 6, 7, 8, 9, 10\]/)
  assert.match(jsx, /const CONSOLE_FOCUS_MAX = CONSOLE_ACTION_INDICES\.length/)
})

test("reopening the console still begins on Search (consoleFocusIdx resets to 0 whenever it becomes visible)", () => {
  assert.match(jsx, /useEffect\(\(\) => \{\s*\n\s*if \(consoleVisible\) setConsoleFocusIdx\(0\)\s*\n\s*\}, \[consoleVisible\]\)/)
})

// -- 7. topMenuActions ordering and indices remain byte-for-byte unchanged --

test("topMenuActions array, TOP_MENU_MAX, and every topMenuIdx comparison are still byte-for-byte unchanged after this final correction", () => {
  assert.match(jsx, /const TOP_MENU_MAX = 10/)
  assert.match(jsx, /\(\) => setShowSort\(s => !s\),\s*\/\/ 0 Sort/)
  assert.match(jsx, /\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \},\s*\/\/ 6 Home/)
  assert.match(jsx, /\(\) => \{ if \(onSwitchPlayer\) onSwitchPlayer\(\) \},\s*\/\/ 7 Player/)
  assert.match(jsx, /\(\) => openDepart\(consoleDepartRef\.current\),\s*\/\/ 11 Depart/)
  const idxByAction = { Sort: 0, RND: 1, Sets: 2, Stats: 3, Ach: 4, Home: 5, Player: 6, Media: 7, Settings: 8, Help: 9, Exit: 10 }
  for (const idx of Object.values(idxByAction)) {
    assert.match(jsx, new RegExp("topMenuIdx === " + idx + "\\b"))
  }
})

// -- 8. Mouse, keyboard, update badge, filtering, Return to Sanctuary intact --

test("mouse click on the trigger still just toggles consoleOpen, unchanged", () => {
  assert.match(jsx, /onClick=\{\(\) => setConsoleOpen\(v => !v\)\}/)
})

test("the update-available badge/aria-label on the trigger are unchanged by this pass", () => {
  assert.match(jsx, /title=\{updateAvailable \? t\("wheel\.libraryConsoleUpdateTitle"\) : t\("wheel\.libraryConsoleTitle"\)\}/)
  assert.match(jsx, /aria-label=\{updateAvailable \? t\("wheel\.libraryConsoleUpdateTitle"\) : undefined\}/)
  assert.match(jsx, /<span className=\{styles\.consoleUpdateBadge\} aria-hidden="true">\{t\("wheel\.updateBadge"\)\}<\/span>/)
  const rule = css.match(/\.consoleUpdateBadge\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.doesNotMatch(rule[1], /animation/)
  assert.match(en, /"wheel\.updateBadge":\s*"UPDATE"/)
  assert.match(es, /"wheel\.updateBadge":\s*"ACTUALIZAR"/)
})

test("search filtering (debouncedSearch -> getFilteredGames) and the close/clear handlers remain byte-for-byte unchanged", () => {
  assert.match(jsx, /if \(debouncedSearch\.trim\(\)\) \{/)
  assert.match(jsx, /const q = debouncedSearch\.toLowerCase\(\)\.trim\(\)/)
  assert.match(jsx, /if \(e\.key === "Escape"\) \{ setShowSearch\(false\); setSearch\(""\); setDebouncedSearch\(""\); setAiResults\(null\); setAiSearching\(false\); setShowVirtualKeyboard\(false\) \}/)
})

test("Return to Sanctuary (worldNav) still renders unconditionally, before headerRight's showSearch ternary", () => {
  const worldNavIdx = jsx.indexOf("<div className={styles.worldNav}>")
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  const showSearchTernaryIdx = jsx.indexOf("{showSearch ? (")
  assert.ok(worldNavIdx > -1 && headerRightIdx > worldNavIdx && showSearchTernaryIdx > headerRightIdx)
  assert.match(jsx, /<div className=\{styles\.worldNav\}>\s*\n\s*<button className=\{styles\.returnHomeBtn/)
})

test("RetroArch/Exit popup priority, wheel/launch/hintBar zone handling, and category filterLeft/filterRight remain untouched", () => {
  assert.match(jsx, /if \(showRetroArchPopupRef\.current\) \{ if \(retroArchChoiceRef\.current !== 0\) \{ sounds\.navigate\(\); setRetroArchChoice\(0\) \} return \}/)
  assert.match(jsx, /if \(z === 2\) \{ navigate\(-1\); return \}/)
  assert.match(jsx, /if \(z === 3\) \{ launchGame\(\); return \}/)
  assert.match(jsx, /if \(z === 4\) \{ hintBarActions\[barFocusIdxRef\.current\]\?\.\(\); return \}/)
  assert.match(jsx, /filterLeft:\s*\(\) => \{/)
  assert.match(jsx, /filterRight: \(\) => \{/)
})
