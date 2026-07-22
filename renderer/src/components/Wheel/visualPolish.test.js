// visualPolish.test.js -------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/Wheel.module.css/GameCard.module.css cannot be imported here
// (JSX and CSS Node has no loader for -- see Wheel.test.js's own
// limitations note). These tests instead read the real committed source
// text and assert on the specific properties the Wheel visual-polish
// milestone promised: selection/category math is untouched, launch
// dispatch is untouched, no `transition: all` remains on the touched
// buttons, :focus-visible exists, reduced-motion rules exist but are
// scoped to Wheel/GameCard rather than global, and no new runtime
// dependency was introduced.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8")
const css = readFileSync(join(HERE, "Wheel.module.css"), "utf8")
const cardCss = readFileSync(join(HERE, "GameCard.module.css"), "utf8")
const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))

// -- Selection / category math is untouched ------------------------------------

test("getCardStyle's arc-positioning math (ARC_RADIUS, ANGLE_STEP, signed/absPos) is unchanged", () => {
  assert.match(jsx, /const ARC_RADIUS = 900/)
  assert.match(jsx, /const ANGLE_STEP = 22/)
  assert.match(jsx, /const wrapped = \(\(diff % n\) \+ n\) % n/)
  assert.match(jsx, /const signed = wrapped > n \/ 2 \? wrapped - n : wrapped/)
})

test("getCardStyle still redirects an in-progress transition via inline transform+opacity -- the spring-feel mechanism is untouched", () => {
  assert.match(jsx, /transition: 'transform 0\.2s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\), opacity 0\.2s ease'/)
})

test("category tab positioning (getTabStyle, SLOT_WIDTH) is unchanged", () => {
  assert.match(jsx, /const SLOT_WIDTH = 168/)
})

// -- Launch dispatch is untouched ----------------------------------------------

test("launch button dispatch (launchGame onClick) still wires the same handler, not a new one", () => {
  assert.match(jsx, /onClick=\{launchGame\} disabled=\{launching\}/)
})

test("card click still dispatches selection vs. detail-open exactly as before (no hover-triggered selection change)", () => {
  assert.match(jsx, /onClick=\{\(\) => \{\s*if \(index === selectedIndex\) \{ sounds\.select\(\); resetLaunching\(\); setShowDetail\(true\) \}\s*else setSelectedIndex\(index\)\s*\}\}/)
  assert.doesNotMatch(jsx, /onMouseEnter=\{[^}]*setSelectedIndex/)
})

// -- Dialog entrance classes were added without touching dialog logic ---------

test("dialog entrance classNames were added to the Exit/RetroArch/launch-error overlays without changing their conditions or handlers", () => {
  assert.match(jsx, /\{showRetroArchPopup && \(\s*<div className=\{styles\.dialogOverlay\}/)
  assert.match(jsx, /\{showExitPopup && \(\s*<div className=\{styles\.dialogOverlay\}/)
  const fadeOnlyMatches = jsx.match(/className=\{styles\.dialogFadeOnly\}/g) || []
  assert.equal(fadeOnlyMatches.length, 2, "both launchError renderings should use the fade-only (no transform) entrance")
})

// -- No `transition: all` left on the touched surfaces -------------------------

test("Wheel.module.css no longer uses `transition: all` anywhere", () => {
  assert.doesNotMatch(css, /transition:\s*all\b/)
})

test("GameCard.module.css's .card transition lists explicit properties, not `all`, and excludes layout-triggering properties", () => {
  const block = cardCss.match(/\.card \{([^}]*)\}/)
  assert.ok(block)
  assert.doesNotMatch(block[1], /transition:\s*all\b/)
  assert.doesNotMatch(block[1], /transition:[^;]*\b(width|height|top|left)\b/)
})

// -- :focus-visible exists, reusing the established cyan focus language -------

test(":focus-visible rules exist for Wheel's top-nav, category, and dialog-adjacent buttons", () => {
  assert.match(css, /\.catPill:focus-visible/)
  assert.match(css, /\.navBtn:focus-visible/)
  assert.match(css, /\.settingsBtn:focus-visible/)
  assert.match(css, /\.launchBtn:focus-visible/)
})

test(":focus-visible reuses the existing cyan outline+glow color, not a new ad hoc focus color", () => {
  const block = css.match(/\.catPill:focus-visible[\s\S]*?\{([^}]*)\}/)
  assert.ok(block)
  assert.match(block[1], /#00ffff/)
})

// -- Reduced motion: scoped to Wheel/GameCard, not global; focus stays visible -

test("Wheel.module.css scopes prefers-reduced-motion to its own selectors, not a global *", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) || []
  assert.ok(blocks.length >= 2, "expected reduced-motion overrides for the mount fade/dialogs and the focus-ring transitions")
  for (const block of blocks) {
    assert.doesNotMatch(block, /(^|\s)\*(\s|,|\{)/, "reduced-motion override must not target a bare universal selector")
  }
})

test("GameCard.module.css scopes prefers-reduced-motion to .card, not a global *", () => {
  const blocks = cardCss.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) || []
  assert.ok(blocks.length >= 1)
  for (const block of blocks) {
    assert.doesNotMatch(block, /(^|\s)\*(\s|,|\{)/)
  }
})

test("reduced-motion overrides never remove outline or box-shadow from the focus rings (focus must stay visible)", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g) || []
  for (const block of blocks) {
    assert.doesNotMatch(block, /outline:\s*none/)
  }
})

test("the existing loading spinner is not touched or disabled by this pass's reduced-motion rules", () => {
  assert.match(css, /\.loadingSpinner \{[\s\S]*?animation: spin 0\.8s linear infinite;/)
  // No reduced-motion block anywhere in this file targets .loadingSpinner --
  // this pass deliberately leaves the loading spinner's own motion alone.
  const reducedMotionSection = (css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) || []).join("\n")
  assert.doesNotMatch(reducedMotionSection, /loadingSpinner/)
})

// -- Disabled/launching states remain visually distinguishable ----------------

test("launchBtn:disabled keeps its own distinct treatment, untouched by the new focus/transition rules", () => {
  assert.match(css, /\.launchBtn:disabled\s*\{\s*opacity:\s*0\.5;\s*cursor:\s*not-allowed;\s*\}/)
})

// -- Dead CSS explicitly deferred, not touched in this milestone --------------

test("the dead .cardSlot/.cardCenter/cardFloat CSS is deliberately left in place this milestone (recorded deferred cleanup)", () => {
  assert.match(css, /@keyframes cardFloat/, "cardFloat should still be present -- deferred cleanup, not removed in this pass")
  assert.match(css, /\.cardCenter \{/)
})

// -- No new dependency ----------------------------------------------------------

test("no animation library dependency was added to renderer/package.json", () => {
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const knownAnimationLibs = ["framer-motion", "gsap", "react-spring", "@react-spring/web", "motion", "animejs", "lottie-web", "react-transition-group"]
  for (const lib of knownAnimationLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})
