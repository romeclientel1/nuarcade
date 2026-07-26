// libraryConsoleControllerFocus.test.js -----------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Originally Milestone 2.2's correction pass (Search reachable via a
// console-local consoleFocusIdx model layered on top of the old zone-0/
// topMenuIdx system). Milestone D5 (Parts 7-9) replaced that layering:
// zone 0 now has exactly two stops (Home, the Tools trigger), and
// consoleFocusIdx is the ONLY focus model while the drawer is open --
// there is no second "old branch left unreachable" underneath it anymore.
// See libraryToolsDrawerMilestoneD5.test.js for the full new-architecture
// coverage; this file keeps the assertions from this milestone's original
// scope that are still true today.

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

// -- 1. Search is controller-reachable via a dedicated focus model -----------

test("consoleFocusIdx is a dedicated console-local focus model, separate from topMenuIdx", () => {
  assert.match(jsx, /const \[consoleFocusIdx, setConsoleFocusIdx\] = useState\(0\)/)
  assert.match(jsx, /const consoleFocusIdxRef = useRef\(0\)/)
})

test("confirm activates consoleFocusIdx 0 (Search) exactly like the mouse item -- setShowSearch/setConsoleOpen, no new query mechanism", () => {
  const confirmBlock = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("back: () => {"))
  assert.match(confirmBlock, /if \(consoleOpenRef\.current\) \{/)
  assert.match(confirmBlock, /if \(consoleFocusIdxRef\.current === 0\) \{ setShowSearch\(true\); setConsoleOpen\(false\); return \}/)
})

test("showSearch becoming true (from any entry point, including controller confirm) still focuses the existing searchRef input", () => {
  assert.match(jsx, /useEffect\(\(\) => \{\s*\n\s*if \(showSearch\) searchRef\.current\?\.focus\(\)\s*\n\s*\}, \[showSearch\]\)/)
})

// -- 2. Controller navigation reaches all remaining Tools actions ------------

test("confirm dispatches every non-Search consoleFocusIdx onto toolsActions", () => {
  const confirmBlock = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("back: () => {"))
  assert.match(confirmBlock, /toolsActions\[consoleFocusIdxRef\.current - 1\]\?\.\(\)/)
})

test("every Tools button's barFocused className lights up from consoleFocusIdx", () => {
  for (let i = 0; i <= 6; i++) {
    assert.match(jsx, new RegExp("consoleVisible && consoleFocusIdx === " + i + "\\b"), "expected a control reachable at consoleFocusIdx " + i)
  }
})

// -- 3. Closing the drawer restores focus predictably ------------------------

test("gamepad Back closes an open drawer via closeConsole (focus returns to the trigger), before falling through to the existing wheel-return line", () => {
  const backBlock = jsx.slice(jsx.indexOf("back: () => {"), jsx.indexOf("favorite:"))
  assert.match(backBlock, /if \(consoleOpenRef\.current\)\s*\{ closeConsole\(\); return \}/)
  assert.match(backBlock, /if \(focusZoneRef\.current !== 2\) \{ setFocusZone\(2\); return \}\s*\n\s*\},/)
})

test("opening the drawer resets consoleFocusIdx to 0 (Search) every time it becomes visible", () => {
  assert.match(jsx, /useEffect\(\(\) => \{\s*\n\s*if \(consoleVisible\) setConsoleFocusIdx\(0\)\s*\n\s*\}, \[consoleVisible\]\)/)
})

// -- 4. Existing controller behavior outside the drawer is unchanged --------

test("RetroArch handling remains local while Depart input is owned by the shared modal", () => {
  for (const fn of ["left: () => {", "right: () => {", "confirm: () => {", "back: () => {"]) {
    const idx = jsx.indexOf(fn)
    assert.ok(idx > -1, fn + " must exist")
  }
  assert.match(jsx, /if \(showRetroArchPopupRef\.current\) \{ if \(retroArchChoiceRef\.current !== 0\) \{ sounds\.navigate\(\); setRetroArchChoice\(0\) \} return \}/)
  assert.match(jsx, /<DepartConfirmation[\s\S]*?onChoiceChange=\{chooseDepart\}[\s\S]*?onCancel=\{declineDepart\}/)
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

// -- 5. updateAvailable produces a visible, accessible indicator -------------

test("the console trigger shows a static text badge and an accessible label/title when updateAvailable is true", () => {
  assert.match(jsx, /title=\{updateAvailable \? t\("wheel\.libraryToolsUpdateTitle"\) : t\("wheel\.libraryToolsTitle"\)\}/)
  assert.match(jsx, /aria-label=\{updateAvailable \? t\("wheel\.libraryToolsUpdateTitle"\) : undefined\}/)
  assert.match(jsx, /\{updateAvailable && \(\s*\n\s*<span className=\{styles\.consoleUpdateBadge\} aria-hidden="true">\{t\("wheel\.updateBadge"\)\}<\/span>\s*\n\s*\)\}/)
})

test("the update indicator is not color-only -- it carries its own text content, plus an aria-label on the button distinct from color", () => {
  const rule = css.match(/\.consoleUpdateBadge\s*\{([^}]*)\}/)
  assert.ok(rule, ".consoleUpdateBadge rule must exist")
  assert.match(jsx, /<span className=\{styles\.consoleUpdateBadge\} aria-hidden="true">\{t\("wheel\.updateBadge"\)\}<\/span>/)
})

test("the update indicator has no blinking/pulsing/attention-grabbing animation", () => {
  const rule = css.match(/\.consoleUpdateBadge\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.doesNotMatch(rule[1], /animation/)
})

test("update-indicator i18n keys exist in both locales", () => {
  assert.match(en, /"wheel\.libraryToolsUpdateTitle":\s*"Library Tools -- update available"/)
  assert.match(en, /"wheel\.updateBadge":\s*"UPDATE"/)
  assert.match(es, /"wheel\.libraryToolsUpdateTitle":\s*"Herramientas de la Biblioteca -- actualización disponible"/)
  assert.match(es, /"wheel\.updateBadge":\s*"ACTUALIZAR"/)
})

test("the update-now button and its unchanged handler/props still render inside the Tools panel", () => {
  const panelIdx = jsx.indexOf('id="library-tools-panel"')
  const panelEndIdx = jsx.indexOf("{showSort && <SortMenu")
  const panel = jsx.slice(panelIdx, panelEndIdx)
  assert.match(panel, /\{updateAvailable && \(/)
  assert.match(panel, /onClick=\{handleUpdateNow\}/)
  assert.match(panel, /disabled=\{installing\}/)
})

// -- 6. Exactly one trigger; drawer items live inside the panel --------------

test("headerRight's non-search branch still renders exactly one consoleTrigger", () => {
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  const categoryStripIdx = jsx.indexOf("<div className={styles.categoryStrip}>")
  const headerBlock = jsx.slice(headerRightIdx, categoryStripIdx)
  const triggerMatches = headerBlock.match(/className=\{styles\.consoleTrigger \+/g) || []
  assert.equal(triggerMatches.length, 1)
  const consoleWrapIdx = headerBlock.indexOf("<div className={styles.consoleWrap}>")
  const panelIdx = headerBlock.indexOf('id="library-tools-panel"')
  const toolsIdx = headerBlock.indexOf("<div className={styles.libraryToolsGroup}>")
  assert.ok(consoleWrapIdx > -1 && panelIdx > consoleWrapIdx && toolsIdx > panelIdx)
})

// -- 7. Mouse, keyboard, Escape, backdrop-close, filtering, Return to Sanctuary --

test("mouse click on the trigger still just toggles consoleOpen, unchanged", () => {
  assert.match(jsx, /onClick=\{\(\) => setConsoleOpen\(v => !v\)\}/)
})

test("clicking the backdrop still calls closeConsole, unchanged", () => {
  assert.match(jsx, /className=\{styles\.consoleBackdrop\} onClick=\{closeConsole\}/)
})

test("keyboard Escape still closes an open drawer via closeConsole, unchanged from the prior pass", () => {
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
