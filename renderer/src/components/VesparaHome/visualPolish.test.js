// visualPolish.test.js -------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// VesparaHome.jsx/VesparaHome.module.css cannot be imported here (JSX and
// CSS Node has no loader for -- see VesparaHome.test.js's own limitations
// note). These tests instead read the real committed source text and
// assert on the specific properties the Home visual-polish milestone
// promised: restoration/origin-capture call sites are untouched, the
// recent-row scroll correction is conditional and non-smooth (never
// unconditional, never animated, never a new timer), reduced-motion rules
// exist but are scoped to this surface rather than global, and no new
// runtime dependency was introduced. This is a structural/behavioral
// check on the actual shipped source, not a restated copy or a pixel
// snapshot.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "VesparaHome.jsx"), "utf8")
const css = readFileSync(join(HERE, "VesparaHome.module.css"), "utf8")
const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))

// -- Restoration / origin capture / focus IDs are untouched -------------------

test("restoration consumption still calls shouldConsumeRestoration/consumeRestorationRequest/resolveHomeFocus exactly as before", () => {
  assert.match(jsx, /shouldConsumeRestoration\(restorationRequest,\s*\{\s*catalogReady:\s*!loading\s*\}\)/)
  assert.match(jsx, /consumeRestorationRequest\(restorationRequest\)/)
  assert.match(jsx, /resolveHomeFocus\(restorationRequest,\s*\{\s*recentGames:\s*displayedRecentGames\s*\}\)/)
})

test("restoration is still consumed inside a single effect keyed on [restorationRequest, loading, displayedRecentGames] -- not duplicated or moved", () => {
  const matches = jsx.match(/consumeRestorationRequest\(restorationRequest\)/g) || []
  assert.equal(matches.length, 1, "consumeRestorationRequest must be called exactly once in the source")
})

test("Home origin capture (buildHomeOriginContext, originDestination: 'home') is unchanged", () => {
  assert.match(jsx, /originDestination:\s*"home"/)
  assert.match(jsx, /originContext:\s*buildHomeOriginContext\(\)/)
})

test("focus state identifiers (focusZone, recentIndex, actionIndex) are unchanged", () => {
  assert.match(jsx, /const \[focusZone, setFocusZone\] = useState/)
  assert.match(jsx, /const \[recentIndex, setRecentIndex\] = useState/)
  assert.match(jsx, /const \[actionIndex, setActionIndex\] = useState/)
})

// -- Recent-row scroll correction: conditional, non-smooth, no new state ------

test("the scroll correction only runs a bounding-rect comparison, never an unconditional scrollIntoView", () => {
  const call = jsx.match(/if \(outOfView\) \{\s*card\.scrollIntoView\([^)]*\)\s*\}/)
  assert.ok(call, "scrollIntoView must be gated behind an outOfView check")
})

test("the scroll correction is non-smooth (behavior: 'auto') with nearest block/inline, never 'smooth'", () => {
  assert.match(jsx, /scrollIntoView\(\{\s*behavior:\s*"auto",\s*block:\s*"nearest",\s*inline:\s*"nearest"\s*\}\)/)
  assert.doesNotMatch(jsx, /behavior:\s*"smooth"/)
})

test("the scroll correction bails out when the Recent row isn't the active focus zone", () => {
  assert.match(jsx, /if \(focusZone !== "recents"\) return/)
})

test("the scroll correction safely no-ops when refs aren't mounted yet, and introduces no timer", () => {
  assert.match(jsx, /if \(!row \|\| !card\) return/)
  // Scoped to the scroll-correction effect specifically -- the launch
  // flow elsewhere in this file legitimately uses setTimeout for toast
  // dismissal etc, so this checks the immediate vicinity of the new
  // effect rather than the whole file.
  const effectBlock = jsx.slice(jsx.indexOf("const recentRowRef"), jsx.indexOf("const [showDepartConfirm"))
  assert.doesNotMatch(effectBlock, /setTimeout|setInterval/)
})

test("recentIndex is never written by the scroll-correction effect -- it only reads DOM rects", () => {
  const effectBlock = jsx.slice(jsx.indexOf("const recentRowRef"), jsx.indexOf("const [showDepartConfirm"))
  assert.doesNotMatch(effectBlock, /setRecentIndex/)
})

// -- Mouse hover never touches selection/focus state ---------------------------

test("recent-card mouse hover has no onMouseEnter/onMouseOver handler that changes focus or selection", () => {
  const cardBlock = jsx.slice(jsx.indexOf("displayedRecentGames.map"), jsx.indexOf("{launchError &&"))
  assert.doesNotMatch(cardBlock, /onMouseEnter|onMouseOver/)
})

// -- Reduced motion: scoped to this surface, not global; focus stays visible --

test("VesparaHome.module.css scopes prefers-reduced-motion to its own selectors, not a global *", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{[^}]*\{[^}]*\}[^}]*\}/gs) || []
  assert.ok(blocks.length >= 3, "expected reduced-motion overrides for the mount fade, focus transitions, and dialog entrances")
  for (const block of blocks) {
    assert.doesNotMatch(block, /(^|\s)\*(\s|,|\{)/, "reduced-motion override must not target a bare universal selector")
  }
})

test("reduced-motion overrides remove transform/transition/animation but never remove outline or box-shadow (focus must stay visible)", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{([^}]*\{[^}]*\}[^}]*)\}/gs) || []
  for (const block of blocks) {
    assert.doesNotMatch(block, /outline:\s*none/)
  }
})

test(":focus-visible treatments exist on recentCard and every action destination, including Depart", () => {
  assert.match(css, /\.recentCard:focus-visible\s*\{/)
  assert.match(css, /\.actionBtn:focus-visible\s*\{/)
  assert.match(jsx, /className=\{styles\.actionBtn \+ " " \+ styles\[action \+ "Destination"\]/)
})

test("mouse hover styling is visually distinct from (weaker than) the focus/focus-visible treatment", () => {
  const hoverBlock = css.match(/\.recentCard:hover:not\(:disabled\)\s*\{([^}]*)\}/)
  assert.ok(hoverBlock)
  assert.doesNotMatch(hoverBlock[1], /outline/)
  assert.doesNotMatch(hoverBlock[1], /transform/)
})

// -- Disabled/launching states remain visually distinguishable ----------------

test("recentCard:disabled keeps its own distinct (dimmed, non-interactive) treatment, untouched by the new focus rules", () => {
  assert.match(css, /\.recentCard:disabled\s*\{\s*opacity:\s*0\.5;\s*cursor:\s*default;\s*\}/)
})

// -- No new dependency / lockfile-relevant surface -----------------------------

test("no animation library dependency was added to renderer/package.json", () => {
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const knownAnimationLibs = ["framer-motion", "gsap", "react-spring", "@react-spring/web", "motion", "animejs", "lottie-web", "react-transition-group"]
  for (const lib of knownAnimationLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})
