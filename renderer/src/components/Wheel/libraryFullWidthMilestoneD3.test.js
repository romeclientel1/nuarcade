import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const jsx = fs.readFileSync(path.join(ROOT, "Wheel.jsx"), "utf8")
const css = fs.readFileSync(path.join(ROOT, "Wheel.module.css"), "utf8")
const cardCss = fs.readFileSync(path.join(ROOT, "GameCard.module.css"), "utf8")
const simplifiedSymbol = fs.readFileSync(path.join(ROOT, "../../assets/brand/vespara-symbol-simplified.svg"), "utf8")

function block(source, selector) {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing ${selector}`)
  return match[1]
}

// -- 1/2. Approved Vespara production lockup, undistorted --------------------

test("the global-header lockup uses the approved doorway/beacon asset (vespara-symbol-simplified.svg), the same one IntroVideo/VesparaHome use -- not the flat vespara-symbol-micro glyph", () => {
  assert.match(jsx, /import vesparaLockupSymbol from "\.\.\/\.\.\/assets\/brand\/vespara-symbol-simplified\.svg"/)
  assert.match(jsx, /<img src=\{vesparaLockupSymbol\} alt="" className=\{styles\.libraryBrandSeal\}/)
  // The approved asset's own nested-arch paths, verified byte-identical to
  // the copy cinematicLockup.test.js checks for the startup cinematic.
  assert.match(simplifiedSymbol, /M36,240 L36,96 L100,18 L164,96 L164,240/)
  assert.match(simplifiedSymbol, /M68,240 L68,118 L100,66 L132,118 L132,240/)
})

test("the lockup lettering is not stretched or compressed -- live text, no non-uniform transform/scale on the symbol or the VESPARA wordmark", () => {
  const seal = block(css, ".libraryBrandSeal")
  // width-only sizing (height auto) preserves the symbol's own aspect ratio
  assert.doesNotMatch(seal, /transform:\s*scale[XY]?\(/)
  const name = block(css, ".libraryBrandName")
  assert.doesNotMatch(name, /transform:\s*scale[XY]?\(/)
  assert.doesNotMatch(css, /\.libraryBrand\s*\{[^}]*transform:\s*scale[XY]?\(/s)
})

test("placeSeal (the small local-title glyph) keeps using vespara-symbol-micro.svg -- it was never the lockup claim, only the header mark switched", () => {
  assert.match(jsx, /<img src=\{vesparaMicroMark\} alt="" aria-hidden="true" className=\{styles\.placeSeal\}/)
})

// -- 3. No permanent right-side collection column for Archive View -----------

test("Archive View no longer reserves a fixed right-side column -- it's centered in a lower band", () => {
  const preview = block(css, ".previewReservation")
  assert.doesNotMatch(preview, /\bright:\s*clamp/)
  assert.match(preview, /left:\s*50%/)
  assert.match(preview, /transform:\s*translateX\(-50%\)/)
})

// -- 4/5. System navigation spans the expanded width, more items visible -----

test("the system row spans the expanded width (left+right margins, not a fixed collection-column width)", () => {
  const strip = block(css, ".stage .categoryStrip")
  assert.match(strip, /left:\s*clamp\(24px,\s*3vw,\s*56px\)/)
  assert.match(strip, /right:\s*clamp\(24px,\s*3vw,\s*56px\)/)
  assert.doesNotMatch(strip, /\bwidth:\s*min\(/)
})

test("tab geometry (SLOT_WIDTH, opacity falloff) is untouched -- more systems become visible purely from the wider container, not from cramming tabs closer together", () => {
  assert.match(jsx, /const SLOT_WIDTH = 168/)
  assert.match(jsx, /opacity = signed === 0 \? 1 : Math\.max\(0\.35, 1 - absPos \* 0\.11\)/)
})

// -- 6. Continue Playing spans the expanded width -----------------------------

test("Continue Playing spans the expanded width and can show significantly more than 6 entries", () => {
  const recent = block(css, ".stage .recentCarousel")
  assert.match(recent, /left:\s*clamp\(24px,\s*3vw,\s*56px\)/)
  assert.match(recent, /right:\s*clamp\(24px,\s*3vw,\s*56px\)/)
  assert.doesNotMatch(recent, /\bwidth:\s*min\(/)
  assert.match(jsx, /const continuePlayingItems = recentlyPlayed\.slice\(0,\s*12\)/)
})

test("recentCard/recentThumb keep their exact D2 cover proportions -- the extra width alone increases visible count, nothing was shrunk to fit more", () => {
  const cardMatch = css.match(/\n\.recentCard \{([^}]*)\}/)
  assert.ok(cardMatch)
  assert.match(cardMatch[1], /width:\s*84px/)
  const thumb = block(css, ".recentThumb")
  assert.match(thumb, /width:\s*84px/)
  assert.match(thumb, /height:\s*62px/)
})

// -- 7/8/9. Main collection spans the expanded width, flat shelf, aspect ratio

test("the main shelf spans the expanded width and is a flat horizontal line -- no arc radius, no rotateY perspective, no vertical curve", () => {
  const wheelArea = block(css, ".stage .wheelArea")
  assert.match(wheelArea, /left:\s*clamp\(16px,\s*2\.2vw,\s*40px\)/)
  assert.match(wheelArea, /right:\s*clamp\(16px,\s*2\.2vw,\s*40px\)/)
  assert.doesNotMatch(wheelArea, /\bwidth:\s*min\(/)
  assert.match(jsx, /const CARD_SLOT_WIDTH = 230/)
  assert.match(jsx, /const x = signed \* CARD_SLOT_WIDTH/)
  assert.doesNotMatch(jsx, /rotateY\(/)
  assert.doesNotMatch(jsx, /Math\.sin\(|Math\.cos\(|ARC_RADIUS|ANGLE_STEP/)
  // No translateY term in the transform -- straight horizontal axis, no curve.
  assert.match(jsx, /transform: 'translateX\(' \+ x \+ 'px\) scale\(' \+ scale \+ '\)'/)
})

test("the flat shelf's scale/opacity falloff is gentle -- no card shrinks into an unreadable sliver, and neighbors keep visible separation without heavy overlap", () => {
  assert.match(jsx, /const scale = signed === 0 \? 1 : Math\.max\(0\.74, 1 - absPos \* 0\.065\)/)
  assert.match(jsx, /const opacity = signed === 0 \? 1 : Math\.max\(0\.5, 1 - absPos \* 0\.12\)/)
})

test("cover art aspect ratio is preserved -- GameCard's .card box dimensions and .artWrap sizing are untouched by the D3 shelf pass", () => {
  assert.match(cardCss, /\.card\s*\{[^}]*width:\s*240px;[^}]*height:\s*320px;/s)
  assert.match(cardCss, /\.artWrap\s*\{[^}]*width:\s*100%;[^}]*height:\s*68%;/s)
})

// -- 10/11. D2 focus cues survive -------------------------------------------

test("D2's selected-card focus cues (.center, .centerActive) are unchanged by the D3 shelf geometry pass", () => {
  const center = cardCss.match(/(?<!\.card)\.center\s*\{([^}]*)\}/) || cardCss.match(/\n\.center \{([^}]*)\}/)
  assert.ok(center)
  assert.match(center[1], /border:\s*1px solid #d6b274/)
  assert.match(center[1], /transform:\s*scale\(1\.07\) translateY\(-5px\)/)
  assert.match(block(cardCss, ".centerActive"), /border-color:\s*#f0d29c/)
  assert.match(jsx, /isNavFocused=\{focusZone === 2\}/)
})

test("D2's Continue Playing focus cues (.recentCardFocused, .recentLabelFocused) are unchanged by the D3 width pass", () => {
  assert.match(jsx, /const isFocused = focusZone === 5 && continueFocusIdx === idx/)
  assert.match(jsx, /styles\.recentCard \+ \(isFocused \? " " \+ styles\.recentCardFocused : ""\)/)
  assert.match(block(css, ".recentCardFocused"), /box-shadow:/)
  assert.match(jsx, /styles\.recentLabel \+ \(focusZone === 5 \? " " \+ styles\.recentLabelFocused : ""\)/)
})

// -- 12. D2 vertical navigation remains exact --------------------------------

test("D2's exact focus-zone graph (filters -> continue -> wheel -> launch, and reverse) is untouched by the D3 layout pass", () => {
  assert.match(jsx, /if \(z === 1\) \{ setFocusZone\(continuePlayingVisibleRef\.current \? 5 : 2\); sounds\.navigate\(\); return \}/)
  assert.match(jsx, /if \(z === 5\) \{ setFocusZone\(2\); sounds\.navigate\(\); return \}\s*\/\/ continue playing -> wheel/)
  assert.match(jsx, /if \(z === 2\) \{ setFocusZone\(3\); sounds\.navigate\(\); return \}\s*\/\/ wheel -> launch/)
  assert.match(jsx, /if \(z === 2\) \{ setFocusZone\(continuePlayingVisibleRef\.current \? 5 : 1\); sounds\.navigate\(\); return \}/)
  assert.match(jsx, /if \(z === 5\) \{ setFocusZone\(1\); sounds\.navigate\(\); return \}\s*\/\/ continue playing -> tabs/)
})

// -- 13. Selected-game strip is compact and retains handlers/data -----------

test("the selected-game strip is a full-width top-anchored shallow row retaining title, meta, genre, and Launch's handler", () => {
  const panel = block(css, ".stage .infoPanel")
  assert.match(panel, /top:\s*clamp\(556px,\s*55\.5vh,\s*602px\)/)
  assert.match(panel, /min-height:\s*52px/)
  assert.doesNotMatch(panel, /\bbottom:/)
  const panelJsx = jsx.slice(jsx.indexOf("<div className={styles.infoPanel"), jsx.indexOf("{showSort &&"))
  assert.match(panelJsx, /styles\.marqueeWrap[\s\S]*current\.title/)
  assert.match(panelJsx, /styles\.infoMeta[\s\S]*current\.system[\s\S]*current\.status/)
  assert.match(panelJsx, /styles\.infoSummary[^>]*>\{current\.genre\}/)
  assert.match(panelJsx, /onClick=\{launchGame\}/)
  assert.doesNotMatch(panelJsx, /infoExe|TeknoParrotUi\.exe/)
})

// -- 14/15/16/17. Archive View position, aspect ratio, lifecycle, no caption -

test("Archive View is positioned beneath the collection (top offset after .infoPanel, not beside it)", () => {
  const preview = block(css, ".previewReservation")
  assert.match(preview, /top:\s*clamp\(650px,\s*63\.5vh,\s*696px\)/)
})

test("Archive View remains a real 16:9 frame", () => {
  assert.match(block(css, ".previewScreen"), /aspect-ratio:\s*16 \/ 9/)
})

test("Archive View's A/B media lifecycle is behaviorally unchanged -- same refs, same readiness/crossfade/fallback/cleanup handlers, same audio-relevant attributes", () => {
  assert.match(jsx, /ref=\{bgVideoARef\}[\s\S]*?onCanPlay=\{\(\) => handleArchiveVideoReady\('a'/)
  assert.match(jsx, /ref=\{bgVideoBRef\}[\s\S]*?onCanPlay=\{\(\) => handleArchiveVideoReady\('b'/)
  assert.match(jsx, /onError=\{\(\) => handleArchiveVideoError\('a', bgVideoA\.requestId\)\}/)
  assert.match(jsx, /onError=\{\(\) => handleArchiveVideoError\('b', bgVideoB\.requestId\)\}/)
  assert.match(jsx, /preload="auto"[\s\S]*loop[\s\S]*playsInline[\s\S]*autoPlay/)
})

test("no duplicate selected-game caption returns beneath Archive View", () => {
  assert.doesNotMatch(jsx, /styles\.previewCaption/)
})

// -- 18/19. Whole composition fits at both target resolutions ---------------

test("the full stack (header through Archive View) fits within a 1080px-tall viewport without any element relying on scrolling", () => {
  assert.doesNotMatch(css, /\.stage\s*\{[^}]*overflow-y:\s*auto/s)
  assert.match(css, /\.stage\s*\{[^}]*overflow:\s*hidden/s)
  // Spot-check the cumulative top-down budget stays comfortably inside 1080:
  // globalHeader(~24) -> libraryTitleRow(~92) -> categoryStrip(~136) ->
  // recentCarousel(~182) -> wheelArea(top 290 + height 310 = 600) ->
  // infoPanel(top 602 + ~52 = 654) -> previewReservation(top 696 + ~315 = ~1011).
  assert.match(css, /\.stage \.wheelArea\s*\{[^}]*top:\s*clamp\(246px,\s*27vh,\s*290px\)[^}]*right:[^}]*height:\s*clamp\(270px,\s*29vh,\s*310px\)/s)
  assert.match(css, /\.previewReservation\s*\{[^}]*top:\s*clamp\(650px,\s*63\.5vh,\s*696px\)/s)
})

test("the compact 1280x720 stack reflows without overlap and Archive View stays visible (smaller, not hidden)", () => {
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 760px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 760px)")))
  assert.match(compact, /\.stage \.wheelArea\s*\{[^}]*top:\s*218px[^}]*height:\s*192px/s)
  assert.match(compact, /\.stage \.infoPanel\s*\{[^}]*top:\s*418px/s)
  assert.match(compact, /\.previewReservation\s*\{[^}]*top:\s*470px[^}]*width:\s*300px/s)
})

// -- 20. Primary typography integrity ----------------------------------------

test("no primary type size was stretched, compressed, or reduced below D2's thresholds -- .placeName/.marqueeWrap/.libraryBrandName font-size is identical to D2, and no compact override touches them", () => {
  assert.match(css, /\.stage \.placeName\s*\{[^}]*font-size:\s*clamp\(27px,\s*1\.85vw,\s*35px\)/s)
  assert.match(css, /\.stage \.marqueeWrap\s*\{[^}]*font-size:\s*clamp\(17px,\s*1\.2vw,\s*22px\)/s)
  assert.match(css, /\.libraryBrandName\s*\{[^}]*font-size:\s*clamp\(23px,\s*1\.8vw,\s*34px\)/s)
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 760px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 760px)")))
  assert.doesNotMatch(compact, /font-size:/s)
})

// -- 21. No environment/Sanctuary/startup/audio/installer/preload/main-process/
//        dependency/version files changed, and the D3 diff stays scoped -----

test("this milestone's uncommitted changes stay confined to renderer/src/components/Wheel", () => {
  let changed = []
  try {
    const repoRoot = path.join(ROOT, "../../../..")
    const out = execSync("git status --porcelain", { cwd: repoRoot, encoding: "utf8" })
    changed = out.split("\n").map(l => l.trim()).filter(Boolean).map(l => l.replace(/^[AMDRCU?!]{1,2}\s+/, ""))
  } catch {
    return
  }
  const allowed = /^renderer\/src\/components\/Wheel\//
  const offenders = changed.filter(f => !allowed.test(f))
  assert.deepEqual(offenders, [], `unexpected uncommitted files outside renderer/src/components/Wheel: ${offenders.join(", ")}`)
})
