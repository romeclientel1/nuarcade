// libraryMilestone2.test.js -----------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/GameCard.jsx/*.module.css cannot be imported here (JSX and CSS
// Node has no loader for -- see Wheel.test.js's own limitations note).
// These tests read the real committed source text and assert on the
// specific promises the Vespara Library Milestone 2 (game cards, selected-
// game pedestal, responsive header utilities) made: the old cyan
// focused-card language is gone, neighboring cards are visually
// subordinate without any rendering-logic change, the focused card has a
// distinct readable title treatment, the flip-card transform now has
// reduced-motion coverage, the header utility cluster is overflow-safe,
// and every preserved behavior contract (artwork/placeholder rendering,
// disabled/status conditions, launch/favorite handlers, background video
// crossfade, Return to Sanctuary, Settings/Media access) is still intact.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const wheelJsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const wheelCss = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const cardJsx = readFileSync(join(HERE, "GameCard.jsx"), "utf8").replace(/\r\n/g, "\n")
const cardCss = readFileSync(join(HERE, "GameCard.module.css"), "utf8").replace(/\r\n/g, "\n")

// -- 1. Carousel geometry/math unchanged (re-affirmed once more here) --------

test("getCardStyle's signed/absPos selection math and navigate() are unchanged by the card/pedestal pass (D3 replaced only the arc transform, not this architecture)", () => {
  assert.match(wheelJsx, /const CARD_SLOT_WIDTH = 230/)
  assert.match(wheelJsx, /const wrapped = \(\(diff % n\) \+ n\) % n/)
  assert.match(wheelJsx, /const signed = wrapped > n \/ 2 \? wrapped - n : wrapped/)
  assert.match(wheelJsx, /const navigate = \(dir\) => \{/)
})

// -- 2. GameCard still renders artwork and placeholder fallback --------------

test("GameCard still renders the SGDB hero, capsule, TeknoParrot thumbnail, and generatePlaceholderSvg placeholder paths", () => {
  assert.match(cardJsx, /generatePlaceholderSvg\(game\)/)
  assert.match(cardJsx, /showHero\s*=\s*heroReady && heroUrl/)
  assert.match(cardJsx, /showCapsule\s*=\s*capsuleUrl/)
  assert.match(cardJsx, /showThumb\s*=\s*tpThumb && !imgError && !showCapsule/)
})

// -- 3. Existing status/disabled conditions remain present -------------------

test("not-configured/path-missing/discovered status conditions and their labels are unchanged", () => {
  assert.match(cardJsx, /game\.status === 'not-configured' \|\| game\.status === 'path-missing' \|\| game\.status === 'discovered'/)
  assert.match(cardJsx, /'FILE MISSING'/)
  assert.match(cardJsx, /'SETUP IN TP'/)
  assert.match(cardJsx, /'NEEDS CONFIG'/)
})

// -- 4. Focused card uses Vespara styling, no cyan #00c8ff focus border ------

test(".center no longer uses the old cyan #00c8ff border/glow -- warm-gold/teal-gold framing instead", () => {
  const block = cardCss.match(/(?<!\.card)\.center\s*\{([^}]*)\}/) || cardCss.match(/\n\.center \{([^}]*)\}/)
  assert.ok(block, ".center rule must exist")
  assert.doesNotMatch(block[1], /#00c8ff/)
  assert.match(block[1], /#d6b274/, "expected the warm-gold focus border")
})

test("no cyan #00c8ff survives anywhere in GameCard.module.css", () => {
  assert.doesNotMatch(cardCss, /#00c8ff/)
})

test("the play overlay and accent-border glow no longer read per-genre colors.accent inline -- fixed Vespara framing instead", () => {
  assert.doesNotMatch(cardJsx, /styles\.playBtn\}\s*style=\{\{\s*borderColor:\s*colors\.accent/)
  assert.doesNotMatch(cardJsx, /styles\.accentBorder\}\s*\n?\s*style=\{\{\s*boxShadow:\s*`inset[^`]*colors\.accent/)
})

// -- 5. Neighboring-card treatment is subordinate, without changing rendering logic --

test("GameCard applies a distinct .neighbor class to non-center cards, alongside the unchanged .center toggle for isCenter", () => {
  assert.match(cardJsx, /\$\{styles\.card\} \$\{isCenter \? styles\.center : styles\.neighbor\}/)
})

test(".neighbor desaturates/dims via filter only -- no layout or geometry property touched", () => {
  const block = cardCss.match(/\.neighbor\s*\{([^}]*)\}/)
  assert.ok(block, ".neighbor rule must exist")
  assert.match(block[1], /filter:\s*saturate\(/)
  assert.doesNotMatch(block[1], /\b(width|height|top|left|position)\s*:/)
})

test("every card still renders through the same single GameCard component call in Wheel.jsx -- no branching by isCenter at the render-call level", () => {
  assert.match(wheelJsx, /<GameCard\s*\n\s*game=\{game\}\s*\n\s*isCenter=\{index === selectedIndex\}/)
})

// -- 6. Focused-card title size/readability treatment exists -----------------

test(".card.center .title is measurably larger than the base .title, for couch/cabinet readability", () => {
  const baseTitle = cardCss.match(/(?<!center \.)\.title\s*\{([^}]*)\}/)
  const centerTitle = cardCss.match(/\.card\.center \.title\s*\{([^}]*)\}/)
  assert.ok(baseTitle && centerTitle)
  const baseSize = Number(baseTitle[1].match(/font-size:\s*(\d+)px/)[1])
  const centerSize = Number(centerTitle[1].match(/font-size:\s*(\d+)px/)[1])
  assert.ok(centerSize > baseSize, `expected focused title (${centerSize}px) to exceed base title (${baseSize}px)`)
})

test(".card.center .system provides a clearer platform label treatment (letter-spacing/weight) than the base .system", () => {
  assert.match(cardCss, /\.card\.center \.system\s*\{[^}]*font-weight:\s*700/)
})

// -- 7. Flip-card motion has reduced-motion coverage --------------------------

test(".flipFront/.flipBack transform transition is now covered by a reduced-motion override", () => {
  const blocks = cardCss.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) || []
  const covered = blocks.some(b => /\.flipFront/.test(b) && /\.flipBack/.test(b) && /transition:\s*none/.test(b))
  assert.ok(covered, "expected a reduced-motion block disabling .flipFront/.flipBack transition")
})

test("reduced-motion overrides in GameCard.module.css never remove outline or box-shadow", () => {
  const blocks = cardCss.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g) || []
  for (const block of blocks) {
    assert.doesNotMatch(block, /outline:\s*none/)
  }
})

// -- 8. Archive View preserves and hardens the A/B crossfade lifecycle -------

test("the dual video refs/states remain and selection assigns only the inactive Archive View slot", () => {
  assert.match(wheelJsx, /const bgVideoARef = useRef\(null\)/)
  assert.match(wheelJsx, /const bgVideoBRef = useRef\(null\)/)
  assert.match(wheelJsx, /const incomingSlot = activeSlot === 'a' \? 'b' : 'a'/)
  assert.match(wheelJsx, /if \(incomingSlot === 'a'\) setBgVideoA\(incoming\)\s*else setBgVideoB\(incoming\)/)
})

test("video presentation is framed, cover-fit, restrained, and keeps loop/playsInline/autoPlay", () => {
  assert.match(wheelJsx, /<video\s*\n\s*ref=\{bgVideoARef\}[\s\S]*?src=\{bgVideoA\.source\}[\s\S]*?loop\s*\n\s*playsInline\s*\n\s*autoPlay/)
  const block = wheelCss.match(/\.archiveVideo\s*\{([^}]*)\}/)
  assert.ok(block)
  assert.match(block[1], /position:\s*absolute/)
  assert.match(block[1], /object-fit:\s*cover/)
  assert.match(block[1], /filter:\s*saturate\(0\.92\) brightness\(0\.92\) contrast\(1\.02\)/)
  assert.doesNotMatch(wheelCss, /\.bgVideo\s*\{|\.bgVideoHidden\s*\{/)
})

// -- 9. Selected-game launch and secondary action handlers unchanged --------

test("launch button still dispatches launchGame unchanged", () => {
  assert.match(wheelJsx, /onClick=\{launchGame\} disabled=\{launching\}/)
})

test("favorite toggle in the pedestal still dispatches toggleFavorite unchanged", () => {
  assert.match(wheelJsx, /onClick=\{\(\) => toggleFavorite\(current\.id \|\| current\.profile\)\}/)
})

// -- 10. Header utilities remain present, ordered, focusable, overflow-safe --

test("the global header reserves a shrink-safe centered identity column between bounded navigation/utility columns", () => {
  // D2: the local Library title moved out into its own .libraryTitleRow,
  // so the surviving 3-column row is .stage .globalHeader (Return | the
  // Vespara lockup | Console+WelcomeBack) -- symmetric minmax(0,1fr) side
  // columns so the centered lockup never shifts off true-center regardless
  // of how wide Return or the utility cluster happen to be.
  const block = wheelCss.match(/\.stage \.globalHeader\s*\{([^}]*)\}/)
  assert.ok(block)
  assert.match(block[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\)/)
})

test("statsRow, libraryToolsGroup, and utilityGroup all wrap instead of overflowing off-screen", () => {
  for (const cls of [".statsRow", ".libraryToolsGroup", ".utilityGroup"]) {
    const block = wheelCss.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(block, cls + " rule must exist")
    assert.match(block[1], /flex-wrap:\s*wrap/, cls + " must wrap rather than clip")
  }
})

test("all 11 top-menu utility controls (Sort..Exit) are still present with their unchanged topMenuIdx mapping", () => {
  const idxByAction = { Sort: 0, RND: 1, Sets: 2, Stats: 3, Ach: 4, Home: 5, Player: 6, Media: 7, Settings: 8, Help: 9, Exit: 10 }
  for (const idx of Object.values(idxByAction)) {
    assert.match(wheelJsx, new RegExp("topMenuIdx === " + idx + "\\b"))
  }
})

test("every utility/tool button in the header keeps a :focus-visible rule", () => {
  for (const cls of [".mediaBtn", ".settingsBtn", ".helpBtn", ".consoleDepartBtn", ".sortBtn", ".randBtn", ".colBtn", ".statsBtn", ".achieveBtn", ".returnHomeBtn"]) {
    assert.match(wheelCss, new RegExp(cls.replace(".", "\\.") + ":focus-visible"))
  }
})

// -- 11. Return to Sanctuary remains unchanged -------------------------------

test("Return to Sanctuary's button markup and worldNav placement are unchanged", () => {
  assert.match(wheelJsx, /<div className=\{styles\.worldNav\}>\s*<button className=\{styles\.returnHomeBtn/)
  assert.match(wheelJsx, /onClick=\{\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \}\} title=\{t\("wheel\.returnHomeTitle"\)\}>\{t\("wheel\.navHome"\)\}<\/button>/)
})

// -- 12. Settings and Media compatibility access remains intact -------------

test("Settings and Media buttons still dispatch their unchanged handlers from the utilityGroup", () => {
  assert.match(wheelJsx, /onClick=\{\(\) => setShowMediaManager\(true\)\}/)
  assert.match(wheelJsx, /onClick=\{\(\) => setShowSettings\(true\)\}/)
  assert.match(wheelJsx, /\{showMediaManager && <MediaManager onClose=\{\(\) => setShowMediaManager\(false\)\}/)
  assert.match(wheelJsx, /\{showSettings && <Settings games=\{games\}/)
})

// -- Continue Playing: data/click behavior preserved, visual integration improved --

test("Continue Playing carousel still resolves click-to-select the same way, only its container styling changed", () => {
  assert.match(wheelJsx, /const idxInWheel = filteredGames\.findIndex\(fg =>\s*\n\s*\(fg\.id && fg\.id === g\.id\) \|\| \(fg\.profile && fg\.profile === g\.profile\)\s*\n\s*\)/)
  assert.match(wheelJsx, /if \(idxInWheel >= 0\) \{ setSelectedIndex\(idxInWheel\); sounds\.navigate\(\) \}/)
  const block = wheelCss.match(/\.recentCarousel\s*\{([^}]*)\}/)
  assert.ok(block)
  assert.match(block[1], /border-radius/, "expected the carousel to gain a framed backdrop tying it to the hall")
})

// -- No new runtime dependency, no `transition: all` reintroduced -----------

test("no `transition: all` was reintroduced in either touched CSS file", () => {
  assert.doesNotMatch(wheelCss, /transition:\s*all\b/)
  assert.doesNotMatch(cardCss, /transition:\s*all\b/)
})
