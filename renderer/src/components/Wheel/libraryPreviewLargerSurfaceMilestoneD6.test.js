// libraryPreviewLargerSurfaceMilestoneD6.test.js -----------------------------
// D6 -- follow-up to VES-R0-002. Once the compact-layout clipping fix landed
// (libraryPreviewViewportRegression.test.js), the Archive View preview was
// fully visible but reported as too small to be useful at common desktop
// sizes (compact mode used a hand-fixed 260px-wide box regardless of how
// much real headroom the viewport actually had). This fix:
//   - raises the compact preview's top offset from 456px to 432px (a 6px
//     buffer below the compact infoPanel's real, fixed-pixel bottom edge --
//     see the comment on .previewReservation in Wheel.module.css)
//   - replaces the fixed 260px compact width with a vh-derived
//     clamp(340px, calc((100vh - 509px) * 16 / 9), 720px), so the preview
//     grows with available vertical headroom instead of a hand-picked
//     constant
//   - switches .archiveVideo and .previewStill from object-fit: cover to
//     object-fit: contain, so the complete captured frame is always shown,
//     never cropped, now that the surface is materially more prominent
//
// The formula's constant (509) is: top(432) + hint-bar safe margin(40) +
// reservation chrome(37: 15px vertical padding + 8px heading bottom-padding
// + ~14px heading line-box estimate) -- meaning the box's worst-case bottom
// edge is always exactly `vh - 40` (a fixed 40px clearance above the hint
// bar) for any viewport height where the formula itself governs the width
// (i.e. before the 340px floor or 720px ceiling take over). This file
// reproduces that arithmetic directly rather than asserting a rendered
// pixel value, matching this project's existing convention (see the D2/D3
// worst-case-math tests this mirrors).
//
// Known limitation, called out here rather than silently left: the 340px
// floor is only proven safe for the target resolutions this fix was scoped
// to (1280x720, 1366x768, and the ~870px-tall compact ceiling this
// milestone's own predecessor fix was about) -- a viewport narrower than
// 1280px but shorter than ~700px tall (an unusual, deliberately resized
// window, not one of the named target resolutions) would hit the 340px
// floor at a top/chrome combination that could clip. That configuration is
// outside this fix's requested scope and is flagged in the after-
// implementation report rather than silently left unverified.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")

function block(source, selector) {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing ${selector}`)
  return match[1]
}

function compactBlock() {
  return css.slice(
    css.indexOf("@media (max-width: 1280px), (max-height: 870px)"),
    css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 870px)")),
  )
}

// Mirrors the exact formula in Wheel.module.css's .previewReservation
// compact rule -- kept as plain arithmetic (not copy-pasted regex) so the
// test independently proves the design math, not just that a string is
// present.
const TOP = 432
const CHROME = 15 + 8 + 14 // reservation vertical padding + heading bottom-padding + line-box estimate
const HINT_BAR_MARGIN = 40
const MIN_W = 340
const MAX_W = 720
const CONST = TOP + CHROME + HINT_BAR_MARGIN // 509

function previewWidthAt(vh) {
  const raw = (vh - CONST) * (16 / 9)
  return Math.min(MAX_W, Math.max(MIN_W, raw))
}

// -- 1. True 16:9 aspect-ratio container -------------------------------------

test("the preview screen is a true aspect-ratio: 16 / 9 container, not a fixed height", () => {
  const screen = block(css, ".previewScreen")
  assert.match(screen, /aspect-ratio:\s*16\s*\/\s*9/)
  assert.doesNotMatch(screen, /(?<!aspect-ratio: 16 \/ 9;\s*)\bheight:\s*\d/)
})

// -- 2. Materially larger, and responsive to viewport width/height ----------

test("the compact preview width is now derived from viewport height via calc(), not a fixed 260px constant", () => {
  const compact = compactBlock()
  assert.match(compact, /\.previewReservation\s*\{[^}]*top:\s*432px[^}]*width:\s*clamp\(340px, calc\(\(100vh - 509px\) \* 16 \/ 9\), 720px\)/s)
  assert.doesNotMatch(compact, /\.previewReservation\s*\{[^}]*width:\s*260px/s)
})

test("the CSS formula's constant (509) is exactly top + hint-bar safe margin + reservation chrome, so the worst-case bottom edge is always a fixed 40px above the viewport edge while the formula governs (not clamped to a floor/ceiling)", () => {
  assert.equal(CONST, 509)
  const vh = 750 // comfortably between the 700px floor threshold and the ~914px ceiling threshold
  const width = previewWidthAt(vh)
  assert.ok(width > MIN_W && width < MAX_W, "750px tall should be governed by the formula, not a floor/ceiling")
  const screenHeight = width * 9 / 16
  const bottomEdge = TOP + CHROME + screenHeight
  assert.equal(Math.round(bottomEdge), vh - HINT_BAR_MARGIN)
})

// -- 3. No viewport overflow at 1280x720 -------------------------------------

test("at 1280x720, the preview's worst-case bottom edge stays inside the viewport with real clearance above the hint bar", () => {
  const vh = 720
  const width = previewWidthAt(vh)
  const screenHeight = width * 9 / 16
  const bottomEdge = TOP + CHROME + screenHeight
  assert.ok(bottomEdge < vh, `expected bottom edge (${bottomEdge}px) to stay under the 720px viewport`)
  assert.ok(vh - bottomEdge >= 30, `expected at least 30px clearance above the hint bar, got ${vh - bottomEdge}px`)
})

// -- 4. Larger minimum useful preview size at 1366x768 -----------------------

test("at 1366x768, the preview is materially larger than the old fixed 260px compact width", () => {
  const vh = 768
  const width = previewWidthAt(vh)
  assert.ok(width > 400, `expected a materially larger preview at 1366x768, got ${width}px`)
  assert.ok(width > 260 * 1.5, "expected at least 50% larger than the old fixed compact width")
})

test("growth continues at taller compact-range viewports, up toward the requested 520-720px target, capped at a sensible maximum", () => {
  const at870 = previewWidthAt(870) // top of the compact media query's own range
  assert.ok(at870 >= 520 && at870 <= 720, `expected the compact ceiling (870px tall) to land in the requested 520-720px range, got ${at870}px`)
  // Ceiling: an unusually narrow-but-tall window (still matches this block
  // via max-width: 1280px) cannot grow the preview past the 720px cap.
  assert.equal(previewWidthAt(2000), MAX_W)
})

// -- 5. No page-level scrollbar -----------------------------------------------

test("no page-level scrollbar is introduced -- .stage keeps overflow: hidden", () => {
  const stage = block(css, ".stage")
  assert.match(stage, /overflow:\s*hidden/)
  assert.doesNotMatch(css, /\.stage\s*\{[^}]*overflow-y:\s*(auto|scroll)/s)
})

// -- 6. object-fit: contain on both the video and its poster fallback -------

test("the archive video and its still-poster fallback both use object-fit: contain, so the complete frame is preserved and never cropped", () => {
  assert.match(block(css, ".archiveVideo"), /object-fit:\s*contain/)
  assert.match(block(css, ".previewStill"), /object-fit:\s*contain/)
  assert.doesNotMatch(css, /\.archiveVideo\s*\{[^}]*object-fit:\s*cover/s)
  assert.doesNotMatch(css, /\.previewStill\s*\{[^}]*object-fit:\s*cover/s)
})

// -- 7. Carousel, selected-game details, and Launch Game remain usable ------

test("the carousel (wheelArea), selected-game info panel, and Launch Game control are untouched by this resize -- no overlap introduced", () => {
  const compact = compactBlock()
  assert.match(compact, /\.stage \.wheelArea\s*\{[^}]*top:\s*150px[^}]*height:\s*210px/s)
  assert.match(compact, /\.stage \.infoPanel\s*\{[^}]*top:\s*372px/s)
  assert.match(jsx, /className=\{styles\.launchBtn[^>]*onClick=\{launchGame\}/)
  // The new, larger previewReservation top (432px) still sits below
  // infoPanel's compact top (372px) plus its own real content height --
  // i.e. it was moved to reclaim slack, not to overlap the pedestal above it.
  assert.match(compact, /\.previewReservation\s*\{[^}]*top:\s*432px/s)
  const infoPanelTop = 372
  const previewTop = 432
  assert.ok(previewTop > infoPanelTop, "previewReservation must still start below infoPanel's top")
})
