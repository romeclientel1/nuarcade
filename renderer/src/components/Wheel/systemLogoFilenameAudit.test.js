// systemLogoFilenameAudit.test.js --------------------------------------------
// Regression coverage for the source-based system-logo filename audit
// (see USER_MANUAL.md's "System logos" section, Chapter 7). Every assertion
// here reads production source directly with readFileSync and checks it
// against the documented filename table -- it never imports Wheel.jsx (JSX,
// not loadable under plain `node --test`, same limitation noted at the top
// of Wheel.test.js) and never runs the app. These are static source checks,
// not runtime verification: if the underlying source changes shape (a
// renamed field, an added category), this test's extraction regexes may
// need updating alongside it.
//
// What this locks in, matching the audit's findings (as amended by the
// fix/library-system-tabs repair -- see systemCategoryRepair.test.js for
// coverage specific to that repair):
//   1. The logo folder is `<mediaPath>/SystemLogos`, extension whitelist is
//      exactly .png/.jpg/.jpeg/.webp/.svg, and both the file-scan side and
//      the render side lowercase their key before matching (case-insensitive
//      by construction, independent of the underlying filesystem).
//   2. The fixed CATEGORIES id list and RA_SYSTEM_MAP labels are the only
//      possible non-collection tab ids, and the required filename stem for
//      each is the literal id string lowercased -- with spaces/hyphens kept
//      verbatim, not stripped.
//   3. The three issues the original audit flagged are fixed, not just
//      documented as broken: "Retro" is gone from CATEGORIES entirely (was
//      never populated by any scanner), "Original Xbox" now exists as a
//      dedicated CATEGORIES entry distinct from "Xbox360", and
//      `scanPinballTables` is defined and exported from scanner.js.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "../../../..")

const wheelSrc = readFileSync(path.join(repoRoot, "renderer/src/components/Wheel/Wheel.jsx"), "utf8")
const scannerSrc = readFileSync(path.join(repoRoot, "src/main/scanner.js"), "utf8")
const mainIndexSrc = readFileSync(path.join(repoRoot, "src/main/index.js"), "utf8")

// -- 1. Fixed CATEGORIES id list ----------------------------------------------

function extractCategories(src) {
  const m = src.match(/const CATEGORIES = \[([^\]]+)\]/)
  assert.ok(m, "expected to find a `const CATEGORIES = [...]` array in Wheel.jsx")
  return m[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1))
}

const CATEGORIES = extractCategories(wheelSrc)

test("CATEGORIES matches the repaired 26-entry fixed list, in order", () => {
  assert.deepEqual(CATEGORIES, [
    "All", "Favorites", "Recent", "Arcade", "MAME", "Racing", "Fighting",
    "Shooter", "Rhythm", "Flying", "Sports", "N64", "PS1", "PSP", "Dreamcast",
    "Model2", "Model3", "PS3", "Xbox360", "Original Xbox", "GCWii", "WiiU", "PS2", "Switch",
    "Pinball", "PC",
  ])
})

test("every fixed CATEGORIES id's required logo filename stem is the id lowercased verbatim (no space/punctuation stripping)", () => {
  const expectedStems = {
    All: "all", Favorites: "favorites", Recent: "recent", Arcade: "arcade", MAME: "mame",
    Racing: "racing", Fighting: "fighting", Shooter: "shooter", Rhythm: "rhythm",
    Flying: "flying", Sports: "sports", N64: "n64", PS1: "ps1", PSP: "psp", Dreamcast: "dreamcast",
    Model2: "model2", Model3: "model3", PS3: "ps3", Xbox360: "xbox360", "Original Xbox": "original xbox",
    GCWii: "gcwii", WiiU: "wiiu", PS2: "ps2", Switch: "switch", Pinball: "pinball", PC: "pc",
  }
  for (const cat of CATEGORIES) {
    assert.equal(cat.toLowerCase(), expectedStems[cat], `unexpected stem for "${cat}"`)
  }
})

// -- 2. RA_SYSTEM_MAP labels --------------------------------------------------

function extractRaLabels(src) {
  const mapBody = src.match(/const RA_SYSTEM_MAP = \{([\s\S]*?)\n\}/)
  assert.ok(mapBody, "expected to find `const RA_SYSTEM_MAP = {...}` in scanner.js")
  const labelRe = /label:\s*'([^']*)'/g
  const labels = []
  let m
  while ((m = labelRe.exec(mapBody[1]))) labels.push(m[1])
  return labels
}

const RA_LABELS = extractRaLabels(scannerSrc)
const RA_LABELS_DISTINCT = [...new Set(RA_LABELS)]

test("RA_SYSTEM_MAP has exactly the 45 folder-key entries / 42 distinct labels the audit found", () => {
  assert.equal(RA_LABELS.length, 45)
  assert.equal(RA_LABELS_DISTINCT.length, 42)
})

test("RA_SYSTEM_MAP labels that require a space or hyphen in the logo filename are exactly the audited set", () => {
  const withPunctuation = RA_LABELS_DISTINCT.filter(l => /[\s-]/.test(l)).sort()
  assert.deepEqual(withPunctuation, [
    "Atari 2600", "Atari 7800", "Game Gear", "Master System", "Neo Geo",
    "PC Engine", "PC-FX", "SG-1000", "Sega CD", "Virtual Boy", "ZX Spectrum",
  ].sort())
})

test("7 RA_SYSTEM_MAP labels intentionally alias onto fixed CATEGORIES ids (shared logo, shared tab)", () => {
  const overlap = RA_LABELS_DISTINCT.filter(l => CATEGORIES.includes(l)).sort()
  assert.deepEqual(overlap, ["Arcade", "Dreamcast", "MAME", "N64", "PS1", "PS2", "PSP"].sort())
})

// -- 3. Logo folder path, extension whitelist, case-insensitivity ------------

test("logo folder is `<mediaPath>/SystemLogos` and the extension whitelist is exactly the audited 5", () => {
  assert.match(mainIndexSrc, /path\.join\(cfg\.mediaPath \|\| 'F:\\\\Media\\\\', 'SystemLogos'\)/)
  const extMatch = mainIndexSrc.match(/const IMG_EXTS = \[([^\]]+)\]/)
  assert.ok(extMatch, "expected IMG_EXTS whitelist in get-system-logos handler")
  const exts = extMatch[1].match(/'([^']*)'/g).map(s => s.slice(1, -1))
  assert.deepEqual(exts, ['.png', '.jpg', '.jpeg', '.webp', '.svg'])
})

test("both the file-scan key and the category id are lowercased before matching (case-insensitive by construction)", () => {
  // File-scan side, in the get-system-logos handler.
  assert.match(mainIndexSrc, /const key = path\.basename\(f, ext\)\.toLowerCase\(\)/)
  // Render side, in Wheel.jsx's tab rendering.
  assert.match(wheelSrc, /systemLogos\[cat\.toLowerCase\(\)\]/)
})

test("collections are unconditionally excluded from custom-logo rendering", () => {
  assert.match(wheelSrc, /!col && systemLogos\[cat\.toLowerCase\(\)\]/)
})

test("logos reload on every Wheel mount with no explicit rescan call (useEffect with an empty dependency array)", () => {
  assert.match(wheelSrc, /useEffect\(\(\) => \{\s*window\.nuarcade\?\.getSystemLogos\?\.\(\)/)
})

// -- 4. The three originally-flagged issues are fixed, not just documented --

test("'Retro' is gone from CATEGORIES and no scanner anywhere sets genre/system to 'Retro'", () => {
  assert.ok(!CATEGORIES.includes("Retro"))
  assert.doesNotMatch(scannerSrc, /(?:genre|system):\s*'Retro'/)
  assert.doesNotMatch(scannerSrc, /(?:genre|system):\s*"Retro"/)
})

test("'Xbox' (bare) has no CATEGORIES entry, but 'Original Xbox' does, distinct from 'Xbox360'", () => {
  assert.ok(!CATEGORIES.includes("Xbox"))
  assert.ok(CATEGORIES.includes("Original Xbox"))
  assert.ok(CATEGORIES.includes("Xbox360"))
})

test("scanPinballTables is defined and exported from scanner.js, and still referenced by the Pinball IPC handler", () => {
  assert.match(mainIndexSrc, /scanPinballTables/)
  assert.match(scannerSrc, /async function scanPinballTables/)
  assert.match(scannerSrc, /module\.exports = \{ \.\.\.module\.exports, scanPinballTables \}/)
})
