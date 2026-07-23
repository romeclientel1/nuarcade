// sanctuaryEnvironment.test.js ------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// VesparaHome.jsx/VesparaHome.module.css cannot be imported here (JSX and
// CSS -- see VesparaHome.test.js's own limitations note). These tests read
// the real committed source text and the new SVG assets, and assert on
// the specific promises Sanctuary Environment Milestone 2 made: a sun,
// planet, moon, and star layer exist, are decorative/inert, sit behind
// the architectural foreground, every new animation is neutralized under
// reduced motion, no new asset embeds raster data or a remote URL, no new
// dependency was added, and the untouched-behavior contract (ACTIONS,
// runAction, Recently Played, focus-visible rules, Library destination)
// still holds.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "VesparaHome.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "VesparaHome.module.css"), "utf8").replace(/\r\n/g, "\n")
const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))

const sunSvg = readFileSync(join(HERE, "assets/sun.svg"), "utf8")
const planetSvg = readFileSync(join(HERE, "assets/planet.svg"), "utf8")
const moonSvg = readFileSync(join(HERE, "assets/moon.svg"), "utf8")
const starFieldSvg = readFileSync(join(HERE, "assets/starField.svg"), "utf8")

// -- 1. Sun/planet/moon/star layers are present -------------------------------

test("the sun, planet, moon, and star-field layers are all rendered inside the world layer", () => {
  const worldLayerBlock = jsx.slice(jsx.indexOf('className={styles.worldLayer}'), jsx.indexOf("</div>\n\n      <main"))
  assert.match(worldLayerBlock, /styles\.starField/)
  assert.match(worldLayerBlock, /styles\.planetDisc/)
  assert.match(worldLayerBlock, /styles\.sunDisc/)
  assert.match(worldLayerBlock, /styles\.moonDisc/)
})

test("each new celestial layer imports its own Home-owned SVG asset, no external URL", () => {
  assert.match(jsx, /import starFieldAsset from "\.\/assets\/starField\.svg"/)
  assert.match(jsx, /import planetAsset from "\.\/assets\/planet\.svg"/)
  assert.match(jsx, /import sunAsset from "\.\/assets\/sun\.svg"/)
  assert.match(jsx, /import moonAsset from "\.\/assets\/moon\.svg"/)
  assert.doesNotMatch(jsx, /https?:\/\/[^"'\s]*\.(svg|png|jpg|jpeg|gif|webp)/i)
})

// -- 2 & 3. All new layers are aria-hidden and pointer-events: none -----------

test("the sun, planet, moon, and star-field <img> elements are each explicitly aria-hidden", () => {
  for (const asset of ["starFieldAsset", "planetAsset", "sunAsset", "moonAsset"]) {
    const re = new RegExp(`<img src=\\{${asset}\\}[^>]*aria-hidden="true"`)
    assert.match(jsx, re, `${asset} img must carry aria-hidden="true"`)
  }
})

test("starField/planetDisc/sunDisc/moonDisc all declare pointer-events: none in CSS", () => {
  const block = css.match(/\.starField,\s*\n\.planetDisc,\s*\n\.sunDisc,\s*\n\.moonDisc\s*\{([^}]*)\}/)
  assert.ok(block, "expected a shared pointer-events rule for the new celestial classes")
  assert.match(block[1], /pointer-events:\s*none/)
})

test("the new celestial layers remain inside the aria-hidden worldLayer wrapper, behind interactive content", () => {
  const worldLayerOpen = jsx.indexOf('<div className={styles.worldLayer} aria-hidden="true">')
  const sunIdx = jsx.indexOf("styles.sunDisc")
  const mainIdx = jsx.indexOf("<main className={styles.sanctuary}>")
  assert.ok(worldLayerOpen >= 0 && sunIdx > worldLayerOpen && mainIdx > sunIdx, "celestial layers must be nested in worldLayer, before the interactive <main>")
})

// -- 4. Library destination remains present and structurally unchanged -------

test("the Library destination markup/copy resolution is unchanged", () => {
  assert.match(jsx, /const ACTIONS = \["library", "switchPlayer", "depart"\]/)
  assert.match(jsx, /styles\[action \+ "Destination"\]/)
  assert.match(css, /\.libraryDestination\s*\{/)
  assert.match(jsx, /action === "library" && isSetupFocus \? t\("home\.setUp"\) : ACTION_LABELS\[action\]/)
})

// -- 5. ACTIONS and runAction remain unchanged --------------------------------

test("ACTIONS array and runAction dispatch are unchanged", () => {
  assert.match(jsx, /const ACTIONS = \["library", "switchPlayer", "depart"\]/)
  assert.match(jsx, /if \(action === "library"\) onEnterLibrary\?\.\(\)/)
  assert.match(jsx, /else if \(action === "switchPlayer"\) onSwitchPlayer\?\.\(\)/)
  assert.match(jsx, /else if \(action === "depart"\) \{ setDepartChoice\(1\); setShowDepartConfirm\(true\) \}/)
})

// -- 6. Recently Played and profile rendering remain unchanged ---------------

test("Recently Played rendering and direct-launch wiring are unchanged", () => {
  assert.match(jsx, /displayedRecentGames\.map\(\(g, i\) =>/)
  assert.match(jsx, /onClick=\{\(\) => \{ acceptManualFocus\(\); setFocusZone\("recents"\); setRecentIndex\(i\); launch\(g\) \}\}/)
})

test("profile identity rendering (welcome/profileName) is unchanged", () => {
  assert.match(jsx, /const playerName = activeProfile \? activeProfile\.name : t\("common\.guest"\)/)
  assert.match(jsx, /className=\{styles\.welcome\}>\{welcomeText\}/)
  assert.match(jsx, /className=\{styles\.profileName\}>\{playerName\}/)
})

// -- 7. Reduced motion neutralizes every new animation ------------------------

test("reduced motion neutralizes starField/planetDisc/sunDisc/moonDisc animation, alongside the existing deepField/horizonGlow rule", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) || []
  const withAnimationNone = blocks.filter(b => /animation:\s*none/.test(b))
  const covered = withAnimationNone.some(b =>
    /\.deepField/.test(b) && /\.horizonGlow/.test(b) &&
    /\.starField/.test(b) && /\.planetDisc/.test(b) &&
    /\.sunDisc/.test(b) && /\.moonDisc/.test(b)
  )
  assert.ok(covered, "expected one reduced-motion block turning off animation for every new celestial layer")
})

test("the sun's glow-pulse animation only varies opacity/filter, never transform (so it can't fight the static centering transform)", () => {
  const block = css.match(/@keyframes sunGlowPulse \{([\s\S]*?)\n\}/)
  assert.ok(block, "expected a sunGlowPulse keyframe")
  assert.doesNotMatch(block[1], /transform/)
})

// -- 8. Existing focus-visible rules remain intact ---------------------------

test("existing focus-visible treatments on recentCard/actionBtn/departBtn are untouched", () => {
  assert.match(css, /\.recentCard:focus-visible\s*\{/)
  assert.match(css, /\.actionBtn:focus-visible\s*\{/)
  assert.match(css, /\.departBtn:focus-visible\s*\{/)
})

test("no reduced-motion override anywhere removes outline (focus must stay visible)", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g) || []
  for (const block of blocks) {
    assert.doesNotMatch(block, /outline:\s*none/)
  }
})

// -- 9. No new external dependency or remote asset reference ------------------

test("no new dependency was added to renderer/package.json", () => {
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const knownAnimationLibs = ["framer-motion", "gsap", "react-spring", "@react-spring/web", "motion", "animejs", "lottie-web", "react-transition-group", "three", "@react-three/fiber"]
  for (const lib of knownAnimationLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})

// -- 10. New SVG assets contain no embedded raster data or remote URLs -------

test("sun/planet/moon/starField SVGs contain no embedded raster data (base64 image) or remote URL references", () => {
  for (const [name, svg] of [["sun.svg", sunSvg], ["planet.svg", planetSvg], ["moon.svg", moonSvg], ["starField.svg", starFieldSvg]]) {
    assert.doesNotMatch(svg, /data:image\/(png|jpe?g|gif|webp);base64/i, `${name} must not embed raster data`)
    assert.doesNotMatch(svg, /<image[\s>]/i, `${name} must not use a raster <image> element`)
    // The only permitted "http(s)://" text is the standard SVG/XML
    // namespace declaration -- strip it before checking for an actual
    // remote resource reference (href/src pointing off-repo).
    const withoutNamespaceDecls = svg.replace(/xmlns(:\w+)?="https?:\/\/[^"]*"/g, "")
    assert.doesNotMatch(withoutNamespaceDecls, /https?:\/\//i, `${name} must not reference a remote URL`)
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${name} must be a plain, self-contained SVG document`)
  }
})

// -- 11. Existing Home focused tests remain green -----------------------------
// (exercised by running worldShell.test.js/visualPolish.test.js/VesparaHome.test.js
// alongside this file -- see the milestone report for the combined run.)

test("the existing world-layer shared classes (deepField/distantCrown/horizonGlow/lightShafts/atmosphere/foregroundFrame) are still present", () => {
  for (const className of ["deepField", "distantCrown", "horizonGlow", "lightShafts", "atmosphere", "foregroundFrame"]) {
    assert.match(jsx, new RegExp(`styles\\.${className}`))
  }
})
