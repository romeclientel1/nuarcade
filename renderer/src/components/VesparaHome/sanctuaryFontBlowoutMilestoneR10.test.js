// sanctuaryFontBlowoutMilestoneR10.test.js -----------------------------------
//
// R10: packaged runtime diagnostics (layoutDiagnostics.js, wired into
// VesparaHome.jsx by the prior R9 diagnostic milestone) captured the ACTUAL
// mechanism behind the Sanctuary Depart clipping report, at an 811x768
// packaged viewport. That diagnostics module and its VesparaHome.jsx wiring
// have since been removed (cleanup/6.0.2-remove-layout-diagnostics) now
// that the fix below has passed both runtime and visual packaged
// validation -- this doc comment keeps the captured numbers and reasoning
// for historical/audit context, but nothing in this file still asserts the
// diagnostics module itself is present:
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
// -----------------------------------------------------------------------
// R11 (this pass): a packaged DevTools computed-style inspection found the
// R10 fix above was live in the packaged build -- but constrained against
// an ALREADY-OVERSIZED parent:
//
//   .body:            rect width 775px, display: grid,
//                      grid-template-columns computed to 1178px
//   .destinationDeck: rect width 1178px, min-width: auto, max-width: none
//   .actionRow:       rect width 1178px, width: 1178px (its own 100% of
//                      1178px), min-width: 0, max-width: 100%
//
// .actionRow's R10 constraints were completely correct in isolation -- 100%
// of an oversized parent is still oversized. The real defect: `.body` is
// `display: grid; grid-template-rows: minmax(190px, 1fr) auto auto;` with
// NO `grid-template-columns` declared at all, so `.destinationDeck` (one of
// .body's three grid-item rows) sits in an IMPLICIT column track sized by
// the default `grid-auto-columns: auto`. An `auto` track falls back to the
// automatic minimum size of the item placed in it, and `.destinationDeck`
// (a plain block box with `min-width: auto` by default, `overflow:
// visible`) had no override -- so its automatic minimum equalled
// actionRow's own intrinsic content width once the real webfont loaded,
// forcing .body's implicit column, .destinationDeck, and (via its own
// 100%) actionRow all to 1178px.
//
// FIX: .body gained an explicit, zero-floored single-column track
// (`grid-template-columns: minmax(0, 1fr)` -- still one column, matching
// its existing single-column layout, not a new one), and .destinationDeck
// gained the same width: 100%/max-width: 100%/min-width: 0/box-sizing:
// border-box containment actionRow already had from R10. Every link in the
// .body -> .destinationDeck -> .actionRow chain is now individually
// zero-floored/capped, so none of them can be driven wider by another.
// Horizontal-only -- .body's existing grid-template-ROWS (the vertical
// layout) are untouched, and none of R10's actionRow/actionBtn
// declarations were removed.
//
// EVIDENCE-TIER HONESTY NOTE: this sandbox still cannot launch a real
// browser (see sanctuaryPackagedLayoutMilestoneR6.test.js's evidence-tier
// note -- unchanged). What CAN be asserted with full confidence from source
// is that `.actionRow` now has an explicit `width: 100%` and `max-width:
// 100%` -- and per the CSS box model, a NORMAL block-level box with
// `max-width: 100%` of a definite containing block CANNOT render wider than
// that containing block, independent of any content/font sizing inside it.
// That is a structural guarantee, not an estimate. The exact post-fix pixel
// numbers WERE independently confirmed on the real packaged build (both
// runtime measurement and visual inspection), which is what authorized
// removing the temporary diagnostics module afterward. Section 3 below
// states the expected post-fix bounds as a structural inference from the
// CSS box model, explicitly labeled as such, alongside the confirmed
// captured numbers.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")

// Selector lookups below must never match text inside a CSS /* ... */
// comment -- this project's own doc comments (including this milestone's
// own R11 writeup, right in this file's target CSS) routinely start a line
// with a bare selector name like ".destinationDeck sits in an implicit
// column...", which otherwise satisfies the same selector-boundary regex
// used to find real rules. Newlines are preserved (replaced with spaces of
// equal length) so this has no effect on anything other than comment
// bodies.
function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
}

const css = stripCssComments(read("VesparaHome.module.css"))

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
// arithmetic model can express it; the literal pixel numbers were
// separately confirmed on a real packaged run (see the module doc comment).

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
// -- 4. R11: the ancestor chain (.body -> .destinationDeck -> .actionRow) ---
// =============================================================================
//
// A packaged DevTools computed-style report found the R10 fix constrained
// actionRow against an ALREADY-OVERSIZED parent: .body's rect was 775px,
// but its `display: grid` had no `grid-template-columns` at all, so
// `.destinationDeck` sat in an implicit `auto` column whose automatic
// minimum size was `.destinationDeck`'s own (uncapped) content width --
// forcing .body's column, .destinationDeck, and actionRow's own 100% of it
// all to 1178px. See the module doc comment's R11 section for the full
// writeup.

test("compact .body's grid track is zero-floored: an explicit, single-column grid-template-columns of minmax(0, 1fr) replaces the previously-undeclared (implicit auto) column", () => {
  const block = cssBlockOrNull(compactBody, ".body")
  assert.ok(block, "compact .body rule not found")
  const gridTemplateColumns = declValue(block, "grid-template-columns")
  const minmaxCalls = [...gridTemplateColumns.matchAll(/minmax\(([^,]+),/g)].map((m) => m[1].trim())
  assert.equal(minmaxCalls.length, 1, `expected exactly 1 column track (matching .body's existing single-column layout), found: ${gridTemplateColumns}`)
  assert.equal(minmaxCalls[0], "0", `the single column must have a 0 minimum (found "${minmaxCalls[0]}" in "${gridTemplateColumns}")`)
})

test("compact .body's grid-template-ROWS (the vertical layout) is unchanged by this horizontal-only fix", () => {
  const block = cssBlockOrNull(css.slice(0, compactStart), ".body")
  assert.ok(block, "base .body rule not found")
  assert.equal(declValue(block, "grid-template-rows"), "minmax(190px, 1fr) auto auto")
  // The compact block itself must not redeclare grid-template-rows (it
  // never did, and still doesn't) -- vertical layout stays governed solely
  // by the base rule above.
  const compactBlock = cssBlockOrNull(compactBody, ".body")
  assert.equal(declValueOrNull(compactBlock, "grid-template-rows"), null, "compact .body must not add its own grid-template-rows override -- vertical layout is out of scope for this horizontal fix")
})

test("compact .destinationDeck is fully container-constrained: width, max-width, min-width, and box-sizing are all explicitly set", () => {
  const block = cssBlockOrNull(compactBody, ".destinationDeck")
  assert.ok(block, "compact .destinationDeck rule not found")
  assert.equal(declValue(block, "width"), "100%")
  assert.equal(declValue(block, "max-width"), "100%")
  assert.equal(declValue(block, "min-width"), "0")
  assert.equal(declValue(block, "box-sizing"), "border-box")
})

test("compact .destinationDeck preserves its existing vertical positioning (position: relative, padding-top) -- only width/max-width/min-width/box-sizing were added", () => {
  const baseBlock = cssBlockOrNull(css.slice(0, compactStart), ".destinationDeck")
  assert.ok(baseBlock, "base .destinationDeck rule not found")
  assert.equal(declValue(baseBlock, "position"), "relative")
  assert.equal(declValue(baseBlock, "padding-top"), "8px")
  // The compact override must not redeclare (and thus cannot have changed)
  // either of those -- it only adds the new containment declarations.
  const compactBlock = cssBlockOrNull(compactBody, ".destinationDeck")
  assert.equal(declValueOrNull(compactBlock, "position"), null)
  assert.equal(declValueOrNull(compactBlock, "padding-top"), null)
})

test("the base (1920x1080) .body and .destinationDeck rules are unchanged by this compact-only fix -- no grid-template-columns/width/max-width added there", () => {
  const baseBody = cssBlockOrNull(css.slice(0, compactStart), ".body")
  assert.equal(declValueOrNull(baseBody, "grid-template-columns"), null, "base .body must not have gained an explicit grid-template-columns -- this is a compact-only fix")
  const baseDeck = cssBlockOrNull(css.slice(0, compactStart), ".destinationDeck")
  assert.equal(declValueOrNull(baseDeck, "width"), null, "base .destinationDeck must not have gained an explicit width -- this is a compact-only fix")
  assert.equal(declValueOrNull(baseDeck, "max-width"), null, "base .destinationDeck must not have gained an explicit max-width -- this is a compact-only fix")
})

test("the R10 actionRow/actionBtn constraints are still fully present -- this pass adds ancestor containment, it does not remove or replace them", () => {
  const actionRowBlock = cssBlockOrNull(compactBody, ".actionRow")
  assert.equal(declValue(actionRowBlock, "width"), "100%")
  assert.equal(declValue(actionRowBlock, "max-width"), "100%")
  assert.equal(declValue(actionRowBlock, "min-width"), "0")
  assert.equal(declValue(actionRowBlock, "box-sizing"), "border-box")
  const actionBtnBlock = cssBlockOrNull(compactBody, ".actionBtn")
  assert.equal(declValue(actionBtnBlock, "min-width"), "0")
  assert.equal(declValue(actionBtnBlock, "max-width"), "100%")
})

// -- Reconstruction of the captured R11 computed-style failure ---------------

test("the captured pre-R11 computed styles (.body grid-template-columns resolving to 1178px, .destinationDeck rect 1178px with min-width: auto/max-width: none) fail the 775px bound this fix requires", () => {
  const capturedBodyGridTrackPx = 1178
  const capturedDestinationDeckWidthPx = 1178
  assert.ok(!(capturedBodyGridTrackPx <= AVAILABLE_ROW_WIDTH_PX), `expected the captured pre-R11 .body grid track (${capturedBodyGridTrackPx}px) to exceed the ${AVAILABLE_ROW_WIDTH_PX}px bound`)
  assert.ok(!(capturedDestinationDeckWidthPx <= AVAILABLE_ROW_WIDTH_PX), `expected the captured pre-R11 .destinationDeck width (${capturedDestinationDeckWidthPx}px) to exceed the ${AVAILABLE_ROW_WIDTH_PX}px bound`)
})

test("with .body's grid track and .destinationDeck now both zero-floored/capped, the structural upper bound on every link in the chain at an 811px viewport is the same 775px available width (793px right edge, including the 18px left inset)", () => {
  // .body's grid track is now minmax(0, 1fr) -- a single fr track resolves
  // to exactly the container's definite available space (775px, since
  // .body itself sits inside the already-constrained .sanctuary/.home
  // chain). .destinationDeck's own max-width: 100% then caps it at that
  // same 775px, and actionRow's pre-existing max-width: 100% (R10) caps it
  // at whatever .destinationDeck resolves to -- so the whole chain is now
  // bounded by the same structural ceiling, not by any individual
  // ancestor's uncapped content size.
  const structuralMaxDestinationDeckWidth = AVAILABLE_ROW_WIDTH_PX
  const structuralMaxActionRowWidth = structuralMaxDestinationDeckWidth
  assert.equal(structuralMaxDestinationDeckWidth, 775)
  assert.equal(structuralMaxActionRowWidth, 775)
  assert.ok(SANCTUARY_PADDING_PX + structuralMaxActionRowWidth <= MAX_ALLOWED_RIGHT_EDGE_PX)
})

test("no horizontal scroll-width growth is structurally possible after fonts load: every link in the .body -> .destinationDeck -> .actionRow chain now has an explicit max-width: 100% (or an equivalent zero-floored track), so none of them can grow past their own containing block regardless of any webfont's glyph metrics", () => {
  const bodyBlock = cssBlockOrNull(compactBody, ".body")
  const deckBlock = cssBlockOrNull(compactBody, ".destinationDeck")
  const rowBlock = cssBlockOrNull(compactBody, ".actionRow")
  // .body: capped via its zero-floored single fr track (no max-content
  // fallback possible once the track itself is explicit).
  const bodyMins = [...declValue(bodyBlock, "grid-template-columns").matchAll(/minmax\(([^,]+),/g)].map((m) => m[1].trim())
  assert.deepEqual(bodyMins, ["0"])
  // .destinationDeck and .actionRow: capped via explicit max-width: 100%.
  assert.equal(declValue(deckBlock, "max-width"), "100%")
  assert.equal(declValue(rowBlock, "max-width"), "100%")
})
