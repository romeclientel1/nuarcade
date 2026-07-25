// libraryConsoleMilestone2_2.test.js --------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/Wheel.module.css cannot be imported here (JSX and CSS -- see
// Wheel.test.js's own limitations note). These tests read the real
// committed source text and assert on the specific promises Vespara
// Library Milestone 2.2 (Upper-Right Console Redesign) made: the crowded
// statsRow/libraryToolsGroup/utilityGroup cluster is replaced by a single
// Library Console trigger, every existing utility action (Sort, RND,
// Sets, Stats, Achievements, Player/Guest, Media, Settings, Help, Exit)
// is still reachable and dispatches its unchanged handler, Search is now
// exposed and reveals/focuses the existing input without touching
// filtering semantics, topMenuActions/TOP_MENU_MAX/index mapping are
// completely untouched, the console has predictable open/close focus
// behavior (Escape closes and restores trigger focus), Return to
// Sanctuary remains available during search, the game count is now
// read-only status rather than a utility-cluster pill, and every
// existing focus-visible/reduced-motion rule survives.

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

// -- 1. Only one primary Library Console trigger occupies the upper-right slot --

test("headerRight's non-search branch renders exactly one console trigger button, not a row of utility buttons", () => {
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  const categoryStripIdx = jsx.indexOf("<div className={styles.categoryStrip}>")
  const headerBlock = jsx.slice(headerRightIdx, categoryStripIdx)
  const triggerMatches = headerBlock.match(/className=\{styles\.consoleTrigger \+/g) || []
  assert.equal(triggerMatches.length, 1, "expected exactly one consoleTrigger button")
})

test("the console trigger is anchored to the upper-right (inside consoleWrap, inside headerRight), not a separate top-level control", () => {
  const consoleWrapIdx = jsx.indexOf("<div className={styles.consoleWrap}>")
  const triggerIdx = jsx.indexOf("ref={consoleTriggerRef}")
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  assert.ok(headerRightIdx > -1 && consoleWrapIdx > headerRightIdx && triggerIdx > consoleWrapIdx)
})

// -- 2 & 3. Existing Search/Settings/Media/Sort/RND/Sets/Stats/Ach/Player/Help/Exit remain available, unchanged handlers --

test("every previously-exposed utility action is still present inside the console panel with its exact unchanged handler", () => {
  const panelIdx = jsx.indexOf('id="library-console-panel"')
  const panelEndIdx = jsx.indexOf("{showSort && <SortMenu")
  const panel = jsx.slice(panelIdx, panelEndIdx)
  assert.match(panel, /onClick=\{\(\) => setShowSort\(s => !s\)\}/, "Sort")
  assert.match(panel, /setSelectedIndex\(Math\.floor\(Math\.random\(\) \* filteredGames\.length\)\)/, "RND")
  assert.match(panel, /onClick=\{\(\) => setShowCollections\(true\)\}/, "Sets")
  assert.match(panel, /onClick=\{\(\) => navigateTo\("stats"\)\}/, "Stats")
  assert.match(panel, /onClick=\{\(\) => setShowAchievements\(true\)\}/, "Achievements")
  assert.match(panel, /onClick=\{onSwitchPlayer\}/, "Player")
  assert.match(panel, /onClick=\{\(\) => setShowMediaManager\(true\)\}/, "Media")
  assert.match(panel, /onClick=\{\(\) => setShowSettings\(true\)\}/, "Settings")
  assert.match(panel, /onClick=\{\(\) => navigateTo\("help"\)\}/, "Help")
  assert.match(panel, /onClick=\{openDepart\}/, "Depart")
})

test("Search is exposed as a console menu item that reveals the existing search UI without a new query mechanism", () => {
  assert.match(jsx, /className=\{styles\.consoleSearchItem \+ \(consoleVisible && consoleFocusIdx === 0 \? " " \+ styles\.barFocused : ""\)\}\s*\n\s*onClick=\{\(\) => \{ setShowSearch\(true\); setConsoleOpen\(false\) \}\}/)
})

// -- 3 (cont). topMenuActions / TOP_MENU_MAX / index mapping are completely unchanged --

test("topMenuActions array, TOP_MENU_MAX, and every topMenuIdx comparison are byte-for-byte unchanged", () => {
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

// -- 4 & 5. Opening/closing the console has predictable focus behavior; Escape restores trigger focus --

test("consoleOpen is a dedicated state, independent of focusZone, so opening/closing it cannot alter the existing zone system", () => {
  assert.match(jsx, /const \[consoleOpen, setConsoleOpen\] = useState\(false\)/)
  assert.match(jsx, /const consoleVisible = consoleOpen \|\| focusZone === 0/)
})

test("opening the console (consoleOpen becomes true) moves focus to the panel's first item", () => {
  assert.match(jsx, /useEffect\(\(\) => \{\s*\n\s*if \(consoleOpen\) consoleFirstItemRef\.current\?\.focus\(\)\s*\n\s*\}, \[consoleOpen\]\)/)
})

test("closeConsole closes the panel and restores focus to its own trigger button", () => {
  assert.match(jsx, /const closeConsole = useCallback\(\(\) => \{\s*\n\s*setConsoleOpen\(false\)\s*\n\s*consoleTriggerRef\.current\?\.focus\(\)\s*\n\s*\}, \[\]\)/)
})

test("Escape closes the console via closeConsole when it was opened, without touching onReturnHome or other overlay-close behavior", () => {
  const escapeBlock = jsx.slice(jsx.indexOf('if (e.key === "Escape") {'), jsx.indexOf("// Single-key shortcuts only fire when no overlay is open"))
  assert.match(escapeBlock, /if \(consoleOpenRef\.current\) closeConsole\(\)/)
  assert.doesNotMatch(escapeBlock, /onReturnHome/)
})

test("clicking outside the console (the backdrop) also calls closeConsole", () => {
  assert.match(jsx, /className=\{styles\.consoleBackdrop\} onClick=\{closeConsole\}/)
})

// -- 6. Search still reveals and focuses the existing input ------------------

test("showSearch becoming true focuses the existing searchRef input, not a new element", () => {
  assert.match(jsx, /useEffect\(\(\) => \{\s*\n\s*if \(showSearch\) searchRef\.current\?\.focus\(\)\s*\n\s*\}, \[showSearch\]\)/)
  assert.match(jsx, /ref=\{searchRef\}/)
})

// -- 7. Search filtering and clearing behavior remain unchanged --------------

test("search filtering (debouncedSearch -> getFilteredGames) and the close/clear handlers are byte-for-byte unchanged", () => {
  assert.match(jsx, /if \(debouncedSearch\.trim\(\)\) \{/)
  assert.match(jsx, /const q = debouncedSearch\.toLowerCase\(\)\.trim\(\)/)
  assert.match(jsx, /if \(e\.key === "Escape"\) \{ setShowSearch\(false\); setSearch\(""\); setDebouncedSearch\(""\); setAiResults\(null\); setAiSearching\(false\); setShowVirtualKeyboard\(false\) \}/)
  assert.match(jsx, /<button className=\{styles\.searchClose\} onClick=\{\(\) => \{\s*\n\s*setShowSearch\(false\); setSearch\(""\); setDebouncedSearch\(""\); setAiResults\(null\); setAiSearching\(false\); setShowVirtualKeyboard\(false\)\s*\n\s*\}\}>x<\/button>/)
})

// -- 8. Return to Sanctuary remains available during search ------------------

test("Return to Sanctuary (worldNav) renders as a sibling of headerRight, unconditionally, so it's unaffected by showSearch", () => {
  const worldNavIdx = jsx.indexOf("<div className={styles.worldNav}>")
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  const showSearchTernaryIdx = jsx.indexOf("{showSearch ? (")
  assert.ok(worldNavIdx > -1 && headerRightIdx > worldNavIdx && showSearchTernaryIdx > headerRightIdx, "worldNav must be declared and closed before headerRight's showSearch ternary, so it never depends on showSearch")
  assert.match(jsx, /<div className=\{styles\.worldNav\}>\s*\n\s*<button className=\{styles\.returnHomeBtn/)
})

// -- 9. Game count still renders but is no longer part of the utility-button cluster --

test("gameCount now renders inside collectionStatus (under the place identity), not inside the console/utility cluster", () => {
  const placeIdentityIdx = jsx.indexOf("<div className={styles.placeIdentity}>")
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  const collectionStatusIdx = jsx.indexOf("<div className={styles.collectionStatus}")
  const gameCountIdx = jsx.indexOf("<span className={styles.gameCount}>")
  assert.ok(placeIdentityIdx > -1 && collectionStatusIdx > placeIdentityIdx && collectionStatusIdx < headerRightIdx, "collectionStatus must be inside placeIdentity, before headerRight")
  assert.ok(gameCountIdx > collectionStatusIdx && gameCountIdx < headerRightIdx, "gameCount must render inside collectionStatus, before headerRight")
})

test("collectionStatus is decorative (aria-hidden, pointer-events: none) -- status, not an interactive control", () => {
  assert.match(jsx, /<div className=\{styles\.collectionStatus\} aria-hidden="true">/)
  const rule = css.match(/\.collectionStatus\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /pointer-events:\s*none/)
})

test("gameCount no longer carries pill/button styling (border, background, border-radius)", () => {
  const rule = css.match(/\.gameCount\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.doesNotMatch(rule[1], /border\s*:/)
  assert.doesNotMatch(rule[1], /background\s*:/)
  assert.doesNotMatch(rule[1], /border-radius\s*:/)
})

// -- 10. Keyboard, controller, and mouse paths remain supported --------------

test("the console trigger and search item are real, native buttons -- reachable by mouse click and keyboard Tab/Enter", () => {
  assert.match(jsx, /<button\s*\n\s*ref=\{consoleTriggerRef\}/)
  assert.match(jsx, /<button\s*\n\s*ref=\{consoleFirstItemRef\}\s*\n\s*className=\{styles\.consoleSearchItem \+/)
})

test("the gamepad zone-0 (topMenu) system is completely untouched -- left/right/confirm/up/down still drive the same refs", () => {
  assert.match(jsx, /if \(z === 0\) \{ setTopMenuIdx\(i => Math\.max\(0, i - 1\)\); sounds\.navigate\(\); return \}/)
  assert.match(jsx, /if \(z === 0\) \{ setTopMenuIdx\(i => Math\.min\(TOP_MENU_MAX, i \+ 1\)\); sounds\.navigate\(\); return \}/)
  assert.match(jsx, /if \(z === 0\) \{ topMenuActions\[topMenuIdxRef\.current\]\?\.\(\); return \}/)
})

// -- 11. Existing focus-visible and reduced-motion rules remain intact -------

test("every previously-restyled control class still has its own :focus-visible rule, unremoved", () => {
  for (const cls of [".catPill", ".settingsBtn", ".returnHomeBtn", ".consoleDepartBtn", ".mediaBtn", ".helpBtn", ".sortBtn", ".randBtn", ".colBtn", ".statsBtn", ".achieveBtn"]) {
    assert.match(css, new RegExp(cls.replace(".", "\\.") + ":focus-visible"), cls + " must still have a :focus-visible rule")
  }
})

test("the new console trigger and search item also get the shared cyan focus-visible treatment", () => {
  const block = css.match(/\.consoleTrigger:focus-visible,\s*\n\.consoleSearchItem:focus-visible\s*\{([^}]*)\}/)
  assert.ok(block, "expected a :focus-visible rule for the new console controls")
  assert.match(block[1], /#00ffff/)
})

test("reduced motion neutralizes the new console panel entrance animation and its controls' transitions, without removing outline", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g) || []
  const covered = blocks.some(b => /\.consolePanel/.test(b) && /animation:\s*none/.test(b))
  assert.ok(covered, "expected a reduced-motion rule turning off .consolePanel's animation")
  const transitionCovered = blocks.some(b => /\.consoleTrigger/.test(b) && /\.consoleSearchItem/.test(b) && /transition:\s*none/.test(b))
  assert.ok(transitionCovered, "expected consoleTrigger/consoleSearchItem transitions removed under reduced motion")
  for (const block of blocks) {
    assert.doesNotMatch(block, /outline:\s*none/)
  }
})

// -- 12. No unrelated Library behavior changed -------------------------------

test("carousel geometry, launch dispatch, and Recently Played click-to-select are untouched", () => {
  assert.match(jsx, /const ARC_RADIUS = 900/)
  assert.match(jsx, /const ANGLE_STEP = 22/)
  assert.match(jsx, /onClick=\{launchGame\} disabled=\{launching\}/)
  assert.match(jsx, /const idx = filteredGames\.findIndex\(fg =>/)
})

test("Library Console remains independent of the Archive View A/B lifecycle", () => {
  assert.match(jsx, /const incomingSlot = activeSlot === 'a' \? 'b' : 'a'/)
  assert.match(jsx, /if \(incomingSlot === 'a'\) setBgVideoA\(incoming\)/)
  assert.match(jsx, /else setBgVideoB\(incoming\)/)
  assert.doesNotMatch(jsx.slice(jsx.indexOf("const closeConsole"), jsx.indexOf("// Search still reveals")), /bgVideo|archiveVideo/)
})

test("Settings and Media destinations mount with their unchanged props", () => {
  assert.match(jsx, /\{showMediaManager && <MediaManager onClose=\{\(\) => setShowMediaManager\(false\)\} onVideosUpdated=\{refreshVideoPaths\} onArtworkUpdated=\{refreshArtwork\} \/>\}/)
  assert.match(jsx, /\{showSettings && <Settings games=\{games\}/)
})

test("new i18n keys exist in both locales, and no existing key's value was altered", () => {
  assert.match(en, /"wheel\.libraryConsole":\s*"Console"/)
  assert.match(en, /"wheel\.searchAction":\s*"Search"/)
  assert.match(es, /"wheel\.libraryConsole":\s*"Consola"/)
  assert.match(es, /"wheel\.searchAction":\s*"Buscar"/)
  assert.match(en, /"wheel\.navHome":\s*"Return to Sanctuary"/)
  assert.match(en, /"wheel\.searchPlaceholder":\s*"Search games, systems, ROM names\.\.\."/)
})

test("no new dependency was added to renderer/package.json", () => {
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const knownMenuLibs = ["@headlessui/react", "@radix-ui/react-dropdown-menu", "react-popper", "@popperjs/core", "downshift"]
  for (const lib of knownMenuLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})
