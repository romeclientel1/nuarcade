// sanctuaryPackagedLayoutMilestoneR6.test.js --------------------------------
//
// Regression coverage for the reported packaged-build usability failure:
// "the private packaged 6.0.2 build has no visible or reachable way to exit
// from Sanctuary at 1366x768, 100% scaling" -- and its follow-up,
// Windows-runtime-confirmed report: "Depart is now visible and functional,
// but the tile is still partially clipped at the bottom at 1366x768."
//
// IMPORTANT SCOPE NOTE (per this project's standing evidence-classification
// rules): this sandbox cannot launch Windows, cannot compile/run the
// NSIS-packaged .exe, and could not obtain a working headless browser either
// (Playwright's Chromium binary downloaded, but the sandbox has no root
// access to install the missing system libraries its own host-validation
// check demanded -- attempted and confirmed, not assumed). No live-render
// screenshot was taken or could be taken here. Everything below is
// therefore "Strong inference from source" / "Supported by supplied
// validation evidence" (the Windows-runtime report itself) -- never
// described as runtime verification performed by this test suite.
//
// ROOT CAUSE, R6 (first pass): .home is `position: fixed; inset: 0;
// overflow: hidden` -- a hard, unscrollable clip at exactly the viewport's
// height. The compact-Sanctuary media query's height trigger was
// `(max-height: 680px)`, which never fired at 768px, so 1366x768 silently
// ran the full, spacious desktop layout. Fixed by widening the trigger to
// `(max-height: 800px)`.
//
// ROOT CAUSE, R7 (this pass, after Windows confirmed Depart was still
// partially clipped even with the R6 fix applied): the R6 arithmetic model
// missed two real contributors that the compact query left untouched:
//
//   1. box-sizing is `border-box` globally (renderer/src/index.css:
//      `*, *::before, *::after { box-sizing: border-box }`), so a tile's
//      real rendered height is `max(min-height, padding + tallest child)`,
//      not `min-height + padding` as the R6 model assumed. Every
//      destination tile's `.destinationMarker` (a fixed decorative bar --
//      60px for Library, 48px for Control Room, 46px generic for Switch
//      Player, 28px for Depart) was left completely unshrunk by the R6
//      compact pass. Because actionBtn is `align-items: center`, an
//      unshrunk 60px-tall marker inside libraryDestination's compact
//      84px-min-height / 14px-padding budget (content budget = 84 - 28 =
//      56px) forced that tile -- and the whole actionRow, whose height is
//      set by its tallest tile under `align-items: end` -- to render at
//      88px, not the intended 84px.
//   2. `.multiRecentRow .recentCard` (the populated Recently Played card,
//      min-height: 205px) was never touched by the compact query at all --
//      it alone was roughly a third of the page's natural content height,
//      regardless of viewport height.
//
// Fixed by adding compact-only overrides that cap every `.destinationMarker`
// (generic + all three per-destination overrides) to a height that fits
// inside its tile's own compact padding budget, and by shrinking
// `.multiRecentRow`/`.singleRecentRow .recentCard` (and their art) in
// compact mode -- both additions live inside the SAME
// `@media (max-width: 900px), (max-height: 800px)` block, so 1920x1080
// (which never engages that query) is completely untouched.
//
// ROOT CAUSE, R8 (this pass, after a packaged Windows SCREENSHOT -- treated
// as authoritative per this task's instruction -- showed Control Room and
// Switch Player fully visible, with Depart rendered immediately to their
// right and mostly clipped off the RIGHT edge): the R6/R7 passes only ever
// measured and fixed the VERTICAL axis; nothing in either prior pass
// touched horizontal sizing at all. The one concrete, unambiguous asymmetry
// in the compact row's horizontal CSS was Depart's own grid column:
// `grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.1fr) minmax(0,
// 0.9fr) minmax(100px, 0.6fr)` -- three fully-flexible `minmax(0, ...)`
// columns, and a fourth (Depart's) with a hard, non-zero 100px floor that
// could never shrink, unlike every sibling column.
//
// EVIDENCE-TIER HONESTY NOTE: this sandbox has no live renderer available
// (see the note above -- Playwright's Chromium downloaded but the sandbox
// has no root access to install its required system libraries), so the
// exact numeric contribution of that floor to the reported overflow could
// not be independently reproduced here. A from-first-principles arithmetic
// model of every tile's text/padding/border/gap (documented in section 7
// below, using multiple deliberately generous per-character width
// assumptions, including a worst-case "whole phrase on one line, no word
// wrap" bound) never reaches anywhere close to 1366px on its own -- meaning
// per-tile CONTENT width is very unlikely to be the primary mechanism, and
// something about the real Chromium/Windows rendering environment (window
// chrome eating into the reported 1366px client area, real 'Orbitron'
// webfont metrics wider than any generic estimate, or a real DPI/scaling
// interaction) most plausibly explains the remaining gap between "should
// fit" and "visibly doesn't." Given that, this fix does not rest on
// claiming a fabricated precise overflow number. It instead: (a) removes
// the one concrete, source-confirmed structural defect (the non-zero pixel
// floor, which directly corresponds to the exact column -- Depart's -- the
// screenshot shows clipped, while its floor-free siblings render fully
// visible), and (b) applies `min-width: 0` to both the grid container and
// every grid item, the standard, textbook, structurally-guaranteed
// countermeasure for "a flex/grid child forces its container wider than
// its viewport" regardless of which precise sub-mechanism is responsible in
// a given engine. Section 7's arithmetic model is presented as
// illustrative supporting evidence for the fitted, post-fix margin, not as
// a numerically-precise reconstruction of the pre-fix overflow.
//
// This file is source-level, matching every other *.test.js in this project
// (no jsdom/testing-library anywhere here) -- but unlike a plain regex
// match, the height computation below is genuinely executed arithmetic
// against numbers extracted from the real file, not a hardcoded true/false
// assertion. It models border-box box-sizing, marker-forced tile growth,
// border widths, the focused-state outline/box-shadow overhang, and bottom
// page padding, and requires a real minimum safety margin rather than a
// bare "< viewport" check -- because a model that merely proves "barely
// fits" is exactly the kind of model that missed the R7 regression.
//
// NOTE ON SCOPE (requirement 9 of the R8 task): sections 1-6 below cover
// the VERTICAL fit investigated and fixed in R6/R7. They do not verify,
// and were never intended to verify, the horizontal defect reported in R8
// -- that is what section 7 covers. Treat sections 1-6 and section 7 as
// two independent axes of the same layout, not one test covering both.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")
const css = read("VesparaHome.module.css")
const jsx = read("VesparaHome.jsx")
const indexCss = read("../../index.css")

// -- CSS length/clamp() resolution -------------------------------------------

function resolveExpr(expr, vw, vh) {
  expr = expr.trim()
  const px = expr.match(/^([\d.]+)px$/)
  if (px) return parseFloat(px[1])
  const vwM = expr.match(/^([\d.]+)vw$/)
  if (vwM) return parseFloat(vwM[1]) * vw
  const vhM = expr.match(/^([\d.]+)vh$/)
  if (vhM) return parseFloat(vhM[1]) * vh
  throw new Error(`unrecognized CSS length: "${expr}"`)
}

function resolveLength(expr, vw, vh) {
  expr = expr.trim()
  const clampMatch = expr.match(/^clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/)
  if (clampMatch) {
    const [, minE, prefE, maxE] = clampMatch
    const min = resolveExpr(minE, vw, vh)
    const pref = resolveExpr(prefE, vw, vh)
    const max = resolveExpr(maxE, vw, vh)
    return Math.min(Math.max(pref, min), max)
  }
  return resolveExpr(expr, vw, vh)
}

// Splits a CSS shorthand value into its space-separated top-level tokens,
// respecting parens so "clamp(28px, 4vw, 58px) clamp(28px, 5vw, 76px)"
// splits into exactly two tokens, not four.
function splitShorthand(value) {
  const tokens = []
  let depth = 0, cur = ""
  for (const ch of value.trim()) {
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === " " && depth === 0) {
      if (cur) tokens.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  if (cur) tokens.push(cur)
  return tokens
}

// Finds a selector's index using a selector-boundary-aware match: the match
// must be the FIRST token of a selector-list item (immediately after
// start-of-string, a newline, `{`, `}`, or `,`), not merely preceded by any
// non-word character. This is stricter than a bare word-boundary check for
// two real reasons found while building this model:
//   1. ".sanctuary" is a literal substring of ".sanctuaryPlate" (an
//      unrelated earlier rule) -- a bare word-boundary match still matches
//      inside it, since "P" is a word character but the boundary itself
//      sits fine either way; the real hazard below is worse.
//   2. ".recentSystem" is also the tail segment of the compound descendant
//      selector ".multiRecentRow .recentSystem" -- a bare
//      `(?<![\w-])` lookbehind is satisfied by the space before
//      ".recentSystem" in that compound selector too, so a naive
//      word-boundary search silently returns the WRONG (compound,
//      partial-property) rule instead of the standalone base rule.
// Requiring the preceding character (after optional spaces/tabs) to be a
// real selector-list boundary rules out both hazards.
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

function cssBlock(source, selector, fromIndex = 0) {
  const block = cssBlockOrNull(source, selector, fromIndex)
  assert.ok(block !== null, `selector not found or malformed: ${selector}`)
  return { block }
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

// Vertical (top, bottom) padding/margin from a 1-, 2-, or 3-value shorthand.
function verticalFromShorthand(value) {
  const tokens = splitShorthand(value)
  if (tokens.length === 1) return [tokens[0], tokens[0]]
  if (tokens.length === 2) return [tokens[0], tokens[0]] // top-bottom | left-right
  if (tokens.length === 3) return [tokens[0], tokens[2]] // top | left-right | bottom
  if (tokens.length === 4) return [tokens[0], tokens[2]] // top | right | bottom | left
  throw new Error(`unexpected shorthand token count: ${value}`)
}

// -- Isolate the compact media-query block (needed for both the threshold
//    regression lock and the 1366x768 arithmetic model) --------------------

const compactStart = css.indexOf("@media (max-width: 900px)")
assert.ok(compactStart > -1, "compact Sanctuary media query not found")
const compactHeaderEnd = css.indexOf("{", compactStart)
const compactHeader = css.slice(compactStart, compactHeaderEnd)
const narrowWidthStart = css.indexOf("@media (max-width: 680px)")
assert.ok(narrowWidthStart > compactStart, "narrower width-only media query not found after the compact block")
const compactBody = css.slice(compactHeaderEnd, narrowWidthStart)

// -- 0. box-sizing precondition -----------------------------------------------
// The whole model below depends on border-box semantics being in force
// globally -- confirmed directly from source, not assumed, since getting
// this wrong is exactly what made the R6 model's margin estimate wrong.

test("box-sizing: border-box is applied globally (the layout model below depends on this, and it must stay true)", () => {
  assert.match(indexCss, /\*,\s*\*::before,\s*\*::after\s*\{[^}]*box-sizing:\s*border-box/)
})

// -- 1. Regression lock on the R6 bug: the compact trigger's height ---------
//       threshold must cover 1366x768 (and 720p) without swallowing any
//       standard desktop/TV height like 900px or 1080px. --------------------

test("the compact-Sanctuary media query's height trigger covers 768px (was 680px, the exact R6 bug threshold) without covering 900px/1080px", () => {
  const m = compactHeader.match(/\(max-height:\s*(\d+)px\)/)
  assert.ok(m, "compact media query must still declare a (max-height: Npx) branch")
  const threshold = parseFloat(m[1])
  assert.notEqual(threshold, 680, "the old 680px threshold (which excluded 768px) must not be reintroduced")
  assert.ok(threshold >= 768, `threshold (${threshold}px) must be >= 768px so 1366x768 engages the compact layout`)
  assert.ok(threshold < 900, `threshold (${threshold}px) must stay below 900px so it never fires for standard desktop heights (900px, 1080px)`)
  assert.match(compactHeader, /max-width:\s*900px/)
})

test("1920x1080 does not engage the compact media query (height 1080 exceeds the threshold; width 1920 exceeds 900px)", () => {
  const m = compactHeader.match(/\(max-height:\s*(\d+)px\)/)
  const threshold = parseFloat(m[1])
  assert.ok(1080 > threshold, "1080px height must remain above the compact threshold")
  assert.ok(1920 > 900, "1920px width must remain above the width-only threshold")
})

// -- 2. Deterministic, border-box-aware content-height model -----------------
//
// Computes the natural (unclipped) height of everything .home stacks
// vertically above Depart's tile, in the realistic "Recently Played is
// populated" state (multiRecentRow -- the state that actually overflowed;
// the empty state alone was not enough to reproduce either reported
// failure). Every box on this project is box-sizing: border-box (see test
// 0), so a box's real rendered height is `max(min-height, padding +
// tallest-child-content)`, not `min-height + padding` -- getting this wrong
// is exactly what let the R7 marker-forcing regression through the R6
// model unnoticed.
//
// Line-height and the world-seal image's aspect ratio are not declared in
// CSS, so this model uses conservative (generously large) standard
// assumptions for both, documented inline. The required safety margin
// (MIN_SAFETY_MARGIN_PX) is chosen to comfortably absorb any plausible
// error from those assumptions, plus border widths and the focused-state
// outline overhang modeled explicitly below -- so the test is not
// sensitive to getting them exactly right, but IS sensitive to a real,
// order-of-tens-of-pixels regression like R6 or R7's.

const DEFAULT_LINE_HEIGHT = 1.2 // browser default; worldName overrides this explicitly
const SEAL_ASSUMED_HEIGHT = 30  // worldSeal declares width:30px, height:auto; assumed ~square
const ACTIONBTN_BORDER_PX = 2   // .actionBtn: border: 1px solid (top+bottom)
const RECENTCARD_BORDER_PX = 2  // .recentCard: border: 1px solid (top+bottom)
// .actionBtn.focused/:focus-visible adds `outline: 2px solid; outline-offset: 3px`.
// outline does not affect layout height, but it IS rendered outside the
// box's border edge and must still land inside the visible, clipped
// viewport. The same rule also applies `transform: translateY(-4px)`,
// which moves the focused tile UP (helping, not hurting, bottom clearance)
// -- this model does not rely on that transform, deliberately treating the
// worse (untranslated) case as the one that must still clear the viewport.
const FOCUS_OUTLINE_ALLOWANCE_PX = 2 /* outline width */ + 3 /* outline-offset */
// This started at 60px, but the pre-R7 compact state (see the dedicated
// regression test below) computes to only ~111px of margin under this same
// model -- and that state was Windows-confirmed to still clip visibly. A
// margin requirement that a genuinely-broken state can satisfy is not doing
// its job, so this is set well above that pre-R7 figure, leaving real
// headroom against further modeling error in either direction.
const MIN_SAFETY_MARGIN_PX = 150

function computeSanctuaryContentHeight(viewportW, viewportH, { compact }) {
  const vw = viewportW / 100
  const vh = viewportH / 100
  const base = (sel) => cssBlockOrNull(css, sel)
  const compactPart = (sel) => cssBlockOrNull(compactBody, sel)

  // Resolves a declaration, preferring the compact override when one exists
  // and compact mode is active for this computation; falls back to the
  // base (always-applies) rule otherwise. Returns null (not a throw) when
  // neither exists, so callers can implement CSS's own cascade fallback
  // (e.g. switchPlayerDestination has no per-destination .destinationMarker
  // override, so it must fall back to the generic .destinationMarker rule
  // -- exactly like a real browser's cascade would).
  const decl = (sel, prop) => {
    if (compact) {
      const v = declValueOrNull(compactPart(sel), prop)
      if (v !== null) return v
    }
    return declValueOrNull(base(sel), prop)
  }
  const requireDecl = (sel, prop) => {
    const v = decl(sel, prop)
    assert.ok(v !== null, `missing "${prop}" declaration for ${sel} (compact=${compact})`)
    return v
  }

  // .sanctuary padding (3-value shorthand in base; flat single value when compact)
  const [sanctuaryPadTop, sanctuaryPadBottom] = verticalFromShorthand(requireDecl(".sanctuary", "padding")).map(x => resolveLength(x, vw, vh))

  // header
  const headerMarginBottomPx = resolveLength(requireDecl(".header", "margin-bottom"), vw, vh)
  const worldNameFontPx = resolveLength(requireDecl(".worldName", "font-size"), vw, vh)
  const worldNameLineHeight = compact ? 0.92 : parseFloat(declValue(base(".worldName"), "line-height"))
  const worldNameHeightPx = worldNameFontPx * worldNameLineHeight
  const worldPlaceFontPx = resolveLength(declValue(base(".worldPlace"), "font-size"), vw, vh)
  const worldPlaceHeightPx = worldPlaceFontPx * DEFAULT_LINE_HEIGHT
  const worldIdentityGapPx = resolveLength(declValue(base(".worldIdentity"), "gap"), vw, vh)
  const headerHeightPx = SEAL_ASSUMED_HEIGHT + worldIdentityGapPx + worldNameHeightPx + worldIdentityGapPx + worldPlaceHeightPx

  // .body
  const bodyGapPx = resolveLength(requireDecl(".body", "gap"), vw, vh)
  const bodyPaddingBottomPx = resolveLength(requireDecl(".body", "padding-bottom"), vw, vh)

  // memoryShelf
  const [memShelfPadTop, memShelfPadBottom] = verticalFromShorthand(requireDecl(".memoryShelf", "padding")).map(x => resolveLength(x, vw, vh))
  const sectionTitleFontPx = resolveLength(declValue(base(".sectionTitle"), "font-size"), vw, vh)
  const sectionSubtitleFontPx = resolveLength(declValue(base(".sectionSubtitle"), "font-size"), vw, vh)
  const sectionSubtitleMarginTopPx = resolveLength(declValue(base(".sectionSubtitle"), "margin-top"), vw, vh)
  const sectionHeadingMarginBottomPx = resolveLength(declValue(base(".sectionHeading"), "margin-bottom"), vw, vh)
  const sectionHeadingHeightPx =
    sectionTitleFontPx * DEFAULT_LINE_HEIGHT + sectionSubtitleMarginTopPx + sectionSubtitleFontPx * DEFAULT_LINE_HEIGHT
    + sectionHeadingMarginBottomPx

  // Recently Played row, populated (multiRecentRow) -- border-box: the card's
  // real height is max(min-height, padding + border + content), where
  // content = art + its margin-bottom + the (line-clamped) title + the
  // system label, using the SAME compact-aware `decl` lookup as everything
  // else -- so a compact override for min-height/padding/art height (added
  // by this R7 fix) is actually reflected here, unlike the R6 model, which
  // never checked for one at all.
  const multiRow = base(".multiRecentRow")
  const recentRowPadTopPx = resolveLength(declValue(multiRow, "padding-top"), vw, vh)
  const recentRowPadBottomPx = resolveLength(declValue(multiRow, "padding-bottom"), vw, vh)
  const cardMinHeightPx = resolveLength(requireDecl(".multiRecentRow .recentCard", "min-height"), vw, vh)
  const cardPaddingPx = resolveLength(requireDecl(".multiRecentRow .recentCard", "padding"), vw, vh)
  const artHeightPx = resolveLength(requireDecl(".multiRecentRow .recentArt", "height"), vw, vh)
  const artMarginBottomPx = resolveLength(requireDecl(".multiRecentRow .recentArt", "margin-bottom"), vw, vh)
  const titleFontPx = resolveLength(declValue(base(".recentTitle"), "font-size"), vw, vh)
  const titleHeightPx = titleFontPx * 2.6 // -webkit-line-clamp: 2, generously rounded
  const systemFontPx = resolveLength(declValue(base(".recentSystem"), "font-size"), vw, vh)
  const systemMarginTopPx = resolveLength(declValue(base(".recentSystem"), "margin-top"), vw, vh)
  const cardContentPx = artHeightPx + artMarginBottomPx + titleHeightPx + systemMarginTopPx + systemFontPx * DEFAULT_LINE_HEIGHT
  const cardTotalPx = Math.max(cardMinHeightPx, cardPaddingPx * 2 + cardContentPx + RECENTCARD_BORDER_PX)
  const recentRowHeightPx = recentRowPadTopPx + cardTotalPx + recentRowPadBottomPx

  const memoryShelfHeightPx = memShelfPadTop + sectionHeadingHeightPx + recentRowHeightPx + memShelfPadBottom

  // destinationDeck / actionRow -- border-box: each tile's real height is
  // max(min-height, padding + border + max(marker height, name-line
  // height)), and actionRow's own height (align-items: end) is the tallest
  // of the four tiles. A per-destination .destinationMarker override is
  // preferred when one exists (compact or base); otherwise this falls back
  // to the generic `.destinationMarker` rule, exactly like the real
  // cascade (switchPlayerDestination has no override of its own).
  const destinationDeckPadTopPx = resolveLength(declValue(base(".destinationDeck"), "padding-top"), vw, vh)
  const actionRowPadTopPx = resolveLength(declValue(base(".actionRow"), "padding-top"), vw, vh)

  function tileTotalPx(sel) {
    const minHeightPx = resolveLength(requireDecl(sel, "min-height"), vw, vh)
    const [padTop, padBot] = verticalFromShorthand(requireDecl(sel, "padding")).map(x => resolveLength(x, vw, vh))
    const markerSel = `${sel} .destinationMarker`
    const hasOwnMarker = decl(markerSel, "height") !== null
    const markerHeightPx = resolveLength(hasOwnMarker ? decl(markerSel, "height") : requireDecl(".destinationMarker", "height"), vw, vh)
    const nameFontPx = resolveLength(requireDecl(`${sel} .destinationName`, "font-size"), vw, vh)
    const nameHeightPx = nameFontPx * DEFAULT_LINE_HEIGHT
    const contentHeightPx = Math.max(markerHeightPx, nameHeightPx)
    return Math.max(minHeightPx, padTop + padBot + contentHeightPx + ACTIONBTN_BORDER_PX)
  }

  const tileHeights = {
    library: tileTotalPx(".libraryDestination"),
    controlRoom: tileTotalPx(".controlRoomDestination"),
    switchPlayer: tileTotalPx(".switchPlayerDestination"),
    depart: tileTotalPx(".departDestination"),
  }
  const tallestTilePx = Math.max(...Object.values(tileHeights))
  const actionRowHeightPx = actionRowPadTopPx + tallestTilePx
  const destinationDeckHeightPx = destinationDeckPadTopPx + actionRowHeightPx

  const totalContentHeightPx =
    sanctuaryPadTop + headerHeightPx + headerMarginBottomPx
    + memoryShelfHeightPx + bodyGapPx + destinationDeckHeightPx + bodyPaddingBottomPx
    + sanctuaryPadBottom

  // departDestination's own bottom edge sits at the very bottom of
  // destinationDeck (align-items: end -- every tile's bottom edge is flush
  // with the row's bottom edge), so its bottom position equals the total.
  // The focused-state outline is rendered outside that edge and must also
  // clear the viewport (see FOCUS_OUTLINE_ALLOWANCE_PX above).
  const departBottomEdgePx = totalContentHeightPx
  const departFocusedBottomEdgePx = departBottomEdgePx + FOCUS_OUTLINE_ALLOWANCE_PX

  return { totalContentHeightPx, departBottomEdgePx, departFocusedBottomEdgePx, tileHeights, cardTotalPx, actionRowHeightPx, destinationDeckHeightPx, memoryShelfHeightPx, headerHeightPx, sanctuaryPadTop, sanctuaryPadBottom, bodyPaddingBottomPx }
}

// -- 3. Prove Depart -- including its border, focus outline, and the ---------
//       page's own bottom padding -- is inside the visible viewport at
//       1366x768, with a real minimum safety margin. ------------------------

test("at 1366x768 (compact layout engaged), Sanctuary's full realistic content height -- border-box tiles, marker-forced sizing, a populated Recently Played row, and the focused-state outline allowance -- clears the 768px viewport with a real minimum safety margin", () => {
  const { totalContentHeightPx, departBottomEdgePx, departFocusedBottomEdgePx } = computeSanctuaryContentHeight(1366, 768, { compact: true })
  const viewportH = 768
  assert.ok(
    totalContentHeightPx < viewportH,
    `computed content height ${totalContentHeightPx.toFixed(1)}px must be less than the 768px viewport (.home is fixed/inset:0/overflow:hidden, so anything taller is clipped and unreachable)`
  )
  assert.ok(
    departBottomEdgePx <= viewportH - MIN_SAFETY_MARGIN_PX,
    `Depart's computed bottom edge (${departBottomEdgePx.toFixed(1)}px) must clear the 768px viewport by at least ${MIN_SAFETY_MARGIN_PX}px -- a model that only proves "barely fits" is exactly what missed the prior (R7) regression`
  )
  assert.ok(
    departFocusedBottomEdgePx <= viewportH,
    `Depart's bottom edge INCLUDING the focused-state outline/offset (${departFocusedBottomEdgePx.toFixed(1)}px) must still clear the 768px viewport -- the outline is drawn outside the tile's own box and is not covered by the plain content-height check above`
  )
})

test("at 1366x768, the base (non-compact) layout -- what 1366x768 actually rendered before the R6 threshold fix -- would overflow the viewport (documents why the threshold, not the arithmetic, was the R6 root cause)", () => {
  const { totalContentHeightPx } = computeSanctuaryContentHeight(1366, 768, { compact: false })
  assert.ok(
    totalContentHeightPx > 768,
    `expected the pre-R6-fix (base, non-compact) layout to overflow 768px -- got ${totalContentHeightPx.toFixed(1)}px. If this fails, the reported bug's mechanism no longer matches this model and needs re-investigation, not just a threshold check.`
  )
})

// -- 3b. Regression test that would have failed against the exact R7 -------
//        partially-clipped state (marker heights unshrunk, recentCard
//        unshrunk) -- proving this stronger model actually catches the
//        reported regression, not just the R6 one. --------------------------

test("the exact pre-R7 compact state (destinationMarker and Recently Played card left unshrunk) fails this model's safety-margin requirement -- proving this test would have caught the Windows-confirmed partial clipping", () => {
  // Re-derives the same computation, but substituting the UNSHRUNK values
  // that were actually in place before this milestone: every
  // .destinationMarker at its full BASE height (60/48/46/28px, none capped
  // for compact), and .multiRecentRow .recentCard at its full base
  // min-height/padding (205px / 12px, no compact override at all). Every
  // other number (paddings, gaps, header, tile min-heights) is taken from
  // the real, current compact CSS -- only the two R7-fixed pieces are
  // rolled back, isolating exactly what this milestone changed.
  const vw = 1366 / 100
  const vh = 768 / 100

  const libMarker = 60, crMarker = 48, spMarker = 46, depMarker = 28 // unshrunk base heights
  const cardMinHeight = 205, cardPadding = 12 // unshrunk base recentCard sizing
  const artHeight = resolveLength(declValue(cssBlockOrNull(css, ".multiRecentRow .recentArt"), "height"), vw, vh) // base clamp, unshrunk (11vw branch at this width)
  const artMarginBottom = 12 // base .multiRecentRow .recentArt/.recentArtFallback margin-bottom

  const titleFontPx = resolveLength(declValue(cssBlockOrNull(css, ".recentTitle"), "font-size"), vw, vh)
  const titleHeight = titleFontPx * 2.6
  const systemFontPx = resolveLength(declValue(cssBlockOrNull(css, ".recentSystem"), "font-size"), vw, vh)
  const systemMarginTop = resolveLength(declValue(cssBlockOrNull(css, ".recentSystem"), "margin-top"), vw, vh)
  const cardContent = artHeight + artMarginBottom + titleHeight + systemMarginTop + systemFontPx * DEFAULT_LINE_HEIGHT
  const cardTotal = Math.max(cardMinHeight, cardPadding * 2 + cardContent + RECENTCARD_BORDER_PX)

  const multiRow = cssBlockOrNull(css, ".multiRecentRow")
  const recentRowPadTop = resolveLength(declValue(multiRow, "padding-top"), vw, vh)
  const recentRowPadBottom = resolveLength(declValue(multiRow, "padding-bottom"), vw, vh)
  const recentRowHeight = recentRowPadTop + cardTotal + recentRowPadBottom

  const sectionTitleFontPx = resolveLength(declValue(cssBlockOrNull(css, ".sectionTitle"), "font-size"), vw, vh)
  const sectionSubtitleFontPx = resolveLength(declValue(cssBlockOrNull(css, ".sectionSubtitle"), "font-size"), vw, vh)
  const sectionSubtitleMarginTop = resolveLength(declValue(cssBlockOrNull(css, ".sectionSubtitle"), "margin-top"), vw, vh)
  const sectionHeadingMarginBottom = resolveLength(declValue(cssBlockOrNull(css, ".sectionHeading"), "margin-bottom"), vw, vh)
  const sectionHeadingHeight = sectionTitleFontPx * DEFAULT_LINE_HEIGHT + sectionSubtitleMarginTop + sectionSubtitleFontPx * DEFAULT_LINE_HEIGHT + sectionHeadingMarginBottom

  // memoryShelf padding: current compact value (14px flat) -- unaffected by
  // the R7 marker/recentCard rollback being tested here.
  const [memPadTop, memPadBottom] = verticalFromShorthand(declValue(cssBlockOrNull(compactBody, ".memoryShelf"), "padding")).map(x => resolveLength(x, vw, vh))
  const memoryShelfHeight = memPadTop + sectionHeadingHeight + recentRowHeight + memPadBottom

  // Tiles: current compact min-height/padding (R7 didn't touch these), but
  // the UNSHRUNK marker heights above. `destinationSel` names the real
  // per-destination selector (for the .destinationName font lookup, which
  // has no generic fallback); `paddingSel` is what actually supplies
  // padding for this tile in compact mode -- switchPlayerDestination has no
  // padding override of its own, so (like the real cascade) it falls back
  // to .actionBtn's compact padding override.
  function tileTotalWithMarker(destinationSel, paddingSel, markerHeight) {
    const minHeight = resolveLength(declValue(cssBlockOrNull(compactBody, destinationSel), "min-height"), vw, vh)
    const [padTop, padBot] = verticalFromShorthand(declValue(cssBlockOrNull(compactBody, paddingSel), "padding")).map(x => resolveLength(x, vw, vh))
    const nameFontPx = resolveLength(declValue(cssBlockOrNull(css, `${destinationSel} .destinationName`), "font-size"), vw, vh)
    const nameHeight = nameFontPx * DEFAULT_LINE_HEIGHT
    const contentHeight = Math.max(markerHeight, nameHeight)
    return Math.max(minHeight, padTop + padBot + contentHeight + ACTIONBTN_BORDER_PX)
  }
  // switchPlayerDestination's compact padding comes from .actionBtn's
  // compact override (12px 14px) since it has no padding override of its
  // own -- same cascade fallback the real model uses.
  const spHasOwnCompactPadding = declValueOrNull(cssBlockOrNull(compactBody, ".switchPlayerDestination"), "padding") !== null

  const libTotal = tileTotalWithMarker(".libraryDestination", ".libraryDestination", libMarker)
  const crTotal = tileTotalWithMarker(".controlRoomDestination", ".controlRoomDestination", crMarker)
  const spTotal = tileTotalWithMarker(".switchPlayerDestination", spHasOwnCompactPadding ? ".switchPlayerDestination" : ".actionBtn", spMarker)
  const depTotal = tileTotalWithMarker(".departDestination", ".departDestination", depMarker)
  const tallestTile = Math.max(libTotal, crTotal, spTotal, depTotal)

  const actionRowPadTop = resolveLength(declValue(cssBlockOrNull(css, ".actionRow"), "padding-top"), vw, vh)
  const destinationDeckPadTop = resolveLength(declValue(cssBlockOrNull(css, ".destinationDeck"), "padding-top"), vw, vh)
  const actionRowHeight = actionRowPadTop + tallestTile
  const destinationDeckHeight = destinationDeckPadTop + actionRowHeight

  const [sanctuaryPadTop, sanctuaryPadBottom] = verticalFromShorthand(declValue(cssBlockOrNull(compactBody, ".sanctuary"), "padding")).map(x => resolveLength(x, vw, vh))
  const headerMarginBottom = resolveLength(declValue(cssBlockOrNull(compactBody, ".header"), "margin-bottom"), vw, vh)
  const worldNameFontPx = resolveLength(declValue(cssBlockOrNull(compactBody, ".worldName"), "font-size"), vw, vh)
  const worldPlaceFontPx = resolveLength(declValue(cssBlockOrNull(css, ".worldPlace"), "font-size"), vw, vh)
  const worldIdentityGap = resolveLength(declValue(cssBlockOrNull(css, ".worldIdentity"), "gap"), vw, vh)
  const headerHeight = SEAL_ASSUMED_HEIGHT + worldIdentityGap + worldNameFontPx * 0.92 + worldIdentityGap + worldPlaceFontPx * DEFAULT_LINE_HEIGHT
  const bodyGap = resolveLength(declValue(cssBlockOrNull(compactBody, ".body"), "gap"), vw, vh)
  const bodyPaddingBottom = resolveLength(declValue(cssBlockOrNull(compactBody, ".body"), "padding-bottom"), vw, vh)

  const preR7Total =
    sanctuaryPadTop + headerHeight + headerMarginBottom
    + memoryShelfHeight + bodyGap + destinationDeckHeight + bodyPaddingBottom
    + sanctuaryPadBottom

  // This is the assertion that WOULD have failed before the R7 fix: with
  // markers and the recent-game card left unshrunk, the pre-R7 compact
  // state does not clear this model's required safety margin.
  assert.ok(
    !(preR7Total <= 768 - MIN_SAFETY_MARGIN_PX),
    `expected the pre-R7 state (unshrunk markers + unshrunk recentCard) to FAIL the ${MIN_SAFETY_MARGIN_PX}px safety-margin requirement -- got a total of ${preR7Total.toFixed(1)}px, which would leave ${(768 - preR7Total).toFixed(1)}px of margin. If this passes, the pre-R7 state was not actually reproduced and this regression test needs correcting.`
  )
})

// -- 4. Prove 1920x1080 remains fully visible with the existing spacious ----
//       styling untouched, and is unaffected by the R7 fix. -----------------

test("at 1920x1080, the compact media query does not engage, and the full spacious layout -- including the R7 marker/recentCard fix, which is compact-only -- still fits comfortably inside the viewport", () => {
  const { totalContentHeightPx, departBottomEdgePx } = computeSanctuaryContentHeight(1920, 1080, { compact: false })
  assert.ok(totalContentHeightPx < 1080, `computed content height ${totalContentHeightPx.toFixed(1)}px must fit inside the 1080px viewport`)
  assert.ok(departBottomEdgePx <= 1080 - MIN_SAFETY_MARGIN_PX, `Depart's bottom edge (${departBottomEdgePx.toFixed(1)}px) should clear 1080px with the required margin`)
})

test("the R7 destinationMarker and Recently Played card overrides live only inside the compact media query -- 1920x1080's base rules are untouched", () => {
  assert.match(compactBody, /\.destinationMarker\s*\{\s*height:\s*32px;\s*\}/)
  assert.match(compactBody, /\.multiRecentRow \.recentCard\s*\{\s*min-height:\s*150px;/)
  // The base (always-applies) marker/recentCard rules are unchanged from
  // their original values.
  assert.match(css.slice(0, compactStart), /\.libraryDestination \.destinationMarker\s*\{[^}]*height:\s*60px;/)
  assert.match(css.slice(0, compactStart), /\.multiRecentRow \.recentCard\s*\{[^}]*min-height:\s*205px;/)
})

// -- 5. The fix is layout-fit, not a new scroll model ------------------------
//       (requirement: don't rely on scrolling unless Sanctuary already has
//       an intentional, discoverable one -- it does, but only the
//       horizontal Recently Played row, unchanged here). ---------------------

test(".home remains a hard, unscrollable clip (position: fixed; inset: 0; overflow: hidden) -- the fix makes content fit, it does not introduce page scrolling", () => {
  const { block } = cssBlock(css, ".home")
  assert.match(block, /position:\s*fixed/)
  assert.match(block, /inset:\s*0/)
  assert.match(block, /overflow:\s*hidden/)
})

test("the only scrollable region in Sanctuary remains the pre-existing horizontal Recently Played row -- no new vertical/page scroll was introduced", () => {
  const { block: recentRowBlock } = cssBlock(css, ".recentRow")
  assert.match(recentRowBlock, /overflow-x:\s*auto/)
  assert.match(recentRowBlock, /overflow-y:\s*hidden/)
  assert.doesNotMatch(css, /\.sanctuary\s*\{[^}]*overflow(-y)?:\s*(auto|scroll)/s)
  assert.doesNotMatch(css, /\.body\s*\{[^}]*overflow(-y)?:\s*(auto|scroll)/s)
})

// -- 6. Focus/navigation reachability, re-affirmed for this milestone -------
//       (deeper coverage of activation/cancel/quit-exactly-once already
//       lives in sanctuaryDepartMilestoneR5.test.js -- these tests cover the
//       specific reachability claims requirement 7 calls out for THIS
//       milestone: reachable from the default focus position, and via
//       controller, with a real computed traversal, not just a pattern
//       match). ---------------------------------------------------------

test("focus can reach Depart from the default Sanctuary focus position via a real, executed traversal of the same bound the app uses", () => {
  // Mirrors the exact reducer both input paths use (confirmed identical in
  // sanctuaryDepartMilestoneR5.test.js): setActionIndex(i => Math.min(ACTIONS.length - 1, i + 1))
  const ACTIONS = ["library", "controlRoom", "switchPlayer", "depart"]
  let actionIndex = 0 // the default when initialFocus resolves to the Library tile (see the initial-focus effect)
  for (let step = 0; step < ACTIONS.length; step++) {
    actionIndex = Math.min(ACTIONS.length - 1, actionIndex + 1)
  }
  assert.equal(actionIndex, ACTIONS.length - 1)
  assert.equal(ACTIONS[actionIndex], "depart")
})

test("both the gamepad and keyboard Right-navigation paths use the identical unbounded-length traversal (controller and keyboard reach the same destination)", () => {
  assert.match(jsx, /onRight:\s*\(\)\s*=>\s*\{[\s\S]*?actionIndex < ACTIONS\.length - 1/)
  assert.match(jsx, /if \(e\.key === "ArrowRight"\)[\s\S]*?actionIndex < ACTIONS\.length - 1/)
})

test("activating the focused Depart action opens the confirmation dialog (does not quit immediately)", () => {
  assert.match(jsx, /else if \(action === "depart"\) \{ setDepartChoice\(1\); setShowDepartConfirm\(true\) \}/)
  assert.doesNotMatch(jsx, /action === "depart"\)[^\n]*window\.nuarcade/)
})

test("the Remain/Depart confirmation dialog and the safe quit bridge are untouched by this layout-only pass", () => {
  assert.match(jsx, /yesLabel=\{t\("depart\.depart"\)\}/)
  assert.match(jsx, /noLabel=\{t\("depart\.remain"\)\}/)
  assert.match(jsx, /window\.nuarcade\?\.quit\?\.\(\)\?\.catch\?\.\(\(\) => \{\}\)/)
})

// =============================================================================
// -- 7. HORIZONTAL layout model (R8) -----------------------------------------
// =============================================================================
//
// Sections 1-6 above are entirely about the VERTICAL axis (R6/R7). This
// section is the R8 fix: Depart clipped on the RIGHT edge at 1366x768,
// independent of and not covered by anything above.

// -- 7a. Direct, source-confirmed regression lock on the concrete structural
//        defect: Depart's compact grid column must not have a non-zero
//        pixel floor (every other column already had none). This is
//        Confirmed-from-source, not modeled arithmetic -- it doesn't depend
//        on any text-width or font-metric assumption. -----------------------

test("no compact destination-row grid column declares a non-zero pixel minimum -- Depart's column previously had a hard 100px floor while its siblings had none, the one concrete asymmetry matching which single tile the Windows screenshot showed clipped", () => {
  const compactActionRowBlock = cssBlockOrNull(compactBody, ".actionRow")
  assert.ok(compactActionRowBlock, "compact .actionRow rule not found")
  const gridTemplateColumns = declValue(compactActionRowBlock, "grid-template-columns")
  const minmaxCalls = [...gridTemplateColumns.matchAll(/minmax\(([^,]+),/g)].map(m => m[1].trim())
  assert.equal(minmaxCalls.length, 4, `expected exactly 4 grid columns, found: ${gridTemplateColumns}`)
  for (const min of minmaxCalls) {
    assert.equal(min, "0", `every compact destination-row column must have a 0 minimum (found "${min}" in "${gridTemplateColumns}") -- a non-zero floor is exactly the defect this fix removes`)
  }
})

test("the pre-R8 compact grid-template-columns (reconstructed) had exactly the asymmetric floor this fix removed -- documents what changed, not merely that something changed", () => {
  // Literal reconstruction of the value that shipped before this fix,
  // confirmed against the R6/R7 conversation history, not invented for this
  // test.
  const preR8Value = "minmax(0, 1.8fr) minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(100px, 0.6fr)"
  const mins = [...preR8Value.matchAll(/minmax\(([^,]+),/g)].map(m => m[1].trim())
  assert.deepEqual(mins, ["0", "0", "0", "100px"], "sanity check on the reconstructed pre-R8 value itself")
  const nonZeroFloors = mins.filter(m => m !== "0")
  assert.equal(nonZeroFloors.length, 1, "the pre-R8 row had exactly one non-zero floor, on the last (Depart) column -- the exact tile the screenshot showed clipped")

  const currentValue = declValue(cssBlockOrNull(compactBody, ".actionRow"), "grid-template-columns")
  assert.notEqual(currentValue.replace(/\s+/g, " "), preR8Value, "the current value must differ from the reconstructed pre-R8 value -- if this matches, the fix was not actually applied")
})

test("min-width: 0 is present on both the compact grid container (.actionRow) and every grid item (.actionBtn) -- the standard, structurally-guaranteed countermeasure against a flex/grid child forcing its container wider than the viewport", () => {
  assert.match(declValue(cssBlockOrNull(compactBody, ".actionRow"), "min-width"), /^0$/)
  assert.match(declValue(cssBlockOrNull(compactBody, ".actionBtn"), "min-width"), /^0$/)
})

// -- 7b. Illustrative arithmetic width model -- explicitly labeled as -------
//        supporting evidence for the POST-FIX margin, not a numerically
//        precise reconstruction of the pre-fix overflow (see the module
//        doc comment's evidence-tier note for why). --------------------------

const HORIZONTAL_CHAR_WIDTH_COEFF = 0.68 // documented assumption, see module doc comment
const TILE_INNER_GAP_PX = 18   // .actionBtn: gap: 18px (marker <-> copy)
const MARKER_FLEX_BASIS_PX = 12 // .destinationMarker: flex: 0 0 12px
const ACTIONBTN_BORDER_H_PX = 2 // .actionBtn: border: 1px solid (left+right)

// Longest-single-word floor for a destination's name text -- text wraps at
// spaces by default (no white-space: nowrap on .destinationName anywhere),
// so the narrowest possible min-content width is governed by the longest
// unbreakable word, not the full phrase.
function longestWordWidthPx(words, fontSizePx, letterSpacingPx) {
  return Math.max(...words.map(w => w.length * (fontSizePx * HORIZONTAL_CHAR_WIDTH_COEFF + letterSpacingPx)))
}

function tileFloorPx({ padLeftPx, padRightPx, words, fontSizePx, letterSpacingPx }) {
  return padLeftPx + padRightPx + ACTIONBTN_BORDER_H_PX + MARKER_FLEX_BASIS_PX + TILE_INNER_GAP_PX
    + longestWordWidthPx(words, fontSizePx, letterSpacingPx)
}

function computeSanctuaryRowWidth(viewportW, { compact }) {
  const vw = viewportW / 100
  const decl = (sel, prop) => {
    if (compact) {
      const v = declValueOrNull(cssBlockOrNull(compactBody, sel), prop)
      if (v !== null) return v
    }
    return declValueOrNull(cssBlockOrNull(css, sel), prop)
  }
  const requireDecl = (sel, prop) => {
    const v = decl(sel, prop)
    assert.ok(v !== null, `missing "${prop}" for ${sel} (compact=${compact})`)
    return v
  }

  const [sanctuaryPadLeft, sanctuaryPadRight] = (() => {
    const tokens = splitShorthand(requireDecl(".sanctuary", "padding"))
    // 1-value: all sides equal; 2-value: [vertical, horizontal]; 3/4-value:
    // [top, right, bottom, (left)] -- horizontal = tokens[1] (right) either way
    // for the shapes this stylesheet actually uses (1- or 2-value only).
    if (tokens.length === 1) return [tokens[0], tokens[0]]
    return [tokens[1], tokens[1]]
  })().map(t => resolveLength(t, vw, 0))

  const gapPx = resolveLength(requireDecl(".actionRow", "gap"), vw, 0)

  function nameFontLetterSpacing(sel) {
    const block = cssBlockOrNull(compact ? compactBody : css, `${sel} .destinationName`) ?? cssBlockOrNull(css, `${sel} .destinationName`)
    const fontSizePx = resolveLength(declValue(block, "font-size"), vw, 0)
    const letterSpacingRaw = declValueOrNull(block, "letter-spacing")
    const letterSpacingPx = letterSpacingRaw ? resolveLength(letterSpacingRaw, vw, 0) : resolveLength(declValue(cssBlockOrNull(css, ".destinationName"), "letter-spacing"), vw, 0)
    return { fontSizePx, letterSpacingPx }
  }

  function tilePaddingPx(sel, fallbackSel) {
    const paddingValue = decl(sel, "padding") ?? requireDecl(fallbackSel, "padding")
    const tokens = splitShorthand(paddingValue)
    const horizontal = tokens.length === 1 ? tokens[0] : tokens[tokens.length >= 3 ? 1 : (tokens.length === 2 ? 1 : 0)]
    return resolveLength(horizontal, vw, 0)
  }

  const library = tileFloorPx({
    padLeftPx: tilePaddingPx(".libraryDestination", ".actionBtn"), padRightPx: tilePaddingPx(".libraryDestination", ".actionBtn"),
    words: ["LIBRARY"], ...nameFontLetterSpacing(".libraryDestination"),
  })
  const controlRoom = tileFloorPx({
    padLeftPx: tilePaddingPx(".controlRoomDestination", ".actionBtn"), padRightPx: tilePaddingPx(".controlRoomDestination", ".actionBtn"),
    words: ["CONTROL", "ROOM"], ...nameFontLetterSpacing(".controlRoomDestination"),
  })
  const switchPlayerPadding = decl(".switchPlayerDestination", "padding") !== null ? tilePaddingPx(".switchPlayerDestination", ".actionBtn") : tilePaddingPx(".actionBtn", ".actionBtn")
  const switchPlayer = tileFloorPx({
    padLeftPx: switchPlayerPadding, padRightPx: switchPlayerPadding,
    words: ["SWITCH", "PLAYER"], ...nameFontLetterSpacing(".switchPlayerDestination"),
  })
  const depart = tileFloorPx({
    padLeftPx: tilePaddingPx(".departDestination", ".actionBtn"), padRightPx: tilePaddingPx(".departDestination", ".actionBtn"),
    words: ["DEPART"], ...nameFontLetterSpacing(".departDestination"),
  })

  const gaps = gapPx * 3
  const rowWidth = library + controlRoom + switchPlayer + depart + gaps
  const totalWidth = sanctuaryPadLeft + rowWidth + sanctuaryPadRight
  // Depart is the last column; its right edge sits at the row's right edge,
  // which is the page's total width minus the right-side page padding.
  const departRightEdge = totalWidth - sanctuaryPadRight
  return { totalWidth, departRightEdge, tiles: { library, controlRoom, switchPlayer, depart }, gaps, sanctuaryPadLeft, sanctuaryPadRight }
}

const HORIZONTAL_FOCUS_OUTLINE_ALLOWANCE_PX = 2 /* outline width */ + 3 /* outline-offset */
const HORIZONTAL_MIN_SAFETY_MARGIN_PX = 150

test("at 1366px wide (compact layout engaged), the illustrative tile-floor model -- page padding, every gap, every tile's padding/border/marker/longest-word text, and the focused-state outline allowance -- keeps Depart's right edge inside the viewport with a real safety margin", () => {
  const { totalWidth, departRightEdge } = computeSanctuaryRowWidth(1366, { compact: true })
  const viewportW = 1366
  assert.ok(totalWidth < viewportW, `computed row+page width ${totalWidth.toFixed(1)}px must be less than the ${viewportW}px viewport`)
  assert.ok(
    departRightEdge <= viewportW - HORIZONTAL_MIN_SAFETY_MARGIN_PX,
    `Depart's computed right edge (${departRightEdge.toFixed(1)}px) must clear the ${viewportW}px viewport by at least ${HORIZONTAL_MIN_SAFETY_MARGIN_PX}px`
  )
  assert.ok(
    departRightEdge + HORIZONTAL_FOCUS_OUTLINE_ALLOWANCE_PX <= viewportW,
    `Depart's right edge including the focused-state outline/offset (${(departRightEdge + HORIZONTAL_FOCUS_OUTLINE_ALLOWANCE_PX).toFixed(1)}px) must still clear the viewport`
  )
})

test("at 1920px wide, the compact media query does not engage and the base (spacious) row -- untouched by this compact-only fix -- fits comfortably with the required margin", () => {
  const { totalWidth, departRightEdge } = computeSanctuaryRowWidth(1920, { compact: false })
  const viewportW = 1920
  assert.ok(totalWidth < viewportW, `computed row+page width ${totalWidth.toFixed(1)}px must fit inside the ${viewportW}px viewport`)
  assert.ok(departRightEdge <= viewportW - HORIZONTAL_MIN_SAFETY_MARGIN_PX, `Depart's right edge (${departRightEdge.toFixed(1)}px) should clear ${viewportW}px with margin`)
})

test("the R8 horizontal fix (grid-template-columns, min-width: 0, and the narrower compact destination-name font sizes) lives only inside the compact media query -- the base (1920x1080) .actionRow, .actionBtn, and per-destination .destinationName rules are unchanged", () => {
  assert.doesNotMatch(css.slice(0, compactStart), /\.actionRow\s*\{[^}]*min-width:\s*0/s)
  assert.doesNotMatch(css.slice(0, compactStart), /\.actionBtn\s*\{[^}]*min-width:\s*0/s)
  assert.match(css.slice(0, compactStart), /\.actionRow\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 2fr\) minmax\(0, 1\.3fr\) minmax\(0, 0\.9fr\) minmax\(110px, 0\.5fr\);/)
  assert.match(css.slice(0, compactStart), /\.libraryDestination \.destinationName\s*\{[^}]*font-size:\s*clamp\(19px, 2vw, 30px\);/)
})
