import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const jsx = fs.readFileSync(path.join(ROOT, "Wheel.jsx"), "utf8")
const css = fs.readFileSync(path.join(ROOT, "Wheel.module.css"), "utf8")
const cardJsx = fs.readFileSync(path.join(ROOT, "GameCard.jsx"), "utf8")
const cardCss = fs.readFileSync(path.join(ROOT, "GameCard.module.css"), "utf8")

function block(source, selector) {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing ${selector}`)
  return match[1]
}

// -- 1. Vespara lockup is in the centered global-header region --------------

test("the Vespara lockup sits in the centered column of the global header, not the collection column", () => {
  const globalHeader = block(css, ".stage .globalHeader")
  assert.match(globalHeader, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\)/)
  assert.match(block(css, ".stage .libraryBrand"), /justify-self:\s*center/)
  assert.match(jsx, /<div className=\{styles\.globalHeader\}>[\s\S]*?<div className=\{styles\.libraryBrand\} aria-hidden="true">/)
})

// -- 2. Return is in the upper-left global-header region ---------------------

test("Return to Sanctuary is pinned to the global header's start column", () => {
  assert.match(block(css, ".stage .worldNav"), /justify-self:\s*start/)
  assert.match(jsx, /<div className=\{styles\.globalHeader\}>\s*\n\s*<div className=\{styles\.worldNav\}>/)
})

// -- 3. Console appears immediately before Welcome Back in the upper-right --

test("Console (or the search field that replaces it) renders immediately before Welcome Back inside headerRight", () => {
  const headerRightIdx = jsx.indexOf("<div className={styles.headerRight}>")
  const ternaryIdx = jsx.indexOf("{showSearch ? (", headerRightIdx)
  const travelerIdx = jsx.indexOf("<div className={styles.travelerGreeting}", headerRightIdx)
  assert.ok(headerRightIdx > -1 && ternaryIdx > headerRightIdx && travelerIdx > ternaryIdx,
    "travelerGreeting (Welcome Back) must render after the Console/search ternary, both inside headerRight")
  assert.match(block(css, ".stage .headerRight"), /justify-self:\s*end/)
})

// -- 4. THE LIBRARY remains a separate local title ---------------------------

test("THE LIBRARY renders in its own libraryTitleRow, separate from and after the global header", () => {
  const globalHeaderCloseIdx = jsx.indexOf("</div>\n\n      <div className={styles.libraryTitleRow}>")
  const titleRowIdx = jsx.indexOf("<div className={styles.libraryTitleRow}>")
  const placeNameIdx = jsx.indexOf('<div className={styles.placeName}>{t("wheel.libraryPlaceName")}</div>')
  assert.ok(globalHeaderCloseIdx > -1 && titleRowIdx === globalHeaderCloseIdx + "</div>\n\n      ".length)
  assert.ok(placeNameIdx > titleRowIdx)
})

// -- 5. No redundant active-system subtitle reintroduced ---------------------

test("the local title's subtitle contains only Collection Hall + count, no active-system/badge duplication", () => {
  const identity = jsx.slice(jsx.indexOf("<div className={styles.placeIdentity}>"), jsx.indexOf("{showUniversalDepart"))
  assert.doesNotMatch(identity, /activeCategory|collectionBadge|filterBadge|newBadge|collectionStatus|devBadge|attractBadge/)
})

// -- 6. Selected-game pedestal is compact and retains all required data -----

test("the pedestal's footprint is cut roughly a third while keeping title, platform/readiness/favorite, genre, and Launch (D3: now a full-width top-anchored strip, min-height cut further to 52px)", () => {
  assert.match(block(css, ".stage .infoPanel"), /top:\s*clamp\(556px,\s*55\.5vh,\s*602px\)[\s\S]*min-height:\s*52px/)
  const panel = jsx.slice(jsx.indexOf("<div className={styles.infoPanel"), jsx.indexOf("{showSort &&"))
  assert.match(panel, /styles\.marqueeWrap[\s\S]*current\.title/)
  assert.match(panel, /styles\.infoMeta[\s\S]*current\.system[\s\S]*current\.status/)
  assert.match(panel, /styles\.favBtn/)
  assert.match(panel, /styles\.infoSummary[^>]*>\{current\.genre\}/)
  assert.doesNotMatch(panel, /infoExe|TeknoParrotUi\.exe|retroarch\.exe|VPXStarter\.exe/)
})

// -- 7. Launch Game retains its handler and controller mapping --------------

test("Launch Game keeps its onClick handler and zone-3 controller mapping", () => {
  assert.match(jsx, /className=\{styles\.launchBtn[^>]*onClick=\{launchGame\}/)
  assert.match(jsx, /if \(z === 3\) \{ launchGame\(\); return \}/)
  assert.match(jsx, /if \(z === 2\) \{ setFocusZone\(3\); sounds\.navigate\(\); return \}\s*\/\/ wheel -> launch/)
})

// -- 8. Main collection selected cards use >= 2 non-color-only visual cues --

test("the selected card combines a shape/border cue with a position/scale cue, not color alone", () => {
  const centerMatch = cardCss.match(/(?<!\.card)\.center\s*\{([^}]*)\}/) || cardCss.match(/\n\.center \{([^}]*)\}/)
  assert.ok(centerMatch)
  const center = centerMatch[1]
  assert.match(center, /border:\s*1px solid #d6b274/)      // shape cue
  assert.match(center, /transform:\s*scale\(1\.07\) translateY\(-5px\)/)  // position/scale cue
  assert.match(center, /box-shadow:/)                       // contrast/glow cue
  // A further, distinct emphasis layer while controller focus actually
  // owns the collection -- not merely recolored, a wider glow + border.
  assert.match(block(cardCss, ".centerActive"), /border-color:\s*#f0d29c/)
  assert.match(cardJsx, /isCenter && isNavFocused \? ' ' \+ styles\.centerActive/)
  assert.match(jsx, /isNavFocused=\{focusZone === 2\}/)
})

// -- 9. Continue Playing focused items have an explicit visual state --------

test("a focused Continue Playing item gets a distinct frame/lift/title-brighten, separate from plain hover", () => {
  assert.match(jsx, /const isFocused = focusZone === 5 && continueFocusIdx === idx/)
  assert.match(jsx, /styles\.recentCard \+ \(isFocused \? " " \+ styles\.recentCardFocused : ""\)/)
  const focused = block(css, ".recentCardFocused")
  assert.match(focused, /box-shadow:/)
  assert.match(focused, /transform:\s*translateY/)
  assert.match(block(css, ".recentCardFocused .recentTitle"), /color:/)
  // Row-level cue is separate from any one item's cue.
  assert.match(jsx, /styles\.recentLabel \+ \(focusZone === 5 \? " " \+ styles\.recentLabelFocused : ""\)/)
})

// -- 10. Down from filters enters Continue Playing when it has items --------

test("Down from the platform filters enters Continue Playing when it's visible", () => {
  assert.match(jsx, /if \(z === 1\) \{ setFocusZone\(continuePlayingVisibleRef\.current \? 5 : 2\); sounds\.navigate\(\); return \}/)
})

// -- 11. Down from Continue Playing enters the main collection --------------

test("Down from Continue Playing lands in the main collection (zone 2)", () => {
  assert.match(jsx, /if \(z === 5\) \{ setFocusZone\(2\); sounds\.navigate\(\); return \}\s*\/\/ continue playing -> wheel/)
})

// -- 12. Down from main collection reaches Launch Game/action focus ---------

test("Down from the main collection still reaches Launch Game (zone 3), unchanged from D1", () => {
  assert.match(jsx, /if \(z === 2\) \{ setFocusZone\(3\); sounds\.navigate\(\); return \}\s*\/\/ wheel -> launch/)
})

// -- 13. Upward navigation reverses the path predictably ---------------------

test("Up reverses the exact same path: launch -> wheel -> continue playing (or tabs) -> tabs -> topMenu", () => {
  assert.match(jsx, /if \(z === 3\) \{ setFocusZone\(2\); sounds\.navigate\(\); return \}\s*\/\/ launch -> wheel/)
  assert.match(jsx, /if \(z === 2\) \{ setFocusZone\(continuePlayingVisibleRef\.current \? 5 : 1\); sounds\.navigate\(\); return \}/)
  assert.match(jsx, /if \(z === 5\) \{ setFocusZone\(1\); sounds\.navigate\(\); return \}\s*\/\/ continue playing -> tabs/)
  assert.match(jsx, /if \(z === 1\) \{ setFocusZone\(0\); sounds\.navigate\(\); return \}\s*\/\/ tabs -> topMenu/)
})

// -- 14. Empty Continue Playing safely skips to main collection -------------

test("both Up (from wheel) and Down (from tabs) fall back to skipping Continue Playing when it's empty/hidden", () => {
  assert.match(jsx, /setFocusZone\(continuePlayingVisibleRef\.current \? 5 : 1\)/)  // up: wheel -> continue or tabs
  assert.match(jsx, /setFocusZone\(continuePlayingVisibleRef\.current \? 5 : 2\)/)  // down: tabs -> continue or wheel
  // The visibility flag itself mirrors the recentCarousel's own render guard exactly.
  assert.match(jsx, /const continuePlayingVisible = !libraryEmpty && !cabinetMode && !screenshotMode && continuePlayingItems\.length > 0 && activeCategory !== "Recent" && !debouncedSearch/)
  assert.match(jsx, /\{continuePlayingVisible && \(\s*\n\s*<div className=\{styles\.recentCarousel\}>/)
})

// -- 15. Horizontal navigation remains within the active shelf --------------

test("Left/Right while Continue Playing is focused only move continueFocusIdx, never focusZone", () => {
  const leftBranch = jsx.match(/if \(z === 5\) \{ const n = continuePlayingItemsRef\.current\.length; if \(n > 0\) \{ setContinueFocusIdx\(i => \(i <= 0 \? n - 1 : i - 1\)\); sounds\.navigate\(\) \} return \}/)
  const rightBranch = jsx.match(/if \(z === 5\) \{ const n = continuePlayingItemsRef\.current\.length; if \(n > 0\) \{ setContinueFocusIdx\(i => \(i >= n - 1 \? 0 : i \+ 1\)\); sounds\.navigate\(\) \} return \}/)
  assert.ok(leftBranch, "left() must move continueFocusIdx within the row")
  assert.ok(rightBranch, "right() must move continueFocusIdx within the row")
  assert.doesNotMatch(leftBranch[0], /setFocusZone/)
  assert.doesNotMatch(rightBranch[0], /setFocusZone/)
})

// -- 16. Focus is restored to the previous item in each shelf where applicable

test("continueFocusIdx is never reset back to 0 on zone change -- only clamped when the list itself shrinks", () => {
  assert.match(jsx, /useEffect\(\(\) => \{\s*\n\s*setContinueFocusIdx\(i => Math\.min\(i, Math\.max\(0, continuePlayingItems\.length - 1\)\)\)\s*\n\s*\}, \[continuePlayingItems\.length\]\)/)
  assert.doesNotMatch(jsx, /setContinueFocusIdx\(0\)/)
  // tabFocusIdx (filters) already persisted this way pre-D2 -- unchanged.
  assert.doesNotMatch(jsx, /setTabFocusIdx\(0\)\s*$/m)
})

// -- 17. Held controller input does not leak across focus-zone transitions --

test("the new zone-5 branches fire exactly once per press via the existing sounds.navigate() pattern, no bespoke repeat/hold logic added", () => {
  assert.doesNotMatch(jsx, /continueFocusIdx[\s\S]{0,80}setInterval/)
  assert.doesNotMatch(jsx, /continueFocusIdx[\s\S]{0,80}setTimeout/)
  // useGamepad's per-physical-button state machine (priming, firstAt/lastRepeatAt,
  // neutral-frame waiting) is untouched -- Wheel.jsx only adds new zone
  // branches inside the same up/down/left/right/confirm handlers it already had.
  const gamepadHook = fs.readFileSync(path.join(ROOT, "../../hooks/useGamepad.js"), "utf8")
  assert.match(gamepadHook, /waitingForNeutralRef/)
  assert.match(gamepadHook, /firstAt, lastRepeatAt/)
})

// -- 18. Archive View behavior remains unchanged -----------------------------

test("Archive View's A/B lifecycle, refs, and readiness handlers are untouched", () => {
  assert.match(jsx, /ref=\{bgVideoARef\}[\s\S]*?onCanPlay=\{\(\) => handleArchiveVideoReady\('a'/)
  assert.match(jsx, /ref=\{bgVideoBRef\}[\s\S]*?onCanPlay=\{\(\) => handleArchiveVideoReady\('b'/)
  assert.match(jsx, /preload="auto"[\s\S]*loop[\s\S]*playsInline[\s\S]*autoPlay/)
})

// -- 19. Console, Return, and Depart remain functional -----------------------

test("Console, Return, and Depart keep their existing onClick handlers", () => {
  assert.match(jsx, /onClick=\{\(\) => setConsoleOpen\(v => !v\)\}/)
  assert.match(jsx, /onClick=\{\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \}\}/)
  assert.match(jsx, /className=\{styles\.departReservation\}[\s\S]*?onClick=\{openDepart\}/)
})

// -- 20. 1920x1080 and 1280x720 layouts avoid overlap ------------------------

test("compact rules reflow the header/title/shelf stack (top offsets only push down) without redefining primary type sizes (D3 full-width values)", () => {
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 760px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 760px)")))
  assert.match(compact, /\.stage \.globalHeader\s*\{[^}]*top:\s*12px[^}]*padding:\s*0 20px/s)
  assert.match(compact, /\.stage \.libraryTitleRow\s*\{[^}]*top:\s*60px/s)
  assert.match(compact, /\.stage \.categoryStrip\s*\{[^}]*top:\s*106px/s)
  assert.match(compact, /\.stage \.recentCarousel\s*\{[^}]*top:\s*146px/s)
  assert.match(compact, /\.stage \.wheelArea\s*\{[^}]*top:\s*218px/s)
  assert.doesNotMatch(compact, /\.placeName\s*\{[^}]*font-size:/s)
  assert.doesNotMatch(compact, /\.marqueeWrap\s*\{[^}]*font-size:/s)
})

// -- 21. No environment/Sanctuary/startup/audio/installer/preload/main-process/
//        dependency/version files changed -------------------------------------

test("this milestone's changes stay confined to renderer/src/components/Wheel", () => {
  // Scoped to the *uncommitted* working tree, not a fixed base commit --
  // the repo may already have unrelated, separately-approved commits (e.g.
  // the 5.8.1 version bump) sitting between D1 and this milestone's own
  // work, and those must not be misread as D2 touching version files.
  let changed = []
  try {
    const repoRoot = path.join(ROOT, "../../../..")
    const out = execSync("git status --porcelain", { cwd: repoRoot, encoding: "utf8" })
    changed = out.split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.replace(/^[AMDRCU?!]{1,2}\s+/, ""))
  } catch {
    // No git available in this environment -- nothing to assert against.
    return
  }
  const allowed = /^renderer\/src\/components\/Wheel\//
  const offenders = changed.filter(f => !allowed.test(f))
  assert.deepEqual(offenders, [], `unexpected uncommitted files outside renderer/src/components/Wheel: ${offenders.join(", ")}`)
})
