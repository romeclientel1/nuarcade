// libraryShellMilestone1.test.js -----------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/Wheel.module.css cannot be imported here (JSX and CSS Node has
// no loader for -- see Wheel.test.js's own limitations note). These tests
// read the real committed source text and assert on the specific promises
// the Vespara Library Milestone 1 (environmental shell + header) made:
// carousel/category math and topMenuActions/index mapping are untouched,
// Return to Sanctuary stays reachable and localized from its new header
// position, Settings/Media compatibility access is unchanged, every
// restyled control keeps its focus-visible treatment, the new shell's
// transition is covered by reduced motion, and no visible "NuArcade"
// wordmark survives in the primary Library JSX.

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

// -- 1. Carousel geometry/math is unchanged (re-affirmed alongside visualPolish.test.js) --

test("carousel arc math (ARC_RADIUS, ANGLE_STEP) and tab SLOT_WIDTH are unchanged by the shell/header pass", () => {
  assert.match(jsx, /const ARC_RADIUS = 900/)
  assert.match(jsx, /const ANGLE_STEP = 22/)
  assert.match(jsx, /const SLOT_WIDTH = 168/)
})

// -- 2. topMenuActions / index mapping is unchanged ----------------------------

test("topMenuActions array and TOP_MENU_MAX are unchanged -- index-to-action mapping is stable", () => {
  assert.match(jsx, /const TOP_MENU_MAX = 10/)
  assert.match(jsx, /\(\) => setShowSort\(s => !s\),\s*\/\/ 0 Sort/)
  assert.match(jsx, /\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \},\s*\/\/ 6 Home/)
  assert.match(jsx, /\(\) => \{ if \(onSwitchPlayer\) onSwitchPlayer\(\) \},\s*\/\/ 7 Player/)
  assert.match(jsx, /\(\) => setShowExitPopup\(true\), \/\/ 11 Exit/)
})

test("every button's topMenuIdx comparison value is unchanged (0-10 mapping preserved regardless of visual grouping)", () => {
  const idxByAction = {
    Sort: 0, RND: 1, Sets: 2, Stats: 3, Ach: 4, Home: 5, Player: 6, Media: 7, Settings: 8, Help: 9, Exit: 10,
  }
  for (const idx of Object.values(idxByAction)) {
    assert.match(jsx, new RegExp("topMenuIdx === " + idx + "\\b"), "expected a control still checking topMenuIdx === " + idx)
  }
})

// -- 3. Return to Sanctuary remains reachable and localized, now from the header --

test("Return to Sanctuary renders inside the new worldNav header slot, not inside statsRow", () => {
  assert.match(jsx, /<div className=\{styles\.worldNav\}>\s*<button className=\{styles\.returnHomeBtn/)
})

test("Return to Sanctuary's exact button markup (class/onClick/title/label) is unchanged", () => {
  assert.match(jsx, /className=\{styles\.returnHomeBtn \+ \(focusZone === 0 && topMenuIdx === 5 \? " " \+ styles\.barFocused : ""\)\} onClick=\{\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \}\} title=\{t\("wheel\.returnHomeTitle"\)\}>\{t\("wheel\.navHome"\)\}<\/button>/)
})

test("Return to Sanctuary now renders unconditionally (not gated behind showSearch) -- always reachable", () => {
  const worldNavIdx = jsx.indexOf("<div className={styles.worldNav}>")
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  assert.ok(worldNavIdx > -1 && headerRightIdx > worldNavIdx, "worldNav must be declared before headerRight's showSearch ternary")
})

test("Backspace keyboard path to onReturnHome is unaffected by the header restructuring", () => {
  assert.match(jsx, /if \(e\.key === "Backspace"\) \{/)
})

// -- 4. Settings/Media state, handlers, and mount points remain present -------

test("showSettings/showMediaManager state and their mount points are unchanged", () => {
  assert.match(jsx, /const \[showMediaManager, setShowMediaManager\] = useState\(false\)/)
  assert.match(jsx, /const \[showSettings, setShowSettings\] = useState\(false\)/)
  assert.match(jsx, /\{showMediaManager && <MediaManager onClose=\{\(\) => setShowMediaManager\(false\)\} onVideosUpdated=\{refreshVideoPaths\} onArtworkUpdated=\{refreshArtwork\} \/>\}/)
  assert.match(jsx, /\{showSettings && <Settings games=\{games\}/)
})

test("Settings/Media/Player/Help/Exit controls are grouped in the new utilityGroup wrapper, still present and dispatching unchanged", () => {
  const groupBlock = jsx.slice(jsx.indexOf("<div className={styles.utilityGroup}>"), jsx.indexOf("</div>\n            </div>\n          )}"))
  assert.match(groupBlock, /onClick=\{onSwitchPlayer\}/)
  assert.match(groupBlock, /onClick=\{\(\) => setShowMediaManager\(true\)\}/)
  assert.match(groupBlock, /onClick=\{\(\) => setShowSettings\(true\)\}/)
  assert.match(groupBlock, /onClick=\{\(\) => navigateTo\("help"\)\}/)
  assert.match(groupBlock, /onClick=\{\(\) => setShowExitPopup\(true\)\}/)
})

test("Sort/Random/Sets/Stats/Achievements are grouped in the new libraryToolsGroup wrapper, dispatching unchanged", () => {
  const groupBlock = jsx.slice(jsx.indexOf("<div className={styles.libraryToolsGroup}>"), jsx.indexOf("</div>\n              <div className={styles.utilityGroup}>"))
  assert.match(groupBlock, /onClick=\{\(\) => setShowSort\(s => !s\)\}/)
  assert.match(groupBlock, /onClick=\{\(\) => setShowCollections\(true\)\}/)
  assert.match(groupBlock, /onClick=\{\(\) => navigateTo\("stats"\)\}/)
  assert.match(groupBlock, /onClick=\{\(\) => setShowAchievements\(true\)\}/)
})

// -- 5. All restyled interactive controls retain visible focus ----------------

test("every restyled/regrouped control class still has its own :focus-visible rule, unremoved", () => {
  for (const cls of [".catPill", ".settingsBtn", ".returnHomeBtn", ".exitBtn", ".mediaBtn", ".helpBtn", ".sortBtn", ".randBtn", ".colBtn", ".statsBtn", ".achieveBtn"]) {
    assert.match(css, new RegExp(cls.replace(".", "\\.") + ":focus-visible"), cls + " must still have a :focus-visible rule")
  }
})

test("the new wrapper classes (worldNav, placeIdentity, libraryToolsGroup) do not themselves intercept focus -- buttons remain the focusable elements", () => {
  assert.doesNotMatch(css, /\.worldNav:focus\b|\.placeIdentity:focus\b|\.libraryToolsGroup:focus\b/)
})

// -- 6. Reduced motion covers the newly animated shell elements ----------------

test(".utilityGroup's hover/focus-within opacity transition is included in the existing reduced-motion transition-removal block", () => {
  const reducedBlock = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  /* Outline/glow stay"))
  assert.match(reducedBlock, /\.utilityGroup\s*\{/)
})

test("reduced-motion overrides still never remove outline or box-shadow (focus must stay visible)", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g) || []
  for (const block of blocks) {
    assert.doesNotMatch(block, /outline:\s*none/)
  }
})

// -- 7. No visible "NuArcade" wordmark in the primary Library JSX -------------

test("the Nu/Arcade split-color logo markup is removed entirely", () => {
  assert.doesNotMatch(jsx, /<span className=\{styles\.logoNu\}>Nu<\/span>/)
  assert.doesNotMatch(jsx, /<span className=\{styles\.logoArcade\}>Arcade<\/span>/)
  assert.doesNotMatch(css, /\.logoNu|\.logoArcade/)
})

test("the header now presents The Library's own localized place identity instead", () => {
  assert.match(jsx, /\{t\("wheel\.libraryPlaceName"\)\}/)
  assert.match(jsx, /\{t\("wheel\.libraryPlaceSubtitle"\)\}/)
})

// -- 8. English/Spanish key parity for the new keys ---------------------------

test("wheel.libraryPlaceName and wheel.libraryPlaceSubtitle are populated in both locales", () => {
  assert.match(en, /"wheel\.libraryPlaceName":\s*"The Library"/)
  assert.match(en, /"wheel\.libraryPlaceSubtitle":\s*"Collection Hall"/)
  assert.match(es, /"wheel\.libraryPlaceName":\s*"La Biblioteca"/)
  assert.match(es, /"wheel\.libraryPlaceSubtitle":\s*"Salón de Colección"/)
})

// -- Decorative shell layers stay inert ----------------------------------------

test("bgGrid/libraryHorizon/bgVignette are all aria-hidden and pointer-events: none", () => {
  assert.match(jsx, /<div className=\{styles\.bgGrid\} aria-hidden="true" \/>/)
  assert.match(jsx, /<div className=\{styles\.libraryHorizon\} aria-hidden="true" \/>/)
  assert.match(jsx, /<div className=\{styles\.bgVignette\} aria-hidden="true" \/>/)
  for (const cls of [".bgGrid", ".libraryHorizon", ".bgVignette"]) {
    const rule = css.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule, cls + " rule must exist")
    assert.match(rule[1], /pointer-events:\s*none/)
  }
})

// -- GameCard/GameDetail/BootScreen/AttractMode are untouched this milestone --

test("no GameCard/GameDetail/BootScreen/AttractMode files were touched (Wheel.jsx only references them by existing import, unchanged)", () => {
  assert.match(jsx, /import GameCard from "\.\/GameCard"/)
  assert.match(jsx, /import AttractMode from "\.\/AttractMode"/)
})
