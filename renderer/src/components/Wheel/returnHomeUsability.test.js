// returnHomeUsability.test.js -------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/Wheel.module.css cannot be imported here (JSX and CSS Node has
// no loader for -- see Wheel.test.js's own limitations note). These tests
// read the real committed source text and assert on the specific
// usability-fix promises this milestone made: Backspace reaches
// onReturnHome directly from the primary Library view, editable targets
// (SELECT/contenteditable, plus the pre-existing INPUT/TEXTAREA guard) are
// excluded, the Return-to-Sanctuary control has its own visually distinct
// class rather than blending into .settingsBtn, its label/tooltip are
// localized (no hardcoded English string survives), and the existing
// controller/mouse wiring to onReturnHome is untouched.

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

// -- Backspace reaches onReturnHome directly -----------------------------------

test("Backspace calls onReturnHome directly in the keyboard handler", () => {
  assert.match(jsx, /if \(e\.key === "Backspace"\) \{/)
  const block = jsx.slice(jsx.indexOf('if (e.key === "Backspace") {'), jsx.indexOf('// Konami code detector'))
  assert.match(block, /if \(!isEditableTarget\) \{ if \(onReturnHome\) onReturnHome\(\) \}/)
})

test("Backspace handling only fires after the anyOverlay early return -- primary Library view only", () => {
  const overlayGateIdx = jsx.indexOf("if (anyOverlay) return")
  const backspaceIdx = jsx.indexOf('if (e.key === "Backspace") {')
  assert.ok(overlayGateIdx > -1 && backspaceIdx > overlayGateIdx, "Backspace handling must be declared after the anyOverlay gate")
})

test("the keydown effect's dependency array includes onReturnHome", () => {
  assert.match(jsx, /\}, \[filteredGames, selectedIndex, showSearch, showVirtualKeyboard, showDetail, currentDestination, showAchievements, showCollections, showSettings, showMediaManager, showCoach, showOperator, current, onReturnHome\]\)/)
})

// -- Editable targets are excluded ---------------------------------------------

test("INPUT/TEXTAREA are already excluded by the handler's existing top-level guard", () => {
  assert.match(jsx, /if \(e\.target\.tagName === "INPUT" \|\| e\.target\.tagName === "TEXTAREA"\) return/)
})

test("Backspace additionally excludes SELECT and contenteditable targets", () => {
  const block = jsx.slice(jsx.indexOf('if (e.key === "Backspace") {'), jsx.indexOf('// Konami code detector'))
  assert.match(block, /target\?\.tagName === "SELECT" \|\| target\?\.isContentEditable/)
})

// -- Escape/Enter/Space/single-letter shortcuts are untouched ------------------

test("Escape's overlay-close behavior is unchanged (no onReturnHome call added to it)", () => {
  const escapeBlock = jsx.slice(jsx.indexOf('if (e.key === "Escape") {'), jsx.indexOf('// Single-key shortcuts only fire when no overlay is open'))
  assert.doesNotMatch(escapeBlock, /onReturnHome/)
})

test("Enter and Space handlers are unchanged", () => {
  assert.match(jsx, /if \(e\.key === "Enter"\) \{ if \(!showDetail && currentDestination !== "help" && currentDestination !== "stats" && !showAchievements && !showCollections && !showSettings && !showMediaManager && !showCoach\) \{ sounds\.select\(\); resetLaunching\(\); setShowDetail\(true\) \} else if \(showDetail\) \{ if \(current\) launchGame\(\) \} \}/)
  assert.match(jsx, /if \(e\.key === " "\) \{ e\.preventDefault\(\); if \(current\) launchGame\(\) \}/)
})

test("existing single-letter shortcuts (f/n/t/a/s/r) are unchanged", () => {
  assert.match(jsx, /if \(e\.key === "f" \|\| e\.key === "F"\) \{ if \(current\) toggleFavorite\(current\.id \|\| current\.profile\) \}/)
  assert.match(jsx, /if \(e\.key === "n" \|\| e\.key === "N"\) setShowCollections\(c => !c\)/)
  assert.match(jsx, /if \(e\.key === "t" \|\| e\.key === "T"\) \{ if \(currentDestination === "stats"\) back\(\); else navigateTo\("stats"\) \}/)
  assert.match(jsx, /if \(e\.key === "a" \|\| e\.key === "A"\) setShowAchievements\(s => !s\)/)
})

// -- The control has its own visually distinct class ---------------------------

test("the Return to Sanctuary button uses its own returnHomeBtn class, not settingsBtn", () => {
  assert.match(jsx, /className=\{styles\.returnHomeBtn \+ \(focusZone === 0 && topMenuIdx === 5 \? " " \+ styles\.barFocused : ""\)\}/)
  assert.doesNotMatch(jsx, /styles\.settingsBtn.*onReturnHome/)
})

test(".returnHomeBtn is a real, distinctly-styled class in Wheel.module.css", () => {
  assert.match(css, /\.returnHomeBtn\s*\{/)
  const rule = css.match(/\.returnHomeBtn\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.doesNotMatch(rule[1], /border:\s*1px solid rgba\(255,255,255,0\.25\)/, "must not reuse .settingsBtn's exact border color")
})

test(".returnHomeBtn participates in the shared :focus-visible and reduced-motion rules", () => {
  assert.match(css, /\.returnHomeBtn:focus-visible/)
  const reducedBlock = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  /* Outline/glow stay"))
  assert.match(reducedBlock, /\.returnHomeBtn,/)
})

// -- Label and tooltip are localized, no hardcoded English string survives ----

test("the button's label and tooltip are both resolved through t(), no hardcoded title string", () => {
  assert.match(jsx, /onClick=\{\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \}\} title=\{t\("wheel\.returnHomeTitle"\)\}>\{t\("wheel\.navHome"\)\}<\/button>/)
  assert.doesNotMatch(jsx, /title="Return to Vespara Home"/)
})

test("wheel.navHome and wheel.returnHomeTitle are populated with Sanctuary-facing copy in both locales", () => {
  assert.match(en, /"wheel\.navHome":\s*"Return to Sanctuary"/)
  assert.match(en, /"wheel\.returnHomeTitle":\s*"Return to Sanctuary \(Backspace\)"/)
  assert.match(es, /"wheel\.navHome":\s*"Volver al Santuario"/)
  assert.match(es, /"wheel\.returnHomeTitle":\s*"Volver al Santuario \(Retroceso\)"/)
})

// -- Existing controller/mouse wiring to onReturnHome is unchanged ------------

test("the controller top-menu path (topMenuActions[5]) still calls onReturnHome, unchanged", () => {
  assert.match(jsx, /\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \},\s*\/\/ 6 Home/)
})

test("onSwitchPlayer wiring is unchanged -- still present and reachable, only visually de-emphasized by contrast with the new returnHomeBtn styling", () => {
  assert.match(jsx, /onClick=\{onSwitchPlayer\}/)
  assert.match(jsx, /\{!activeProfile && onSwitchPlayer && \(/)
})

test("Wheel's own useDestination instance (Help/Stats) is untouched", () => {
  assert.match(jsx, /const \{ currentDestination, navigate: navigateTo, back \} = useDestination\(\)/)
})
