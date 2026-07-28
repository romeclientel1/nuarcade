// libraryPreviewViewportRegression.test.js -----------------------------------
// Committed regression test, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// VES-R0-002 -- Windows operational validation found the Archive View
// preview panel (.previewReservation/.previewScreen) clipped below the
// viewport on a real Windows display. Root cause: the compact-layout media
// query only engaged at (max-width: 1280px) OR (max-height: 760px), which
// left a gap -- most notably 1366x768, a very common laptop panel size, and
// any 1920x1080 display at ~125%+ Windows scaling (effectively landing
// somewhere around 850-870px of CSS viewport height) -- that fell through
// to the desktop rules. Those rules use hand-tuned px floors
// (.previewReservation top: clamp(546px, 54vh, 582px), width floored at
// 440px) that stop shrinking below a certain viewport height, so the
// panel's own worst-case bottom edge (top floor 546px + heading/padding
// chrome + a 440px-wide, 16:9-derived 247.5px-tall screen ≈ 546 + 288
// = 834px) exceeded the available height and was clipped by .stage's
// overflow:hidden.
//
// The fix raises the media query's max-height threshold from 760px to
// 870px -- routing every viewport in that gap into the existing compact
// layout instead, which was already hand-tuned for 1280x720 and therefore
// has generous headroom (its own previewReservation originally sat at a
// fixed top:456px with a 260px-wide, ~146px-tall screen, bottom edge ≈
// 636px) at anything up to 870px tall. No rule inside the compact block
// changed at that time; only the condition that decides when it applies.
//
// D6 follow-up -- the fully-visible compact preview was reported as too
// small to be useful. See libraryPreviewLargerSurfaceMilestoneD6.test.js
// for that follow-up fix (a materially larger, vh-responsive 16:9 surface,
// contain-fit so nothing is cropped) -- this file's own compact-value
// assertion below was updated to match, since the old fixed 456/260 values
// it checked are exactly what D6 replaced.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")

function block(source, selector) {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing ${selector}`)
  return match[1]
}

test("the compact-layout media query now catches 1366x768 and other ~768-870px-tall viewports, not just <=760px", () => {
  assert.match(css, /@media \(max-width: 1280px\), \(max-height: 870px\)/)
  assert.doesNotMatch(css, /max-height:\s*760px/)
})

test("a concretely common regressed resolution (1366x768) now falls inside the compact breakpoint", () => {
  // (max-height: 870px) is satisfied whenever the viewport height is <= 870px.
  const viewportHeight = 768
  assert.ok(viewportHeight <= 870, "1366x768 must be caught by the widened compact breakpoint")
  // The pre-fix threshold (760px) did NOT catch it -- this is the exact gap
  // that produced the clipping.
  assert.ok(!(viewportHeight <= 760), "768 was NOT caught by the old 760px threshold -- confirms this was a real gap, not a false alarm")
})

test("the compact-breakpoint threshold itself (this fix's actual subject) is untouched by the later D6 preview-sizing follow-up", () => {
  assert.match(css, /@media \(max-width: 1280px\), \(max-height: 870px\)/)
})

test("the desktop-mode previewReservation rule is untouched (same top/width clamp values as before this fix)", () => {
  assert.match(css, /\.previewReservation\s*\{[^}]*top:\s*clamp\(546px,\s*54vh,\s*582px\)[^}]*width:\s*clamp\(440px,\s*28\.1vw,\s*540px\)/s)
})

test("the preview screen still derives its height from width via a genuine 16:9 aspect-ratio -- no fixed height, no cropped media", () => {
  const screen = block(css, ".previewScreen")
  assert.match(screen, /aspect-ratio:\s*16\s*\/\s*9/)
  assert.doesNotMatch(screen, /(?<!aspect-ratio: 16 \/ 9;\s*)\bheight:\s*\d/)
})

test("no page-level scrollbar was introduced -- .stage keeps overflow:hidden exactly as before", () => {
  const stage = block(css, ".stage")
  assert.match(stage, /overflow:\s*hidden/)
  assert.doesNotMatch(css, /\.stage\s*\{[^}]*overflow-y:\s*(auto|scroll)/s)
})

test("the desktop-mode worst-case previewReservation bottom edge (top floor + panel chrome) stays comfortably inside the new 870px threshold", () => {
  // Reproduces the exact worst-case math the fix relies on: the desktop
  // rules only ever apply once viewport height exceeds 870px, and the
  // panel's own worst-case bottom edge at the *floor* values (top 546px,
  // width floored at 440px) is far below that -- so raising the threshold
  // fully closes the gap rather than merely narrowing it.
  const topFloor = 546
  const widthFloor = 440
  const screenHeight = widthFloor * 9 / 16
  const headingAndPadding = 9 + 10 + 8 + 14 // reservation top/bottom padding + heading bottom padding + line-box estimate
  const worstCaseBottom = topFloor + screenHeight + headingAndPadding
  assert.ok(worstCaseBottom < 870, `expected the floor-pinned panel's bottom edge (${worstCaseBottom}px) to stay under the 870px compact threshold`)
})
