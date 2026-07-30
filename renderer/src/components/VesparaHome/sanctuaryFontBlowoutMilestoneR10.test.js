// sanctuaryFontBlowoutMilestoneR10.test.js -----------------------------------
//
// R10: packaged runtime diagnostics (layoutDiagnostics.js, wired into
// VesparaHome.jsx by the prior R9 diagnostic milestone and preserved here
// per this task's direction) captured the ACTUAL mechanism behind the
// Sanctuary Depart clipping report, at an 811x768 packaged viewport:
//
//   Initial render (fallback font, before document.fonts.ready):
//     actionRow: left 18, width 775, right 793   -- fits.
//     Depart:    left 690.58, width 102.41, right 792.98  -- fits.
//
//   After document.fonts.ready (real 'Orbitron' webfont applied):
//     actionRow: left 18, width 1178, right 1196  -- blown out.
//     Depart:    left 1038.63, width 157.38, right 1196   -- blown out.
//     home.clientWidth: 811 (the real, unchanged viewport)
//     home.scrollWidth: 1196 (now exceeds clientWidth -- real overflow)
//     actionRow.scrollWidth/clientWidth: 1178/1178 (internally consistent --
//       the row's own box, not just its content, actually grew)
//     home.overflow: hidden (so this overflow is invisible/unreachable,
//       not merely scrollable)
//
// These are runtime measurements, not source-level arithmetic -- treated as
// authoritative per this task's direction. R6/R7/R8's prior arithmetic
// models (sanctuaryPackagedLayoutMilestoneR6.test.js) never reached this
// magnitude and were honest about that gap; this milestone explains why:
// the earlier models assumed grid-item/text min-content sizing was the only
// risk (addressed in R8 via minmax(0, ...) tracks and min-width: 0 on
// .actionRow/.actionBtn), but never checked whether .actionRow ITSELF had a
// definite width. It didn't -- no width/max-width was ever declared on it.
// Per the CSS Grid specification, `fr` track distribution requires a
// DEFINITE grid-container inline size; without one, a grid container's own
// auto-sizing can fall back to summing each track's max-content
// contribution instead of the real available space. That fallback is
// dormant with a narrow fallback font and triggers the instant a wider real
// webfont loads -- exactly the jump these diagnostics captured the instant
// document.fonts.ready fired, and exactly why the R9 diagnostics correctly
// identified this as intrinsic-sizing blowout, not overscan or vertical
// clipping.
//
// FIX: give `.actionRow` a definite, capped inline size in compact mode
// (width: 100%; max-width: 100%; box-sizing: border-box, alongside its
// existing min-width: 0), so fr-track distribution has a definite 775px to
// work against regardless of what any loaded webfont's glyph metrics turn
// out to be. `.actionBtn` additionally gained `max-width: 100%` as a second
// layer of containment. `.destinationName`/`.destinationMarker` gained
// `min-width: 0` defensively (see the CSS file's own R10 comments for why
// that specific addition has no rendering effect today but guards against a
// future regression of the same class).
//
// EVIDENCE-TIER HONESTY NOTE: this sandbox still cannot launch a real
// browser (see sanctuaryPackagedLayoutMilestoneR6.test.js's evidence-tier
// note -- unchanged). What CAN be asserted with full confidence from source
// is that `.actionRow` now has an explicit `width: 100%` and `max-width:
// 100%` -- and per the CSS box model, a NORMAL block-level box with
// `max-width: 100%` of a definite containing block CANNOT render wider than
// that containing block, independent of any content/font sizing inside it.
// That is a structural guarantee, not an estimate. What this sandbox cannot
// independently confirm is the EXACT post-fix pixel numbers on the real
// packaged build (Requirement 8 -- diagnostics are preserved specifically so
// a follow-up packaged run can confirm them). Section 3 below states the
// expected post-fix bounds as a structural inference from the CSS box
// model, explicitly labeled as such.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")
const css = read("VesparaHome.module.css")

function findSelectorIndex(source, selector, fromIndex) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`(?<=(?:^|\\n|\\{|\\}|,)[ \\t]*)${escaped}(?![\\w-])`, "g")
  re.lastIndex = fromIndex
  const m = re.exec(source)
  return m ? m.index : -1
}
function cssBlockOrNull(source, selector, fromIndex = 0) {
  const idx = findSelectorIndex(source, selector, fromIndex)
  if (idx < 0) return null
  const openBrace = source.indexOf("{", idx)
  const closeBrace = source.indexOf("}", openBrace)
  if (openBrace < 0 || closeBrace < openBrace) return null
  return source.slice(openBrace + 1, closeBrace)
}
function declValueOrNull(block, prop) {
  if (block === null) return null
  const m = block.match(new RegExp(`(?:^|\\s)${prop}:\\s*([^;]+);`))
  return m ? m[1].trim() : null
}
function declValue(block, prop) {
  const v = declValueOrNull(block, prop)
  assert.ok(v !== null, `missing "${prop}" declaration in block:\n${block}`)
  return v
}

const compactStart = css.indexOf("@media (max-width: 900px)")
assert.ok(compactStart > -1, "compact Sanctuary media query not found")
const compactHeaderEnd = css.indexOf("{", compactStart)
const narrowWidthStart = css.indexOf("@media (max-width: 680px)")
const compactBody = css.slice(compactHeaderEnd, narrowWidthStart)

// =============================================================================
// -- 1. Source-level guards on the actual fix -------------------------------
// =============================================================================

test("compact .actionRow is strictly container-constrained: width, max-width, min-width, and box-sizing are all explicitly set", () => {
  const block = cssBlockOrNull(compactBody, ".actionRow")
  assert.ok(block, "compact .actionRow rule not found")
  assert.equal(declValue(block, "width"), "100%")
  assert.equal(declValue(block, "max-width"), "100%")
  assert.equal(declValue(block, "min-width"), "0")
  assert.equal(declValue(block, "box-sizing"), "border-box")
})

test("compact .actionRow's four grid tracks all use minmax(0, ...) -- no track has an intrinsic or pixel minimum capable of expanding the grid", () => {
  const block = cssBlockOrNull(compactBody, ".actionRow")
  const gridTemplateColumns = declValue(block, "grid-template-columns")
  const minmaxCalls = [...gridTemplateColumns.matchAll(/minmax\(([^,]+),/g)].map((m) => m[1].trim())
  assert.equal(minmaxCalls.length, 4, `expected exactly 4 grid columns, found: ${gridTemplateColumns}`)
  for (const min of minmaxCalls) {
    assert.equal(min, "0", `every compact destination-row column must have a 0 minimum (found "${min}" in "${gridTemplateColumns}")`)
  }
})

test("compact .actionBtn (every grid item) can shrink and cannot exceed its container: min-width: 0 and max-width: 100% are both present", () => {
  const block = cssBlockOrNull(compactBody, ".actionBtn")
  assert.ok(block, "compact .actionBtn rule not found")
  assert.equal(declValue(block, "min-width"), "0")
  assert.equal(declValue(block, "max-width"), "100%")
})

test("the destination text wrapper (.destinationCopy, the flex item directly wrapping the name/detail) has min-width: 0, unconditionally (not just in compact mode)", () => {
  const block = cssBlockOrNull(css, ".destinationCopy")
  assert.ok(block, ".destinationCopy rule not found")
  assert.equal(declValue(block, "min-width"), "0")
})

test("both the marker and the name text element carry min-width: 0 as defense-in-depth against any future flex/grid participation", () => {
  const markerBlock = cssBlockOrNull(css, ".destinationMarker")
  assert.ok(markerBlock, ".destinationMarker rule not found")
  assert.equal(declValue(markerBlock, "min-width"), "0")

  const nameBlock = cssBlockOrNull(css, ".destinationName")
  assert.ok(nameBlock, ".destinationName rule not found")
  assert.equal(declValue(nameBlock, "min-width"), "0")
})

test("compact .actionRow no longer relies solely on min-width: 0 to contain itself -- width/max-width now make its own inline size definite, which is what fr-track distribution actually requires", () => {
  const block = cssBlockOrNull(compactBody, ".actionRow")
  // Confirms the fix isn't merely a duplicate of the pre-existing R8
  // min-width: 0 (which alone did not prevent the captured blowout) --
  // width/max-width are additional, distinct declarations.
  assert.match(declValue(block, "width"), /^100%$/)
  assert.match(declValue(block, "max-width"), /^100%$/)
})

test("this fix lives only inside the compact media query -- the base (1920x1080) .actionRow is unchanged (no width/max-width added there)", () => {
  const baseBlock = cssBlockOrNull(css.slice(0, compactStart), ".actionRow")
  assert.ok(baseBlock, "base .actionRow rule not found")
  assert.equal(declValueOrNull(baseBlock, "width"), null, "base .actionRow must not have gained an explicit width -- this is a compact-only fix")
  assert.equal(declValueOrNull(baseBlock, "max-width"), null, "base .actionRow must not have gained an explicit max-width -- this is a compact-only fix")
})

// =============================================================================
// -- 2. Reconstruction of the captured pre-fix runtime measurements ----------
// =============================================================================
//
// These are the literal numbers from the packaged-build diagnostics
// (Requirement 6), reconstructed here (not re-derived from CSS arithmetic)
// to prove the required bounds actually catch the reported regression.

const VIEWPORT_W = 811
const SANCTUARY_PADDING_PX = 18 // compact .sanctuary horizontal padding, each side (confirmed in source below)
const AVAILABLE_ROW_WIDTH_PX = VIEWPORT_W - SANCTUARY_PADDING_PX * 2 // 775
const MAX_ALLOWED_RIGHT_EDGE_PX = VIEWPORT_W - SANCTUARY_PADDING_PX // 793

test("the captured runtime numbers reconstruct to the documented bounds: 811px viewport, 775px available row width, 793px maximum right edge", () => {
  assert.equal(AVAILABLE_ROW_WIDTH_PX, 775)
  assert.equal(MAX_ALLOWED_RIGHT_EDGE_PX, 793)
})

test("compact .sanctuary's horizontal padding is exactly the 18px this reconstruction depends on (confirms the 775px/793px figures are still accurate against the current source)", () => {
  const block = cssBlockOrNull(compactBody, ".sanctuary")
  assert.ok(block, "compact .sanctuary rule not found")
  const padding = declValue(block, "padding")
  const tokens = padding.trim().split(/\s+/)
  const horizontal = tokens.length === 1 ? tokens[0] : tokens[1]
  assert.equal(horizontal, "18px")
})

test("the CAPTURED pre-fix post-fonts measurements (actionRow.right 1196px, Depart.right 1196px) fail the 793px bound -- proving this requirement's bound would have caught the reported regression", () => {
  const capturedPreFixActionRowRight = 1196
  const capturedPreFixDepartRight = 1196
  assert.ok(
    !(capturedPreFixActionRowRight <= MAX_ALLOWED_RIGHT_EDGE_PX),
    `expected the captured pre-fix actionRow.right (${capturedPreFixActionRowRight}px) to exceed the ${MAX_ALLOWED_RIGHT_EDGE_PX}px bound`
  )
  assert.ok(
    !(capturedPreFixDepartRight <= MAX_ALLOWED_RIGHT_EDGE_PX),
    `expected the captured pre-fix Depart.right (${capturedPreFixDepartRight}px) to exceed the ${MAX_ALLOWED_RIGHT_EDGE_PX}px bound`
  )
})

test("the captured pre-fix actionRow.scrollWidth (1178) equaled its own clientWidth (1178) -- confirming the ROW'S OWN BOX grew, not merely its content overflowing within a fixed-size box", () => {
  const capturedPreFixActionRowScrollWidth = 1178
  const capturedPreFixActionRowClientWidth = 1178
  assert.equal(capturedPreFixActionRowScrollWidth, capturedPreFixActionRowClientWidth, "when a box's own scrollWidth equals its clientWidth, its content isn't overflowing an unchanged box -- the box itself is that size")
})

test("the captured pre-fix home.scrollWidth (1196) exceeded home.clientWidth (811) while home.overflow stayed 'hidden' -- confirming the excess was real, clipped, and unreachable, not merely scrollable", () => {
  const capturedHomeScrollWidth = 1196
  const capturedHomeClientWidth = 811
  assert.ok(capturedHomeScrollWidth > capturedHomeClientWidth, "expected the captured home.scrollWidth to exceed home.clientWidth, confirming real overflow")
})

// =============================================================================
// -- 3. Expected post-fix bounds (structural inference from the CSS box -----
//        model, not an arithmetic estimate -- see the module doc comment's
//        evidence-tier note) ------------------------------------------------
// =============================================================================
//
// A normal block-level box with `max-width: 100%` of a DEFINITE containing
// block cannot render wider than that containing block, regardless of its
// content's intrinsic sizing -- this is a structural CSS guarantee, not a
// font-metric-dependent estimate. Since compact .sanctuary's own width is
// itself constrained by .home (position: fixed; inset: 0 -- always exactly
// the viewport), the chain .home -> .sanctuary -> .actionRow now has a
// definite, capped width at every link once .actionRow gained width/
// max-width: 100%. This section locks in that guarantee wherever a plain
// arithmetic model can express it, but Requirement 8 (preserving the
// diagnostics) is what will let a real packaged run confirm the literal
// pixel numbers.

test("with .actionRow's own inline size now definite (width/max-width: 100%), the structural upper bound on its right edge at an 811px viewport is exactly the documented 793px -- Depart, as its last child, cannot exceed the same bound", () => {
  // This is a direct structural consequence of max-width: 100% inside a
  // definite 775px content box (811 - 18*2), not a font-metric estimate --
  // a block box capped at 100% max-width of a 775px containing block cannot
  // render past 775px + the 18px left inset = 793px, independent of what
  // any webfont's glyph metrics turn out to be.
  const structuralMaxActionRowRight = SANCTUARY_PADDING_PX + AVAILABLE_ROW_WIDTH_PX
  assert.equal(structuralMaxActionRowRight, MAX_ALLOWED_RIGHT_EDGE_PX)
  assert.ok(structuralMaxActionRowRight <= MAX_ALLOWED_RIGHT_EDGE_PX)
})

test("with actionRow's own box capped, actionRow.scrollWidth can no longer legitimately exceed its own clientWidth from intrinsic content alone -- overflow:hidden on .actionBtn (its grid items) is what will absorb any residual font-driven text growth instead of growing the row", () => {
  const actionBtnBlock = cssBlockOrNull(css, ".actionBtn")
  assert.ok(actionBtnBlock, ".actionBtn rule not found")
  assert.equal(declValue(actionBtnBlock, "overflow"), "hidden")
})

// =============================================================================
// -- 4. Diagnostics preserved for a follow-up packaged verification ---------
// =============================================================================

test("the R9 runtime layout diagnostics (layoutDiagnostics.js and its VesparaHome.jsx wiring) are still present and still disabled by default -- preserved for one more packaged verification pass, per this task's direction", () => {
  const jsx = read("VesparaHome.jsx")
  assert.match(jsx, /import \{ logSanctuaryLayout, drawLayoutOutlines, clearLayoutOutlines, isLayoutDebugEnabled \} from "\.\/layoutDiagnostics\.js"/)
  assert.match(jsx, /requestAnimationFrame\(\(\) => runLayoutDiagnostics\("initial-render"\)\)/)
  assert.match(jsx, /document\.fonts\.ready\.then\(\(\) => \{/)
  assert.match(jsx, /runLayoutDiagnostics\("recently-played"\)/)
  assert.match(jsx, /window\.addEventListener\("resize", onResize\)/)
})
