// cardArtTypeRetiredMilestoneR2.test.js ---------------------------------------
// Committed regression test, run via `node --test`. Source-text assertions,
// matching this project's convention for JSX/CSS files that can't be
// imported directly under Node's native ESM loader.
//
// R2 -- Card Art Type audit: the Settings.jsx toggle (snap/boxart/sgdb/none)
// was architecturally orphaned exactly like the retired Theme Color setting
// (raw localStorage["nuarcade_art_pref"], never touched nuarcade-config.json
// or IPC, excluded from backup/restore), and its real effect was much
// narrower than its "What shows on wheel cards" label implied -- it only
// ever tinted GameCard.jsx's dimmed background-bleed layer behind the
// centered card, never the primary capsule art, search/collections (same
// GameCard), Sanctuary's Recently Played, or the Archive View preview
// (all confirmed unaffected in the audit). Retired; GameCard.jsx now uses
// the fixed priority order that was already the 'sgdb' default.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const settingsJsx = readFileSync(join(HERE, "../Settings/Settings.jsx"), "utf8")
const wheelJsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8")
const cardJsx = readFileSync(join(HERE, "GameCard.jsx"), "utf8")
const homeJsx = readFileSync(join(HERE, "../VesparaHome/VesparaHome.jsx"), "utf8")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")

// -- The Settings control is gone --------------------------------------------

test("the Card Art Type control no longer renders in Settings", () => {
  assert.doesNotMatch(settingsJsx, /sectionCardArt/)
  assert.doesNotMatch(settingsJsx, /cardArtLabel/)
  assert.doesNotMatch(settingsJsx, /updateArtPref/)
  assert.doesNotMatch(settingsJsx, /'snap','boxart','sgdb','none'|\['snap', ?'boxart', ?'sgdb', ?'none'\]/)
})

test("the i18n keys for the removed section are gone from both locales", () => {
  assert.doesNotMatch(en, /"settings\.sectionCardArt":/)
  assert.doesNotMatch(en, /"settings\.cardArtLabel":/)
  assert.doesNotMatch(es, /"settings\.sectionCardArt":/)
  assert.doesNotMatch(es, /"settings\.cardArtLabel":/)
})

// -- The localStorage key is never read or written anywhere anymore ---------

test("nuarcade_art_pref is never read or written by any live component (Settings, Wheel, or GameCard)", () => {
  for (const [name, src] of [["Settings.jsx", settingsJsx], ["Wheel.jsx", wheelJsx], ["GameCard.jsx", cardJsx]]) {
    assert.doesNotMatch(src, /localStorage\.(get|set)Item\(['"]nuarcade_art_pref['"]/, `${name} must not read/write the retired key`)
  }
})

test("artPref is no longer threaded from Wheel into GameCard", () => {
  assert.doesNotMatch(wheelJsx, /artPref/)
  assert.doesNotMatch(cardJsx, /artPref/)
})

// -- GameCard now uses the fixed, previously-default priority order ---------

test("GameCard's heroUrl uses the fixed sgdb-equivalent order (hero, then snap, then box art) unconditionally", () => {
  assert.match(cardJsx, /const heroUrl = sgdbHero \|\| localSnap \|\| localBox \|\| null/)
})

test("capsuleUrl (the primary, front-facing card art) was never gated by the retired setting and remains unchanged", () => {
  assert.match(cardJsx, /const capsuleUrl= gameArt\?\.capsule \|\| null/)
})

// -- Confirms the audit's other-surfaces findings still hold ----------------

test("Sanctuary's Recently Played art is unaffected -- it never referenced artPref or the retired key, and still uses its own fixed capsule/hero order", () => {
  assert.doesNotMatch(homeJsx, /artPref|nuarcade_art_pref/)
  assert.match(homeJsx, /art\?\.capsule \|\| art\?\.hero/)
})

test("the Archive View preview's own fixed priority chain is untouched by this removal", () => {
  assert.match(wheelJsx, /currentArtwork\?\.hero \|\|\s*\n\s*currentArtwork\?\.screenshot \|\|\s*\n\s*current\?\.snapPath \|\|\s*\n\s*currentArtwork\?\.capsule \|\|\s*\n\s*current\?\.boxArtPath \|\|\s*\n\s*currentArtwork\?\.logo \|\|\s*\n\s*null/)
})
