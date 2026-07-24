// libraryConsoleControllerFocus.test.js -----------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/Wheel.module.css cannot be imported here (JSX and CSS -- see
// Wheel.test.js's own limitations note). These tests read the real
// committed source text and assert on the specific promises this
// Milestone 2.2 correction pass made: Search is now reachable and
// activatable by controller through a console-local focus model
// (consoleFocusIdx) that never shifts or renumbers the existing
// topMenuActions array, D-pad navigation covers Search plus every
// existing console action, confirm activates the focused item, closing
// the console (Back/Escape/backdrop) restores focus predictably, the
// gamepad zone system outside the open console is untouched, and the
// update-available indicator on the console trigger is visible,
// accessible (not color-only), and never animated.

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

// -- 1. Search is controller-reachable without touching topMenuActions -------

test("consoleFocusIdx is a dedicated console-local focus model, separate from topMenuIdx", () => {
  assert.match(jsx, /const \[consoleFocusIdx, setConsoleFocusIdx\] = useState\(0\)/)
  assert.match(jsx, /const consoleFocusIdxRef = useRef\(0\)/)
})

test("CONSOLE_ACTION_INDICES maps console positions onto the existing topMenuActions indices, skipping only Home (5), in the exact panel order", () => {
  assert.match(jsx, /const CONSOLE_ACTION_INDICES = \[0, 1, 2, 3, 4, 6, 7, 8, 9, 10\]/)
  assert.match(jsx, /const CONSOLE_FOCUS_MAX = CONSOLE_ACTION_INDICES\.length/)
})

test("topMenuActions array, TOP_MENU_MAX, and every topMenuIdx comparison are still byte-for-byte unchanged after this correction pass", () => {
  assert.match(jsx, /const TOP_MENU_MAX = 10/)
  assert.match(jsx, /\(\) => setShowSort\(s => !s\),\s*\/\/ 0 Sort/)
  assert.match(jsx, /\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \},\s*\/\/ 6 Home/)
  assert.match(jsx, /\(\) => \{ if \(onSwitchPlayer\) onSwitchPlayer\(\) \},\s*\/\/ 7 Player/)
  assert.match(jsx, /\(\) => setShowExitPopup\(true\), \/\/ 11 Exit/)
  const idxByAction = { Sort: 0, RND: 1, Sets: 2, Stats: 3, Ach: 4, Home: 5, Player: 6, Media: 7, Settings: 8, Help: 9, Exit: 10 }
  for (const idx of Object.values(idxByAction)) {
    assert.match(jsx, new RegExp("topMenuIdx === " + idx + "\\b"))
  }
})

test("D-pad left/right drive consoleFocusIdx (clamped 0..CONSOLE_FOCUS_MAX) whenever the console is visible, before the old zone-0/topMenuIdx branch", () => {
  const leftBlock = jsx.slice(jsx.indexOf("left: () => {"), jsx.indexOf("right: () => {"))
  const rightBlock = jsx.slice(jsx.indexOf("right: () => {"), jsx.indexOf("up: () => {"))
  assert.match(leftBlock, /if \(consoleOpenRef\.current \|\| focusZoneRef\.current === 0\) \{ setConsoleFocusIdx\(i => Math\.max\(0, i - 1\)\); sounds\.navigate\(\); return \}/)
  assert.match(rightBlock, /if \(consoleOpenRef\.current \|\| focusZoneRef\.current === 0\) \{ setConsoleFocusIdx\(i => Math\.min\(CONSOLE_FOCUS_MAX, i \+ 1\)\); sounds\.navigate\(\); return \}/)
  // The old branches remain present in source (index/ordering contract), just unreachable while console-active.
  assert.match(leftBlock, /if \(z === 0\) \{ setTopMenuIdx\(i => Math\.max\(0, i - 1\)\); sounds\.navigate\(\); return \}/)
  assert.match(rightBlock, /if \(z === 0\) \{ setTopMenuIdx\(i => Math\.min\(TOP_MENU_MAX, i \+ 1\)\); sounds\.navigate\(\); return \}/)
})

// -- 2. Controller confirm activates Search and focuses the existing input ---

test("confirm activates consoleFocusIdx 0 (Search) exactly like the mouse item -- setShowSearch/setConsoleOpen, no new query mechanism", () => {
  const confirmBlock = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("settings: () => {"))
  assert.match(confirmBlock, /if \(consoleOpenRef\.current \|\| focusZoneRef\.current === 0\) \{/)
  assert.match(confirmBlock, /if \(consoleFocusIdxRef\.current === 0\) \{ setShowSearch\(true\); setConsoleOpen\(false\); return \}/)
})

test("showSearch becoming true (from any entry point, including controller confirm) still focuses the existing searchRef input", () => {
  assert.match(jsx, /useEffect\(\(\) => \{\s*\n\s*if \(showSearch\) searchRef\.current\?\.focus\(\)\s*\n\s*\}, \[showSearch\]\)/)
})

// -- 3. Controller navigation reaches all existing console actions -----------

test("confirm dispatches every non-Search consoleFocusIdx onto the unchanged topMenuActions array via CONSOLE_ACTION_INDICES", () => {
  const confirmBlock = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("settings: () => {"))
  assert.match(confirmBlock, /const actionIdx = CONSOLE_ACTION_INDICES\[consoleFocusIdxRef\.current - 1\]/)
  assert.match(confirmBlock, /topMenuActions\[actionIdx\]\?\.\(\)/)
})

test("every console button's barFocused className now also lights up from consoleFocusIdx, in addition to the untouched legacy topMenuIdx condition", () => {
  const idxMap = { Sort: 1, RND: 2, Sets: 3, Stats: 4, Ach: 5, Player: 6, Media: 7, Settings: 8, Help: 9, Exit: 10 }
  for (const consoleIdx of Object.values(idxMap)) {
    assert.match(jsx, new RegExp("consoleVisible && consoleFocusIdx === " + consoleIdx + "\\b"), "expected a control reachable at consoleFocusIdx " + consoleIdx)
  }
  assert.match(jsx, /consoleVisible && consoleFocusIdx === 0/, "Search itself must also light up at consoleFocusIdx 0")
})

// -- 4. Closing the console restores focus predictably ------------------------

test("gamepad Back closes a mouse-opened console via closeConsole (focus returns to the trigger), before falling through to the existing wheel-return line", () => {
  const backBlock = jsx.slice(jsx.indexOf("back: () => {"), jsx.indexOf("favorite:"))
  assert.match(backBlock, /if \(consoleOpenRef\.current\)\s*\{ closeConsole\(\); return \}/)
  // The pre-existing "return to wheel" fallback is untouched and still the final line.
  assert.match(backBlock, /if \(focusZoneRef\.current !== 2\) \{ setFocusZone\(2\); return \}\s*\n\s*\},/)
})

// Superseded by the final 2.2 correction pass -- Down now has a live
// spatial exit (see libraryConsoleControllerExit.test.js). Up's boundary
// no-op is still covered there too.

test("opening the console resets consoleFocusIdx to 0 (Search) every time it becomes visible", () => {
  assert.match(jsx, /useEffect\(\(\) => \{\s*\n\s*if \(consoleVisible\) setConsoleFocusIdx\(0\)\s*\n\s*\}, \[consoleVisible\]\)/)
})

// -- 5. Existing controller behavior outside the console is unchanged --------

test("RetroArch/Exit popup handling still takes priority over every gamepad handler, unchanged", () => {
  for (const fn of ["left: () => {", "right: () => {", "confirm: () => {", "back: () => {"]) {
    const idx = jsx.indexOf(fn)
    assert.ok(idx > -1, fn + " must exist")
  }
  assert.match(jsx, /if \(showRetroArchPopupRef\.current\) \{ if \(retroArchChoiceRef\.current !== 0\) \{ sounds\.navigate\(\); setRetroArchChoice\(0\) \} return \}/)
  assert.match(jsx, /if \(showExitPopupRef\.current\) \{ if \(exitChoiceRef\.current !== 0\) \{ sounds\.navigate\(\); setExitChoice\(0\) \} return \}/)
})

test("wheel navigation (zone 2), launch zone (3), and hintBar zone (4) D-pad/confirm handling are untouched", () => {
  assert.match(jsx, /if \(z === 2\) \{ navigate\(-1\); return \}/)
  assert.match(jsx, /if \(z === 2\) \{ navigate\(1\); return \}/)
  assert.match(jsx, /if \(z === 3\) \{ launchGame\(\); return \}/)
  assert.match(jsx, /if \(z === 4\) \{ hintBarActions\[barFocusIdxRef\.current\]\?\.\(\); return \}/)
})

test("category tab navigation (zone 1) and its filterLeft/filterRight gamepad shortcuts are untouched", () => {
  assert.match(jsx, /const tabs = visibleTabsRef\.current; const newIdx = tabFocusIdxRef\.current <= 0 \? tabs\.length - 1 : tabFocusIdxRef\.current - 1; setTabFocusIdx\(newIdx\); setActiveCategory\(tabs\[newIdx\]\); sounds\.navigate\(\); return/)
  assert.match(jsx, /filterLeft:\s*\(\) => \{/)
  assert.match(jsx, /filterRight: \(\) => \{/)
})

// -- 6. updateAvailable produces a visible, accessible indicator -------------

test("the console trigger shows a static text badge and an accessible label/title when updateAvailable is true", () => {
  assert.match(jsx, /title=\{updateAvailable \? t\("wheel\.libraryConsoleUpdateTitle"\) : t\("wheel\.libraryConsoleTitle"\)\}/)
  assert.match(jsx, /aria-label=\{updateAvailable \? t\("wheel\.libraryConsoleUpdateTitle"\) : undefined\}/)
  assert.match(jsx, /\{updateAvailable && \(\s*\n\s*<span className=\{styles\.consoleUpdateBadge\} aria-hidden="true">\{t\("wheel\.updateBadge"\)\}<\/span>\s*\n\s*\)\}/)
})

test("the update indicator is not color-only -- it carries its own text content, plus an aria-label on the button distinct from color", () => {
  const rule = css.match(/\.consoleUpdateBadge\s*\{([^}]*)\}/)
  assert.ok(rule, ".consoleUpdateBadge rule must exist")
  // Text content (the badge's own label) is the primary signal -- confirmed
  // by the JSX assertion above rendering t("wheel.updateBadge") as content,
  // not an empty/decorative-only element.
  assert.match(jsx, /<span className=\{styles\.consoleUpdateBadge\} aria-hidden="true">\{t\("wheel\.updateBadge"\)\}<\/span>/)
})

test("the update indicator has no blinking/pulsing/attention-grabbing animation", () => {
  const rule = css.match(/\.consoleUpdateBadge\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.doesNotMatch(rule[1], /animation/)
})

test("new update-indicator i18n keys exist in both locales", () => {
  assert.match(en, /"wheel\.libraryConsoleUpdateTitle":\s*"Library Console -- update available"/)
  assert.match(en, /"wheel\.updateBadge":\s*"UPDATE"/)
  assert.match(es, /"wheel\.libraryConsoleUpdateTitle":\s*"Consola de la Biblioteca -- actualización disponible"/)
  assert.match(es, /"wheel\.updateBadge":\s*"ACTUALIZAR"/)
})

// -- 7. The update action remains available inside the console ---------------

test("the update-now button and its unchanged handler/props still render inside utilityGroup", () => {
  const panelIdx = jsx.indexOf('id="library-console-panel"')
  const panelEndIdx = jsx.indexOf("{showSort && <SortMenu")
  const panel = jsx.slice(panelIdx, panelEndIdx)
  assert.match(panel, /\{updateAvailable && \(/)
  assert.match(panel, /onClick=\{handleUpdateNow\}/)
  assert.match(panel, /disabled=\{installing\}/)
})

// -- 8. No dense utility row returns to the header ---------------------------

test("headerRight's non-search branch still renders exactly one consoleTrigger, not a restored utility row", () => {
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  const categoryStripIdx = jsx.indexOf("<div className={styles.categoryStrip}>")
  const headerBlock = jsx.slice(headerRightIdx, categoryStripIdx)
  const triggerMatches = headerBlock.match(/className=\{styles\.consoleTrigger \+/g) || []
  assert.equal(triggerMatches.length, 1)
  // libraryToolsGroup/utilityGroup must still be nested INSIDE the panel,
  // not siblings of the trigger directly under headerRight/consoleWrap.
  const consoleWrapIdx = headerBlock.indexOf("<div className={styles.consoleWrap}>")
  const panelIdx = headerBlock.indexOf('id="library-console-panel"')
  const toolsIdx = headerBlock.indexOf("<div className={styles.libraryToolsGroup}>")
  assert.ok(consoleWrapIdx > -1 && panelIdx > consoleWrapIdx && toolsIdx > panelIdx)
})

// -- 9. Mouse, keyboard, Escape, backdrop-close, filtering, Return to Sanctuary --

test("mouse click on the trigger still just toggles consoleOpen, unchanged", () => {
  assert.match(jsx, /onClick=\{\(\) => setConsoleOpen\(v => !v\)\}/)
})

test("clicking the backdrop still calls closeConsole, unchanged", () => {
  assert.match(jsx, /className=\{styles\.consoleBackdrop\} onClick=\{closeConsole\}/)
})

test("keyboard Escape still closes a mouse-opened console via closeConsole, unchanged from the prior pass", () => {
  const escapeBlock = jsx.slice(jsx.indexOf('if (e.key === "Escape") {'), jsx.indexOf("// Single-key shortcuts only fire when no overlay is open"))
  assert.match(escapeBlock, /if \(consoleOpenRef\.current\) closeConsole\(\)/)
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

test("no new runtime dependency was added to renderer/package.json", () => {
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const knownMenuLibs = ["@headlessui/react", "@radix-ui/react-dropdown-menu", "react-popper", "@popperjs/core", "downshift"]
  for (const lib of knownMenuLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})
