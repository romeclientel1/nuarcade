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
  // D2: the global header (Return | Vespara lockup | Console+WelcomeBack)
  // and the local title row (THE LIBRARY) are now two separate elements --
  // globalHeader no longer contains placeIdentity at all.
  const globalHeader = jsx.slice(jsx.indexOf("<div className={styles.globalHeader}>"), jsx.indexOf("</div>\n\n      <div className={styles.libraryTitleRow}>"))
  const returnIndex = globalHeader.indexOf("<div className={styles.worldNav}>")
  const brandIndex = globalHeader.indexOf("<div className={styles.libraryBrand}")
  const utilityIndex = globalHeader.indexOf("<div className={styles.headerRight}>")
  assert.ok(returnIndex >= 0 && brandIndex > returnIndex && utilityIndex > brandIndex, "globalHeader must order Return, then the lockup, then Console/WelcomeBack")
  assert.match(block(css, ".stage .globalHeader"), /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\)/)

  const globalHeaderIdx = jsx.indexOf("<div className={styles.globalHeader}>")
  const titleRowIdx = jsx.indexOf("<div className={styles.libraryTitleRow}>")
  const identityIndex = jsx.indexOf("<div className={styles.placeIdentity}>")
  assert.ok(titleRowIdx > globalHeaderIdx && identityIndex > titleRowIdx, "libraryTitleRow (with placeIdentity) must render after the global header")
})

test("Collection Hall subtitle contains only place context and filtered game count", () => {
  const identity = jsx.slice(jsx.indexOf("<div className={styles.placeIdentity}>"), jsx.indexOf("{showUniversalDepart"))
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

test("D4: Continue Playing is gone -- the main collection shelf sits directly below the system row instead", () => {
  assert.doesNotMatch(jsx, /styles\.recentCarousel/)
  const categoryStripIdx = jsx.indexOf("<div className={styles.categoryStrip}>")
  const wheelIndex = jsx.indexOf("<div className={styles.wheelArea}>")
  assert.ok(categoryStripIdx > -1 && wheelIndex > categoryStripIdx)
})

test("shelf navigation handlers remain at the approved values (D3: flat-shelf geometry, see libraryFullWidthMilestoneD3.test.js)", () => {
  assert.match(jsx, /const CARD_SLOT_WIDTH = 252/)
  assert.match(jsx, /const x = signed \* CARD_SLOT_WIDTH/)
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
  assert.match(block(css, ".previewReservation"), /width:\s*clamp\(440px,\s*28\.1vw,\s*540px\)/)
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

test("D4: responsive rules preserve the full-width 1280 composition (Continue Playing's slot reclaimed) without shrinking primary type", () => {
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 760px)"), css.indexOf("/* Restrained entrance", css.indexOf("@media (max-width: 1280px), (max-height: 760px)")))
  assert.doesNotMatch(compact, /\.stage \.globalHeader\s*\{[^}]*grid-template-columns:/s)
  assert.doesNotMatch(compact, /\.stage \.recentCarousel/)
  assert.match(compact, /\.stage \.libraryTitleRow\s*\{[^}]*top:\s*60px[^}]*left:\s*22px[^}]*right:\s*22px/s)
  assert.match(compact, /\.stage \.categoryStrip\s*\{[^}]*top:\s*106px[^}]*left:\s*22px[^}]*right:\s*22px/s)
  assert.match(compact, /\.stage \.wheelArea\s*\{[^}]*top:\s*150px[^}]*height:\s*210px/s)
  assert.match(compact, /\.previewReservation\s*\{[^}]*top:\s*456px[^}]*width:\s*260px/s)
  assert.match(compact, /\.stage \.infoPanel\s*\{[^}]*left:\s*50%[^}]*top:\s*372px[^}]*width:\s*720px[^}]*min-height:\s*34px/s)
  assert.doesNotMatch(compact, /\.placeName\s*\{[^}]*font-size:/s)
  assert.doesNotMatch(compact, /\.marqueeWrap\s*\{[^}]*font-size:/s)
})
