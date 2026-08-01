import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findProtectedScopeOffenders } from "../../testSupport/protectedScopeCheck.js"

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
  // Platform-independent: normalize CRLF first, then locate the boundary
  // with a whitespace-tolerant regex instead of a literal "\n\n      "
  // substring (which broke on Windows checkouts using CRLF line endings).
  const source = jsx.replace(/\r\n/g, "\n")

  const globalHeaderIdx = source.indexOf("<div className={styles.globalHeader}>")
  assert.ok(globalHeaderIdx > -1, "globalHeader must exist")

  const boundaryMatch = source.slice(globalHeaderIdx).match(/<\/div>\s*<div className=\{styles\.libraryTitleRow\}>/)
  assert.ok(boundaryMatch, "libraryTitleRow must immediately follow globalHeader's closing boundary")

  // Prove libraryTitleRow/placeName ("THE LIBRARY") are structurally
  // outside globalHeader, not merely that the strings exist somewhere.
  const globalHeaderBlock = source.slice(globalHeaderIdx, globalHeaderIdx + boundaryMatch.index)
  assert.doesNotMatch(globalHeaderBlock, /styles\.libraryTitleRow/, "libraryTitleRow must not be nested inside globalHeader")
  assert.doesNotMatch(globalHeaderBlock, /styles\.placeName/, "THE LIBRARY (placeName) must not render inside globalHeader")

  const titleRowIdx = globalHeaderIdx + boundaryMatch.index + boundaryMatch[0].indexOf("<div className={styles.libraryTitleRow}>")
  const placeNameIdx = source.indexOf('<div className={styles.placeName}>{t("wheel.libraryPlaceName")}</div>')
  assert.ok(placeNameIdx > titleRowIdx, "THE LIBRARY must render after libraryTitleRow opens")
})

// -- 5. No redundant active-system subtitle reintroduced ---------------------

test("the local title's subtitle contains only Collection Hall + count, no active-system/badge duplication", () => {
  const identity = jsx.slice(jsx.indexOf("<div className={styles.placeIdentity}>"), jsx.indexOf("{showUniversalDepart"))
  assert.doesNotMatch(identity, /activeCategory|collectionBadge|filterBadge|newBadge|collectionStatus|devBadge|attractBadge/)
})

// -- 6. Selected-game pedestal is compact and retains all required data -----

test("the pedestal's footprint is cut roughly a third while keeping title, platform/readiness/favorite, genre, and Launch (D4: bounded compact strip, min-height cut further to 44px)", () => {
  assert.match(block(css, ".stage .infoPanel"), /top:\s*clamp\(456px,\s*45.5vh,\s*488px\)[\s\S]*width:\s*clamp\(700px,\s*60vw,\s*1150px\)[\s\S]*min-height:\s*40px/)
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
  assert.match(center, /border:\s*2px solid #d6b274/)      // shape cue
  assert.match(center, /transform:\s*scale\(1\.07\) translateY\(-5px\)/)  // position/scale cue
  assert.match(center, /box-shadow:/)                       // contrast/glow cue
  // A further, distinct emphasis layer while controller focus actually
  // owns the collection -- not merely recolored, a wider glow + border.
  assert.match(block(cardCss, ".centerActive"), /border-color:\s*#f0d29c/)
  assert.match(cardJsx, /isCenter && isNavFocused \? ' ' \+ styles\.centerActive/)
  assert.match(jsx, /isNavFocused=\{focusZone === 2\}/)
})

// -- 9. Continue Playing removed (D4) -- superseded by
//       libraryLibraryOnlyMilestoneD4.test.js's focus-graph contract.

// -- 10-14. D2's Continue Playing zone-5 navigation was removed wholesale in
// D4 (Sanctuary owns quick-return games now); the new simplified graph
// (filters -> wheel -> launch, and exact reverse) is covered by
// libraryLibraryOnlyMilestoneD4.test.js.

test("held controller input does not leak across focus-zone transitions -- useGamepad's per-physical-button state machine is untouched", () => {
  // useGamepad's per-physical-button state machine (priming, firstAt/lastRepeatAt,
  // neutral-frame waiting) is untouched by the D2-D4 Library focus-graph passes.
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

test("compact rules reflow the header/title/shelf stack (top offsets only push down) without redefining primary type sizes (D4: Continue Playing's slot reclaimed)", () => {
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 870px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 870px)")))
  assert.match(compact, /\.stage \.globalHeader\s*\{[^}]*top:\s*12px[^}]*padding:\s*0 20px/s)
  assert.match(compact, /\.stage \.libraryTitleRow\s*\{[^}]*top:\s*60px/s)
  assert.match(compact, /\.stage \.categoryStrip\s*\{[^}]*top:\s*106px/s)
  assert.doesNotMatch(compact, /\.stage \.recentCarousel/)
  assert.match(compact, /\.stage \.wheelArea\s*\{[^}]*top:\s*150px[^}]*height:\s*210px/s)
  assert.doesNotMatch(compact, /\.placeName\s*\{[^}]*font-size:/s)
  assert.doesNotMatch(compact, /\.marqueeWrap\s*\{[^}]*font-size:/s)
})

// -- 21. No environment/Sanctuary/startup/audio/installer/preload/main-process/
//        dependency/version files changed -------------------------------------
//
// This used to assert the entire uncommitted working tree was confined to
// renderer/src/components/Wheel/ -- valid only while D2 was the sole
// uncommitted milestone. Once unrelated milestones (e.g. Control Room) have
// their own legitimate uncommitted files, that blanket check fails on files
// it was never meant to police. See protectedScopeCheck.js for the repaired,
// blocklist-based approach: it still fails if D2 (or anything else) touches
// a genuinely protected file, but no longer fails on unrelated work.

test("this milestone leaves Sanctuary, startup, audio, installer, preload, main-process, dependency, and version files untouched", () => {
  // R0 Windows-validation regression fix (VES-R0-001/VES-R0-002): see the
  // matching comment in libraryFullWidthMilestoneD3.test.js -- deliberately
  // spans Wheel and Sanctuary together, so Sanctuary alone is excluded here.
  // The later Attract Mode milestone explicitly integrates with the shared
  // Library music player so its dedicated loop cannot overlap Library music.
  const { offenders, packageJsonOffenders } = findProtectedScopeOffenders(import.meta.url, { excludeLabels: ["Sanctuary", "main-process", "audio"], allowPackageJsonVersionBump: true })
  assert.deepEqual(offenders, [], `protected files were modified: ${offenders.join(", ")}`)
  assert.deepEqual(packageJsonOffenders, [], `protected package.json fields were modified: ${packageJsonOffenders.join(", ")}`)
})
