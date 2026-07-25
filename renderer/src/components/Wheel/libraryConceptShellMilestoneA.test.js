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

test("the live top identity mirrors the concept hierarchy using Vespara serif language", () => {
  assert.match(jsx, /<div className=\{styles\.libraryBrand\} aria-hidden="true">/)
  assert.match(jsx, /<div className=\{styles\.libraryBrandName\}>VESPARA<\/div>/)
  assert.match(jsx, /<div className=\{styles\.libraryBrandWorld\}>THE SANCTUARY<\/div>/)
  assert.match(css, /\.libraryBrandName\s*\{[^}]*"Times New Roman", Georgia, "Liberation Serif", serif[^}]*-webkit-text-stroke:/s)
  assert.match(css, /\.libraryBrandWorld\s*\{[^}]*color:\s*#d6b274/s)
})

test("the Traveler greeting is live profile data and localized", () => {
  assert.match(jsx, /\{t\("wheel\.welcomeBack"\)\}/)
  assert.match(jsx, /\{activeProfile\?\.name \|\| t\("wheel\.guestCta"\)\}/)
  assert.match(en, /"wheel\.welcomeBack":\s*"Welcome back,"/)
  assert.match(es, /"wheel\.welcomeBack":\s*"Bienvenido de nuevo,"/)
})

test("the concept shell reserves a brighter left collection wall and preserves the overlook", () => {
  assert.match(css, /\.stage \.header\s*\{[^}]*left:\s*clamp\([^}]*width:\s*min\(42vw,\s*720px\)/s)
  assert.match(css, /\.stage \.categoryStrip\s*\{[^}]*left:\s*clamp\([^}]*width:\s*min\(42vw,\s*720px\)/s)
  assert.match(css, /\.stage \.wheelArea\s*\{[^}]*left:\s*clamp\([^}]*width:\s*min\(47vw,\s*850px\)[^}]*overflow:\s*hidden/s)
  assert.match(cardCss, /\.neighbor\s*\{[^}]*saturate\(0\.78\) brightness\(0\.9\)/s)
  assert.match(cardJsx, /const CARD_BG = "#142522"/)
  assert.match(cardCss, /\.card\.center \.title\s*\{[^}]*"Times New Roman", Georgia, "Liberation Serif", serif/s)
})

test("Milestone B preserves the A/B lifecycle while removing fullscreen video treatment", () => {
  assert.match(jsx, /ref=\{bgVideoARef\}[\s\S]*?src=\{bgVideoA\.source\}[\s\S]*?loop[\s\S]*?playsInline[\s\S]*?autoPlay/)
  assert.match(jsx, /ref=\{bgVideoBRef\}[\s\S]*?src=\{bgVideoB\.source\}[\s\S]*?loop[\s\S]*?playsInline[\s\S]*?autoPlay/)
  assert.doesNotMatch(css, /\.stage \.bgVideo|\.bgVideoHidden/)
})

test("the approved right-hand frame now owns the live presentation-only video surface", () => {
  assert.match(jsx, /<aside className=\{styles\.previewReservation\} aria-hidden="true">/)
  assert.match(jsx, /const previewStill =\s*currentArtwork\?\.hero \|\|\s*currentArtwork\?\.screenshot \|\|\s*current\?\.snapPath \|\|\s*currentArtwork\?\.capsule \|\|\s*current\?\.boxArtPath \|\|\s*currentArtwork\?\.logo \|\|/s)
  const previewMarkup = jsx.slice(jsx.indexOf("<aside className={styles.previewReservation}"), jsx.indexOf("</aside>", jsx.indexOf("<aside className={styles.previewReservation}")))
  assert.match(previewMarkup, /<video[\s\S]*?styles\.archiveVideo[\s\S]*?autoPlay/)
  assert.doesNotMatch(previewMarkup, /controls=/)
  assert.equal((previewMarkup.match(/tabIndex=\{-1\}/g) || []).length, 2)
  assert.match(css, /\.previewReservation\s*\{[^}]*right:\s*clamp\([^}]*width:\s*clamp\(390px,\s*34vw,\s*560px\)/s)
})

test("the information pedestal sits below the shelf and does not cover the collection row", () => {
  assert.match(css, /\.stage \.wheelArea\s*\{[^}]*top:\s*clamp\(348px,\s*38vh,\s*410px\)[^}]*height:\s*clamp\(300px,\s*34vh,\s*368px\)/s)
  assert.match(css, /\.stage \.infoPanel\s*\{[^}]*bottom:\s*clamp\(36px,\s*4\.2vh,\s*46px\)[^}]*min-height:\s*104px/s)
  assert.match(css, /@media \(max-width: 1280px\), \(max-height: 760px\)[\s\S]*?\.stage \.wheelArea\s*\{[^}]*top:\s*300px[^}]*height:\s*264px[\s\S]*?\.stage \.infoPanel\s*\{[^}]*bottom:\s*26px/s)
})

test("return, console, and the visible Depart plaque use integrated live controls", () => {
  assert.match(jsx, /className=\{styles\.departReservation\}[\s\S]*?onClick=\{\(\) => setShowExitPopup\(true\)\}/)
  assert.match(jsx, /\{t\("wheel\.depart"\)\}[\s\S]*?\{t\("wheel\.departSubtitle"\)\}/)
  assert.match(css, /\.stage \.returnHomeBtn\s*\{[^}]*border-top:[^}]*border-bottom:[^}]*border-radius:\s*0/s)
  assert.match(css, /\.stage \.consoleTrigger\s*\{[^}]*border-top:[^}]*border-bottom:[^}]*border-radius:\s*0/s)
  assert.match(css, /\.departReservation:hover,\s*\.departReservation:focus-visible\s*\{/s)
  assert.match(en, /"wheel\.depart":\s*"Depart"/)
  assert.match(es, /"wheel\.depart":\s*"Partir"/)
})

test("focus, reduced motion, launch, favorite and Library navigation contracts remain present", () => {
  assert.match(css, /\.catPill:focus-visible,[\s\S]*?\.returnHomeBtn:focus-visible,[\s\S]*?\.exitBtn:focus-visible/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(jsx, /onClick=\{launchGame\} disabled=\{launching\}/)
  assert.match(jsx, /onClick=\{\(\) => toggleFavorite\(current\.id \|\| current\.profile\)\}/)
  assert.match(jsx, /if \(onReturnHome\) onReturnHome\(\)/)
  assert.match(jsx, /\(\) => setShowExitPopup\(true\), \/\/ 11 Exit/)
})
