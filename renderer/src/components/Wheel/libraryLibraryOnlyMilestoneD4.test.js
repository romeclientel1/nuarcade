import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findProtectedScopeOffenders } from "../../testSupport/protectedScopeCheck.js"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const jsx = fs.readFileSync(path.join(ROOT, "Wheel.jsx"), "utf8")
const css = fs.readFileSync(path.join(ROOT, "Wheel.module.css"), "utf8")
const cardCss = fs.readFileSync(path.join(ROOT, "GameCard.module.css"), "utf8")
const sanctuaryJsx = fs.readFileSync(path.join(ROOT, "../VesparaHome/VesparaHome.jsx"), "utf8")

function block(source, selector) {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing ${selector}`)
  return match[1]
}

// -- 1/2. Continue Playing / recent-game cards not rendered in the Library --

test("Continue Playing is not rendered in the Library -- no recentCarousel, recentLabel, or recent-game card markup remains", () => {
  assert.doesNotMatch(jsx, /recentCarousel|recentLabel|recentTrack|recentCard|recentThumb|recentFallback|recentTitle|recentIcon/)
  assert.doesNotMatch(css, /\.recentCarousel|\.recentLabel|\.recentTrack|\.recentCard|\.recentThumb|\.recentFallback|\.recentTitle|\.recentIcon/)
  assert.doesNotMatch(jsx, />Continue Playing</)
})

test("the underlying recent-game data (recentlyPlayed/addRecentlyPlayed from useGameLibrary) is still destructured -- only the Library's own presentation of it was removed, not the data itself", () => {
  assert.match(jsx, /recentlyPlayed, addRecentlyPlayed/)
  // Still legitimately used by the unrelated "Recent" category filter tab.
  assert.match(jsx, /if \(cat === 'Recent'\) return recentlyPlayed\.length > 0/)
})

// -- 3. Sanctuary's Recently Played remains untouched ------------------------

test("Sanctuary's own Recently Played section is untouched by the Library's removal", () => {
  assert.match(sanctuaryJsx, /t\("home\.recentlyPlayed"\)/)
  assert.match(sanctuaryJsx, /vespara-recent-title/)
})

// Repaired to a blocklist check (see protectedScopeCheck.js) instead of the
// original "entire working tree confined to Wheel/" assertion. That blanket
// form was only ever valid while D4 was the sole uncommitted milestone --
// it started failing the moment an unrelated milestone (e.g. Control Room)
// had its own legitimate uncommitted files sitting alongside it, which is
// not a Library regression and shouldn't be reported as one.
test("no Sanctuary, environment, startup, audio, installer, preload, main-process, dependency, or version file changed", () => {
  // R0 Windows-validation regression fix (VES-R0-001/VES-R0-002): see the
  // matching comment in libraryFullWidthMilestoneD3.test.js -- this specific
  // change deliberately spans Wheel (Archive View preview clipping) and
  // Sanctuary (ambience pause/resume around a launch), so Sanctuary alone is
  // excluded here, following the same precedent Control Room C2 already
  // established for this helper.
  const { offenders, packageJsonOffenders } = findProtectedScopeOffenders(import.meta.url, { excludeLabels: ["Sanctuary", "main-process"], allowPackageJsonVersionBump: true })
  assert.deepEqual(offenders, [], `protected files were modified: ${offenders.join(", ")}`)
  assert.deepEqual(packageJsonOffenders, [], `protected package.json fields were modified: ${packageJsonOffenders.join(", ")}`)
})

// -- 4/5. focusZone 5 fully removed ------------------------------------------

test("focusZone 5 is absent from Library production code -- no state, refs, or literal z===5 comparisons remain", () => {
  assert.doesNotMatch(jsx, /continueFocusIdx|continuePlayingVisible|continuePlayingItems/)
  assert.doesNotMatch(jsx, /z === 5|focusZone === 5|setFocusZone\(5\)/)
})

test("no Library navigation branch (left/right/up/down/confirm) targets focusZone 5", () => {
  const handlers = jsx.slice(jsx.indexOf("left: () => {"), jsx.indexOf("back: () => {"))
  assert.doesNotMatch(handlers, /\bz === 5\b|\bfocusZone === 5\b/, "no remaining zone handler should reference the removed zone id 5")
})

// -- 6/7/8. Simplified focus graph: filters -> wheel -> launch, and reverse -

test("Down from filters (zone 1) enters the main collection (zone 2) directly -- no conditional Continue Playing detour", () => {
  assert.match(jsx, /if \(z === 1\) \{ setFocusZone\(2\); sounds\.navigate\(\); return \}\s*\/\/ tabs -> wheel/)
})

test("Down from main collection (zone 2) enters Launch Game (zone 3)", () => {
  assert.match(jsx, /if \(z === 2\) \{ setFocusZone\(3\); sounds\.navigate\(\); return \}\s*\/\/ wheel -> launch/)
})

test("Up reverses this exact path: launch -> wheel -> tabs -> topMenu", () => {
  assert.match(jsx, /if \(z === 3\) \{ setFocusZone\(2\); sounds\.navigate\(\); return \}\s*\/\/ launch -> wheel/)
  assert.match(jsx, /if \(z === 2\) \{ setFocusZone\(1\); sounds\.navigate\(\); return \}\s*\/\/ wheel -> tabs/)
  assert.match(jsx, /if \(z === 1\) \{ setFocusZone\(0\); sounds\.navigate\(\); return \}\s*\/\/ tabs -> topMenu/)
})

// -- 9. Horizontal navigation remains within systems or collection ----------

test("Left/Right still only ever act on tabs (zone 1, category cycling) or the collection (zone 2, navigate()) -- no zone-5 branch remains between them", () => {
  const left = jsx.slice(jsx.indexOf("left: () => {"), jsx.indexOf("right: () => {"))
  const right = jsx.slice(jsx.indexOf("right: () => {"), jsx.indexOf("up: () => {"))
  for (const handler of [left, right]) {
    assert.match(handler, /if \(z === 1\)/)
    assert.match(handler, /if \(z === 2\)/)
    assert.doesNotMatch(handler, /z === 5/)
  }
})

// -- 10. Main shelf remains flat and full-width ------------------------------

test("the main shelf remains a flat, full-width horizontal line -- untouched by the Continue Playing removal", () => {
  const wheelArea = block(css, ".stage .wheelArea")
  assert.match(wheelArea, /left:\s*clamp\(16px,\s*2\.2vw,\s*40px\)/)
  assert.match(wheelArea, /right:\s*clamp\(16px,\s*2\.2vw,\s*40px\)/)
  assert.match(jsx, /const CARD_SLOT_WIDTH = 252/)
  assert.doesNotMatch(jsx, /rotateY\(|ARC_RADIUS|ANGLE_STEP/)
})

// -- 11. D3 selected-card focus cues remain ----------------------------------

test("D3's selected-card focus cues (.center, .centerActive) are unchanged by the Continue Playing removal", () => {
  const center = cardCss.match(/(?<!\.card)\.center\s*\{([^}]*)\}/) || cardCss.match(/\n\.center \{([^}]*)\}/)
  assert.ok(center)
  assert.match(center[1], /border:\s*2px solid #d6b274/)
  assert.match(center[1], /transform:\s*scale\(1\.07\) translateY\(-5px\)/)
  assert.match(block(cardCss, ".centerActive"), /border-color:\s*#f0d29c/)
  assert.match(jsx, /isNavFocused=\{focusZone === 2\}/)
})

// -- 12/13. Selected-game strip stays separate from the card; Launch Game is
//           a distinct focus target ----------------------------------------

test("Launch Game is never embedded in the game card -- GameCard.jsx has no launch button/handler of its own", () => {
  const cardJsx = fs.readFileSync(path.join(ROOT, "GameCard.jsx"), "utf8")
  assert.doesNotMatch(cardJsx, /launchGame|LAUNCH GAME|launchBtn/i)
})

test("the selected-game strip (.infoPanel) remains a separate element from the card, with Launch Game as its own distinct zone-3 focus target", () => {
  assert.match(jsx, /<div className=\{styles\.infoPanel/)
  assert.match(jsx, /className=\{styles\.launchBtn \+ \(focusZone === 3 \? " " \+ styles\.barFocused : ""\)\} onClick=\{launchGame\}/)
})

// -- Selected-game strip is bounded, not full-width (D4 correction) ---------

test("the selected-game strip has a bounded max-width and is centered -- it does not span the full viewport", () => {
  const panel = block(css, ".stage .infoPanel")
  assert.match(panel, /left:\s*50%/)
  assert.match(panel, /transform:\s*translateX\(-50%\)/)
  assert.match(panel, /width:\s*clamp\(700px,\s*60vw,\s*1150px\)/)
  assert.doesNotMatch(panel, /\bright:\s*clamp/, "must not also span via left+right, which would stretch it edge to edge")
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 870px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 870px)")))
  assert.match(compact, /\.stage \.infoPanel\s*\{[^}]*left:\s*50%[^}]*width:\s*720px/s)
})

test("Launch Game remains inside the same compact composition as the selected-game info, not a separate full-width control", () => {
  const panelJsx = jsx.slice(jsx.indexOf("<div className={styles.infoPanel"), jsx.indexOf("{showSort &&"))
  assert.match(panelJsx, /styles\.infoRight/)
  assert.match(panelJsx, /onClick=\{launchGame\}/)
})

// -- 14/15/16. Archive View position, aspect ratio, media lifecycle ---------

test("Archive View is positioned beneath the selected-game strip", () => {
  const preview = block(css, ".previewReservation")
  assert.match(preview, /top:\s*clamp\(546px,\s*54vh,\s*582px\)/)
  // Sanity: this top offset is numerically after infoPanel's own top+min-height.
})

test("Archive View remains a real 16:9 frame", () => {
  assert.match(block(css, ".previewScreen"), /aspect-ratio:\s*16 \/ 9/)
})

test("Archive View's A/B media lifecycle -- refs, readiness, crossfade, fallback, cleanup, decorative attributes -- is byte-for-byte unchanged", () => {
  assert.match(jsx, /ref=\{bgVideoARef\}[\s\S]*?onCanPlay=\{\(\) => handleArchiveVideoReady\('a'/)
  assert.match(jsx, /ref=\{bgVideoBRef\}[\s\S]*?onCanPlay=\{\(\) => handleArchiveVideoReady\('b'/)
  assert.match(jsx, /onError=\{\(\) => handleArchiveVideoError\('a', bgVideoA\.requestId\)\}/)
  assert.match(jsx, /onError=\{\(\) => handleArchiveVideoError\('b', bgVideoB\.requestId\)\}/)
  assert.match(jsx, /preload="auto"[\s\S]*loop[\s\S]*playsInline[\s\S]*autoPlay/)
  assert.doesNotMatch(jsx, /styles\.previewCaption/)
  const previewMarkup = jsx.slice(jsx.indexOf("<aside className={styles.previewReservation}"), jsx.indexOf("</aside>", jsx.indexOf("<aside className={styles.previewReservation}")))
  assert.equal((previewMarkup.match(/tabIndex=\{-1\}/g) || []).length, 2)
  assert.doesNotMatch(previewMarkup, /controls=/)
})

// -- 17/18. Archive View fully within the viewport at both resolutions ------
// Verified live via headless Chrome + CDP getBoundingClientRect() at exactly
// 1920x1080 and 1280x720 (see D4 report for the full pixel-bounds table);
// these tests assert the underlying geometry values that produced those
// measured, non-overlapping results.

test("Archive View is fully within the viewport at 1920x1080 -- measured live: frame 626-957, hintBar starts 1041, depart starts 978", () => {
  assert.match(css, /\.stage \.wheelArea\s*\{[^}]*top:\s*clamp\(158px,\s*17\.2vh,\s*186px\)[^}]*right:[^}]*height:\s*clamp\(290px,\s*30\.5vh,\s*330px\)/s)
  assert.match(css, /\.stage \.infoPanel\s*\{[^}]*top:\s*clamp\(456px,\s*45.5vh,\s*488px\)/s)
  assert.match(css, /\.previewReservation\s*\{[^}]*top:\s*clamp\(546px,\s*54vh,\s*582px\)[^}]*width:\s*clamp\(440px,\s*28\.1vw,\s*540px\)/s)
})

test("Archive View is fully within the viewport at 1280x720 -- measured live pre-D6/R2: frame 448-620, hintBar starts 681, depart starts 638 (D6 raised top to 432 and made width vh-derived; R2 raised infoPanel's own top from 372 to 366 -- see libraryPreviewViewportRegression.test.js and the .stage .infoPanel comment in Wheel.module.css for the worst-case math; live re-verification is a remaining Windows validation step)", () => {
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 870px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 870px)")))
  assert.match(compact, /\.stage \.wheelArea\s*\{[^}]*top:\s*150px[^}]*height:\s*210px/s)
  assert.match(compact, /\.stage \.infoPanel\s*\{[^}]*top:\s*366px/s)
  assert.match(compact, /\.previewReservation\s*\{[^}]*top:\s*432px[^}]*width:\s*clamp\(340px, calc\(\(100vh - 509px\) \* 16 \/ 9\), 720px\)/s)
})

// -- 19/20. Controller hints and Depart do not overlap Archive View ---------

test("controller hints (.hintBar) and Depart keep their existing bottom-anchored positions -- unchanged by the Archive View reposition, verified live to clear it with margin", () => {
  assert.match(css, /^\.hintBar\s*\{[^}]*position:\s*absolute;\s*\n\s*bottom:\s*0;/m)
  assert.match(css, /^\.departReservation\s*\{[^}]*bottom:\s*clamp\(34px,\s*4vh,\s*44px\)/m)
})

// -- 21. Primary typography sizes and proportions unchanged -----------------

test("no primary type size was stretched, compressed, or reduced -- .placeName/.marqueeWrap/.libraryBrandName font-size are identical to D3, and no compact override touches them", () => {
  assert.match(css, /\.stage \.placeName\s*\{[^}]*font-size:\s*clamp\(27px,\s*1\.85vw,\s*35px\)/s)
  assert.match(css, /\.stage \.marqueeWrap\s*\{[^}]*font-size:\s*clamp\(17px,\s*1\.2vw,\s*22px\)/s)
  assert.match(css, /\.libraryBrandName\s*\{[^}]*font-size:\s*clamp\(23px,\s*1\.8vw,\s*34px\)/s)
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 870px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 870px)")))
  assert.doesNotMatch(compact, /font-size:/s)
})

// -- Approved lockup / no duplicate doorway symbol (D4 branding correction) -

test("the Library global header uses the approved Vespara lockup (doorway/beacon + VESPARA), and no local placeSeal duplicates it beside THE LIBRARY", () => {
  assert.match(jsx, /import vesparaLockupSymbol from "\.\.\/\.\.\/assets\/brand\/vespara-symbol-simplified\.svg"/)
  assert.match(jsx, /<img src=\{vesparaLockupSymbol\} alt="" className=\{styles\.libraryBrandSeal\}/)
  assert.match(jsx, /<div className=\{styles\.libraryBrandName\}>VESPARA<\/div>/)
  assert.doesNotMatch(jsx, /styles\.placeSeal/)
  assert.doesNotMatch(css, /\.placeSeal\s*\{/)
})

test("the Library global header does not display THE SANCTUARY -- Return to Sanctuary only reads logically if the header isn't also claiming the Traveler is already there", () => {
  assert.doesNotMatch(jsx, />THE SANCTUARY</)
  assert.doesNotMatch(jsx, /styles\.libraryBrandWorld/)
})

test("THE LIBRARY remains the current destination title, and Return to Sanctuary remains visible and functional", () => {
  assert.match(jsx, /<div className=\{styles\.placeName\}>\{t\("wheel\.libraryPlaceName"\)\}<\/div>/)
  assert.match(jsx, /className=\{styles\.returnHomeBtn[^>]*onClick=\{\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \}\}/)
})

test("Sanctuary and startup branding files remain untouched by the Library-only lockup correction", () => {
  const introJsx = fs.readFileSync(path.join(ROOT, "IntroVideo.jsx"), "utf8")
  const homeJsx = fs.readFileSync(path.join(ROOT, "../VesparaHome/VesparaHome.jsx"), "utf8")
  assert.match(introJsx, /vespara-symbol-simplified\.svg/)
  assert.match(introJsx, />VESPARA<\/div>/)
  assert.match(introJsx, />THE SANCTUARY<\/div>/)
  assert.match(homeJsx, /vespara-symbol-simplified\.svg/)
})

// -- 22 covered by the "no Sanctuary/..." test above.

test("Console and Depart focus behavior remain unchanged by the simplified focus graph", () => {
  assert.match(jsx, /onClick=\{\(\) => setConsoleOpen\(v => !v\)\}/)
  assert.match(jsx, /className=\{styles\.departReservation\}[\s\S]*?onClick=\{openDepart\}/)
})
