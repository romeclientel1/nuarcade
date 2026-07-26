import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const cardCss = readFileSync(join(HERE, "GameCard.module.css"), "utf8").replace(/\r\n/g, "\n")
const cardJsx = readFileSync(join(HERE, "GameCard.jsx"), "utf8").replace(/\r\n/g, "\n")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")
const assetPath = join(HERE, "assets/vespara-library-overlook.png")
const asset = readFileSync(assetPath)

test("the approved Library environment is a local, standalone PNG asset", () => {
  assert.match(jsx, /import libraryEnvironment from "\.\/assets\/vespara-library-overlook\.png"/)
  assert.ok(statSync(assetPath).size > 1_000_000)
  assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.equal(asset.readUInt32BE(16), 1672)
  assert.equal(asset.readUInt32BE(20), 941)
  assert.doesNotMatch(jsx, /https?:\/\/|data:image|base64/i)
})

test("the environment plate is decorative and the interface remains live DOM", () => {
  assert.match(jsx, /<img\s*\n\s*src=\{libraryEnvironment\}\s*\n\s*alt=""\s*\n\s*aria-hidden="true"\s*\n\s*className=\{styles\.libraryEnvironment\}/)
  assert.match(css, /\.libraryEnvironment\s*\{[^}]*object-fit:\s*cover[^}]*pointer-events:\s*none/s)
  assert.match(jsx, /<GameCard/)
  assert.match(jsx, /<button className=\{styles\.returnHomeBtn/)
  assert.match(jsx, /<button className=\{styles\.launchBtn/)
})

test("D4: the live top identity is a Vespara-only lockup (VESPARA, no THE SANCTUARY subtitle) -- Return to Sanctuary only reads logically if the header isn't also claiming the Traveler is already there", () => {
  assert.match(jsx, /<div className=\{styles\.libraryBrand\} aria-hidden="true">/)
  assert.match(jsx, /<div className=\{styles\.libraryBrandName\}>VESPARA<\/div>/)
  assert.doesNotMatch(jsx, /styles\.libraryBrandWorld/)
  assert.doesNotMatch(jsx, />THE SANCTUARY</)
  assert.doesNotMatch(css, /\.libraryBrandWorld\s*\{/)
  assert.match(css, /\.libraryBrandName\s*\{[^}]*"Times New Roman", Georgia, "Liberation Serif", serif[^}]*-webkit-text-stroke:/s)
})

test("the Traveler greeting is live profile data and localized", () => {
  assert.match(jsx, /\{t\("wheel\.welcomeBack"\)\}/)
  assert.match(jsx, /\{activeProfile\?\.name \|\| t\("wheel\.guestCta"\)\}/)
  assert.match(en, /"wheel\.welcomeBack":\s*"Welcome back,"/)
  assert.match(es, /"wheel\.welcomeBack":\s*"Bienvenido de nuevo,"/)
})

test("D3: the collection region now spans nearly the full viewport (left+right margins, not a fixed collection-column width) while preserving the overlook", () => {
  assert.match(css, /\.stage \.libraryTitleRow\s*\{[^}]*left:\s*clamp\([^}]*right:\s*clamp\(/s)
  assert.match(css, /\.stage \.categoryStrip\s*\{[^}]*left:\s*clamp\([^}]*right:\s*clamp\(/s)
  assert.match(css, /\.stage \.wheelArea\s*\{[^}]*left:\s*clamp\([^}]*right:\s*clamp\([^}]*overflow:\s*hidden/s)
  assert.match(cardCss, /\.neighbor\s*\{[^}]*saturate\(0\.86\) brightness\(0\.94\)/s)
  assert.match(cardJsx, /const CARD_BG = "#142522"/)
  assert.match(cardCss, /\.card\.center \.title\s*\{[^}]*"Times New Roman", Georgia, "Liberation Serif", serif/s)
})

test("Milestone B preserves the A/B lifecycle while removing fullscreen video treatment", () => {
  assert.match(jsx, /ref=\{bgVideoARef\}[\s\S]*?src=\{bgVideoA\.source\}[\s\S]*?loop[\s\S]*?playsInline[\s\S]*?autoPlay/)
  assert.match(jsx, /ref=\{bgVideoBRef\}[\s\S]*?src=\{bgVideoB\.source\}[\s\S]*?loop[\s\S]*?playsInline[\s\S]*?autoPlay/)
  assert.doesNotMatch(css, /\.stage \.bgVideo|\.bgVideoHidden/)
})

test("the centered lower Archive View frame (D3) still owns the live presentation-only video surface", () => {
  assert.match(jsx, /<aside className=\{styles\.previewReservation\} aria-hidden="true">/)
  assert.match(jsx, /const previewStill =\s*currentArtwork\?\.hero \|\|\s*currentArtwork\?\.screenshot \|\|\s*current\?\.snapPath \|\|\s*currentArtwork\?\.capsule \|\|\s*current\?\.boxArtPath \|\|\s*currentArtwork\?\.logo \|\|/s)
  const previewMarkup = jsx.slice(jsx.indexOf("<aside className={styles.previewReservation}"), jsx.indexOf("</aside>", jsx.indexOf("<aside className={styles.previewReservation}")))
  assert.match(previewMarkup, /<video[\s\S]*?styles\.archiveVideo[\s\S]*?autoPlay/)
  assert.doesNotMatch(previewMarkup, /controls=/)
  assert.equal((previewMarkup.match(/tabIndex=\{-1\}/g) || []).length, 2)
  assert.match(css, /\.previewReservation\s*\{[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)[^}]*z-index:\s*7[^}]*width:\s*clamp\(440px,\s*28\.1vw,\s*540px\)/s)
})

test("the compact selected-game strip sits below the shelf and does not cover the collection row (D4: shelf moved up into Continue Playing's reclaimed space)", () => {
  assert.match(css, /\.stage \.wheelArea\s*\{[^}]*top:\s*clamp\(158px,\s*17\.2vh,\s*186px\)[^}]*height:\s*clamp\(290px,\s*30\.5vh,\s*330px\)/s)
  // D4: infoPanel is top-anchored and bounded-width (a compact strip, not a
  // full-width slab), positioned right below .wheelArea's own bottom edge.
  assert.match(css, /\.stage \.infoPanel\s*\{[^}]*top:\s*clamp\(462px,\s*45.5vh,\s*494px\)[^}]*width:\s*clamp\(700px,\s*60vw,\s*1150px\)[^}]*min-height:\s*40px/s)
  assert.match(css, /@media \(max-width: 1280px\), \(max-height: 760px\)[\s\S]*?\.stage \.wheelArea\s*\{[^}]*top:\s*150px[^}]*height:\s*210px[\s\S]*?\.stage \.infoPanel\s*\{[^}]*top:\s*372px/s)
})

test("return, console, and the visible Depart plaque use integrated live controls", () => {
  assert.match(jsx, /className=\{styles\.departReservation\}[\s\S]*?onClick=\{openDepart\}/)
  assert.match(jsx, /\{t\("wheel\.depart"\)\}[\s\S]*?\{t\("wheel\.departSubtitle"\)\}/)
  assert.match(css, /\.stage \.returnHomeBtn\s*\{[^}]*border-top:[^}]*border-bottom:[^}]*border-radius:\s*0/s)
  // D2: Console now sits in the global header's own corner cluster rather
  // than a stretched grid column, so it keeps its self-contained pill/
  // bracket treatment (base .consoleTrigger) instead of the plaque-bar
  // border style -- still a real, unmistakable button either way.
  assert.match(css, /\.consoleTrigger\s*\{[^}]*border-radius:\s*8px/s)
  assert.match(css, /\.departReservation:hover,\s*\.departReservation:focus-visible\s*\{/s)
  assert.match(en, /"wheel\.depart":\s*"Depart"/)
  assert.match(es, /"wheel\.depart":\s*"Partir"/)
})

test("focus, reduced motion, launch, favorite and Library navigation contracts remain present", () => {
  assert.match(css, /\.catPill:focus-visible,[\s\S]*?\.returnHomeBtn:focus-visible,[\s\S]*?\.consoleDepartBtn:focus-visible/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(jsx, /onClick=\{launchGame\} disabled=\{launching\}/)
  assert.match(jsx, /onClick=\{\(\) => toggleFavorite\(current\.id \|\| current\.profile\)\}/)
  assert.match(jsx, /if \(onReturnHome\) onReturnHome\(\)/)
  assert.match(jsx, /onClick=\{openDepart\}/)
})
