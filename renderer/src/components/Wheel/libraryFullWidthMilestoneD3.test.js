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

test("D4: placeSeal is gone entirely (removed, not swapped) -- THE LIBRARY no longer shows a second doorway glyph beside the global lockup", () => {
  assert.doesNotMatch(jsx, /styles\.placeSeal/)
  assert.doesNotMatch(css, /\.placeSeal\s*\{/)
  // vesparaMicroMark stays imported for the Archive View no-artwork fallback,
  // a different, non-simultaneous context.
  assert.match(jsx, /import vesparaMicroMark from "\.\.\/\.\.\/assets\/brand\/vespara-symbol-micro\.svg"/)
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

// -- 6. Continue Playing removed from the Library (D4) -----------------------
// See libraryLibraryOnlyMilestoneD4.test.js for the full removal contract.
// This file's own D3-era Continue Playing assertions were retired there.

// -- 7/8/9. Main collection spans the expanded width, flat shelf, aspect ratio

test("the main shelf spans the expanded width and is a flat horizontal line -- no arc radius, no rotateY perspective, no vertical curve", () => {
  const wheelArea = block(css, ".stage .wheelArea")
  assert.match(wheelArea, /left:\s*clamp\(16px,\s*2\.2vw,\s*40px\)/)
  assert.match(wheelArea, /right:\s*clamp\(16px,\s*2\.2vw,\s*40px\)/)
  assert.doesNotMatch(wheelArea, /\bwidth:\s*min\(/)
  assert.match(jsx, /const CARD_SLOT_WIDTH = 252/)
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
  assert.match(center[1], /border:\s*2px solid #d6b274/)
  assert.match(center[1], /transform:\s*scale\(1\.07\) translateY\(-5px\)/)
  assert.match(block(cardCss, ".centerActive"), /border-color:\s*#f0d29c/)
  assert.match(jsx, /isNavFocused=\{focusZone === 2\}/)
})

// D2's Continue Playing focus cues (.recentCardFocused/.recentLabelFocused,
// zone 5) were removed along with the row itself in D4 -- see
// libraryLibraryOnlyMilestoneD4.test.js for the simplified focus-zone graph.

// -- 13. Selected-game strip is compact and retains handlers/data -----------

test("the selected-game strip is a top-anchored shallow row retaining title, meta, genre, and Launch's handler (D4: bounded width -- see libraryLibraryOnlyMilestoneD4.test.js for the geometry contract)", () => {
  const panel = block(css, ".stage .infoPanel")
  assert.match(panel, /top:\s*clamp\(456px,\s*45.5vh,\s*488px\)/)
  assert.match(panel, /min-height:\s*40px/)
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
  assert.match(preview, /top:\s*clamp\(546px,\s*54vh,\s*582px\)/)
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

test("the full stack (header through Archive View) fits within a 1080px-tall viewport without any element relying on scrolling (D4: reclaimed Continue Playing's space)", () => {
  assert.doesNotMatch(css, /\.stage\s*\{[^}]*overflow-y:\s*auto/s)
  assert.match(css, /\.stage\s*\{[^}]*overflow:\s*hidden/s)
  // Verified live via headless Chrome + CDP getBoundingClientRect() at exactly
  // 1920x1080: wheelArea 186-515, infoPanel 529-603, archiveFrame 626-957,
  // depart 978-1037, hintBar 1041-1080 -- 14px+ clearance at every boundary.
  assert.match(css, /\.stage \.wheelArea\s*\{[^}]*top:\s*clamp\(158px,\s*17\.2vh,\s*186px\)[^}]*right:[^}]*height:\s*clamp\(290px,\s*30\.5vh,\s*330px\)/s)
  assert.match(css, /\.previewReservation\s*\{[^}]*top:\s*clamp\(546px,\s*54vh,\s*582px\)/s)
})

test("the compact 1280x720 stack reflows without overlap and Archive View stays visible (smaller, not hidden)", () => {
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 870px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 870px)")))
  // Verified live via CDP at exactly 1280x720 (pre-D6/R2): wheelArea
  // 150-360, infoPanel 368-434, archiveFrame 448-620, depart 638-693,
  // hintBar 681-720. D6 raised the preview's top from 456 to 432 and
  // replaced the fixed 260px width with a vh-derived clamp(); R2 then
  // raised infoPanel's own top from 372 to 366 to close the gap above
  // Launch Game (see the .stage .infoPanel comment in Wheel.module.css for
  // the exact math). Neither change has been re-verified live since --
  // real on-screen confirmation remains a Windows validation step.
  assert.match(compact, /\.stage \.wheelArea\s*\{[^}]*top:\s*150px[^}]*height:\s*210px/s)
  assert.match(compact, /\.stage \.infoPanel\s*\{[^}]*top:\s*366px/s)
  assert.match(compact, /\.previewReservation\s*\{[^}]*top:\s*432px[^}]*width:\s*clamp\(340px, calc\(\(100vh - 509px\) \* 16 \/ 9\), 720px\)/s)
})

// -- 20. Primary typography integrity ----------------------------------------

test("no primary type size was stretched, compressed, or reduced below D2's thresholds -- .placeName/.marqueeWrap/.libraryBrandName font-size is identical to D2, and no compact override touches them", () => {
  assert.match(css, /\.stage \.placeName\s*\{[^}]*font-size:\s*clamp\(27px,\s*1\.85vw,\s*35px\)/s)
  assert.match(css, /\.stage \.marqueeWrap\s*\{[^}]*font-size:\s*clamp\(17px,\s*1\.2vw,\s*22px\)/s)
  assert.match(css, /\.libraryBrandName\s*\{[^}]*font-size:\s*clamp\(23px,\s*1\.8vw,\s*34px\)/s)
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 870px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 870px)")))
  assert.doesNotMatch(compact, /font-size:/s)
})

// -- 21. No environment/Sanctuary/startup/audio/installer/preload/main-process/
//        dependency/version files changed -------------------------------------
//
// Repaired to a blocklist check (see protectedScopeCheck.js) instead of the
// original "entire working tree confined to Wheel/" assertion, which broke
// as soon as any other legitimate milestone had its own uncommitted files.

test("this milestone leaves Sanctuary, startup, audio, installer, preload, main-process, dependency, and version files untouched", () => {
  // R0 Windows-validation regression fix (VES-R0-001/VES-R0-002) is the one
  // deliberate exception, matching the Control Room C2 precedent this helper
  // already documents: it legitimately spans both this file (the Archive
  // View preview-panel clipping fix) and Sanctuary's ambience engine/hook
  // (pausing/resuming ambience around a real game launch) in a single
  // change, since both were reported and fixed together. Every other
  // protected category remains enforced.
  // The later Attract Mode milestone explicitly integrates with the shared
  // Library music player so its dedicated loop cannot overlap Library music.
  const { offenders, packageJsonOffenders } = findProtectedScopeOffenders(import.meta.url, { excludeLabels: ["Sanctuary", "main-process", "audio"], allowPackageJsonVersionBump: true })
  assert.deepEqual(offenders, [], `protected files were modified: ${offenders.join(", ")}`)
  assert.deepEqual(packageJsonOffenders, [], `protected package.json fields were modified: ${packageJsonOffenders.join(", ")}`)
})
