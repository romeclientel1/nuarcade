import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const jsx = fs.readFileSync(path.join(ROOT, "Wheel.jsx"), "utf8")
const css = fs.readFileSync(path.join(ROOT, "Wheel.module.css"), "utf8")
const cardCss = fs.readFileSync(path.join(ROOT, "GameCard.module.css"), "utf8")

function block(source, selector) {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing ${selector}`)
  return match[1]
}

test("Library header exposes distinct navigation, place identity, and utility roles", () => {
  const header = jsx.slice(jsx.indexOf("<div className={styles.header}>"), jsx.indexOf("</div>\n\n      {showUniversalDepart"))
  const returnIndex = header.indexOf("<div className={styles.worldNav}>")
  const identityIndex = header.indexOf("<div className={styles.placeIdentity}>")
  const utilityIndex = header.indexOf("<div className={styles.headerRight}>")
  assert.ok(returnIndex >= 0 && identityIndex > returnIndex && utilityIndex > identityIndex)
  assert.match(block(css, ".stage .header"), /grid-template-columns:\s*clamp\([^;]+minmax\(250px,\s*1fr\)[^;]+clamp\(/)
})

test("Collection Hall subtitle contains only place context and filtered game count", () => {
  const identity = jsx.slice(jsx.indexOf("<div className={styles.placeIdentity}>"), jsx.indexOf("<div className={styles.headerRight}>"))
  assert.match(identity, /styles\.placeSubtitle[^>]*aria-hidden="true"[\s\S]*wheel\.libraryPlaceSubtitle[\s\S]*placeSubtitleDivider[\s\S]*filteredGames\.length/)
  assert.doesNotMatch(identity, /activeCategory|collectionBadge|filterBadge|newBadge|collectionStatus/)
})

test("platform filters retain counts, selected state, and the existing click handler", () => {
  const strip = jsx.slice(jsx.indexOf("<div className={styles.categoryStrip}>"), jsx.indexOf("{/* Recently played carousel"))
  assert.match(strip, /const count =/)
  assert.match(strip, /activeCategory === cat \? " " \+ styles\.catActive/)
  assert.match(strip, /onClick=\{\(\) => \{ setTabFocusIdx\(tabIdx\); setActiveCategory\(cat\) \}\}/)
  assert.match(strip, /styles\.catCount/)
  assert.match(block(css, ".stage .catActive"), /border-bottom-color:\s*#d6b274/)
})

test("Continue Playing remains a separate upper shelf before the main collection", () => {
  const recentIndex = jsx.indexOf("<div className={styles.recentCarousel}>")
  const wheelIndex = jsx.indexOf("<div className={styles.wheelArea}>")
  assert.ok(recentIndex > -1 && wheelIndex > recentIndex)
  assert.match(jsx, /recentlyPlayed\.slice\(0,\s*6\)\.map/)
  assert.match(block(css, ".stage .recentCarousel"), /border-bottom:\s*2px solid/)
})

test("carousel navigation geometry and handlers remain at the approved values", () => {
  assert.match(jsx, /const ARC_RADIUS = 900/)
  assert.match(jsx, /const ANGLE_STEP = 22/)
  assert.match(jsx, /const x = Math\.sin\(angleRad\) \* ARC_RADIUS \* 0\.95/)
  assert.match(jsx, /<button className=\{styles\.navBtn\} onClick=\{\(\) => navigate\(-1\)\}/)
  assert.match(jsx, /<button className=\{styles\.navBtn\} onClick=\{\(\) => navigate\(1\)\}/)
})

test("game titles and metadata have no gold text stroke", () => {
  for (const selector of [".title", ".system", ".card.center .title", ".card.center .system"]) {
    assert.doesNotMatch(block(cardCss, selector), /text-stroke|-webkit-text-stroke/)
  }
  for (const selector of [".stage .infoMeta", ".stage .infoSummary"]) {
    assert.doesNotMatch(block(css, selector), /text-stroke|-webkit-text-stroke/)
  }
})

test("Archive View keeps the A/B media lifecycle while removing duplicate game-title caption", () => {
  assert.match(jsx, /ref=\{bgVideoARef\}[\s\S]*onCanPlay=\{\(\) => handleArchiveVideoReady\('a'/)
  assert.match(jsx, /ref=\{bgVideoBRef\}[\s\S]*onCanPlay=\{\(\) => handleArchiveVideoReady\('b'/)
  assert.match(jsx, /preload="auto"[\s\S]*loop[\s\S]*playsInline[\s\S]*autoPlay/)
  assert.doesNotMatch(jsx, /styles\.previewCaption/)
  assert.match(block(css, ".previewReservation"), /width:\s*clamp\(360px,\s*30\.5vw,\s*504px\)/)
})

test("selected-game pedestal is authoritative and technical filenames leave the main view", () => {
  const panel = jsx.slice(jsx.indexOf("<div className={styles.infoPanel"), jsx.indexOf("{showSort &&"))
  assert.match(panel, /styles\.marqueeWrap[\s\S]*current\.title/)
  assert.match(panel, /styles\.infoMeta[\s\S]*current\.system[\s\S]*current\.status/)
  assert.match(panel, /styles\.infoSummary[^>]*>\{current\.genre\}/)
  assert.doesNotMatch(panel, /infoExe|TeknoParrotUi\.exe|retroarch\.exe|VPXStarter\.exe/)
})

test("Launch, favorite, Return, Console, and Depart handlers remain wired", () => {
  assert.match(jsx, /className=\{styles\.launchBtn[^>]*onClick=\{launchGame\}/)
  assert.match(jsx, /onClick=\{\(\) => toggleFavorite\(current\.id \|\| current\.profile\)\}/)
  assert.match(jsx, /className=\{styles\.returnHomeBtn[^>]*onClick=\{\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \}\}/)
  assert.match(jsx, /className=\{styles\.consoleTrigger[^>]*onClick=\{\(\) => setConsoleOpen\(v => !v\)\}/)
  assert.match(jsx, /className=\{styles\.departReservation\}[\s\S]*onClick=\{openDepart\}/)
  assert.match(jsx, /if \(z === 3\) \{ launchGame\(\); return \}/)
})

test("responsive rules preserve the 1280 and desktop compositions without shrinking primary type", () => {
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 760px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 760px)")))
  assert.match(compact, /\.stage \.header\s*\{[^}]*left:\s*32px[^}]*width:\s*700px[^}]*grid-template-columns:/s)
  assert.match(compact, /\.stage \.categoryStrip,[\s\S]*?\.stage \.recentCarousel\s*\{[^}]*left:\s*32px[^}]*width:\s*700px/s)
  assert.match(compact, /\.previewReservation\s*\{[^}]*right:\s*28px[^}]*width:\s*370px/s)
  assert.match(compact, /\.stage \.infoPanel\s*\{[^}]*left:\s*64px[^}]*width:\s*668px[^}]*bottom:\s*52px/s)
  assert.doesNotMatch(compact, /\.placeName\s*\{[^}]*font-size:/s)
})
