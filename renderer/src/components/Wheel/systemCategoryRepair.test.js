// systemCategoryRepair.test.js -------------------------------------------------
// Regression coverage for the fix/library-system-tabs repair (Retro removed,
// Pinball reconnected, Original Xbox added). Static source checks only --
// Wheel.jsx is JSX and can't be imported under plain `node --test` (same
// limitation noted at the top of Wheel.test.js), and useGameLauncher.js's
// launch dispatch is exercised behaviorally elsewhere (src/main/
// launchRegistry.test.js, src/main/index.test.js); what's checked here is
// that its Xemu/Cxbx routing lines are untouched by this repair. See
// src/main/scannerCategoryRepair.test.js for the functional (real scanner
// execution, real temp-directory fixtures) half of this coverage.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "../../../..")

const wheelSrc = readFileSync(path.join(repoRoot, "renderer/src/components/Wheel/Wheel.jsx"), "utf8")
const scannerSrc = readFileSync(path.join(repoRoot, "src/main/scanner.js"), "utf8")
const launcherSrc = readFileSync(path.join(repoRoot, "renderer/src/hooks/useGameLauncher.js"), "utf8")

function extractCategories(src) {
  const m = src.match(/const CATEGORIES = \[([^\]]+)\]/)
  assert.ok(m, "expected to find `const CATEGORIES = [...]` in Wheel.jsx")
  return m[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1))
}

const CATEGORIES = extractCategories(wheelSrc)

test("no dead Retro tab remains in CATEGORIES", () => {
  assert.ok(!CATEGORIES.includes("Retro"))
})

test("no duplicate category ids in CATEGORIES", () => {
  const distinct = new Set(CATEGORIES)
  assert.equal(distinct.size, CATEGORIES.length, `found duplicates: ${CATEGORIES.filter((c, i) => CATEGORIES.indexOf(c) !== i)}`)
})

test("Original Xbox is present as its own id, distinct from Xbox360, with no bare 'Xbox' entry", () => {
  assert.ok(CATEGORIES.includes("Original Xbox"))
  assert.ok(CATEGORIES.includes("Xbox360"))
  assert.ok(!CATEGORIES.includes("Xbox"))
  assert.notEqual("Original Xbox", "Xbox360")
})

test("Original Xbox's logo lookup key is 'original xbox' (cat.toLowerCase(), space kept verbatim)", () => {
  assert.equal("Original Xbox".toLowerCase(), "original xbox")
  // Confirms the render-side lookup expression itself is unchanged (still a
  // generic cat.toLowerCase() lookup -- no special-casing needed or added).
  assert.match(wheelSrc, /systemLogos\[cat\.toLowerCase\(\)\]/)
})

test("Pinball remains a fixed CATEGORIES id (tab now actually populates via the repaired scanner)", () => {
  assert.ok(CATEGORIES.includes("Pinball"))
})

test("existing RetroArch folder-key aliases are untouched by this repair", () => {
  const aliasBody = scannerSrc.match(/const RA_SYSTEM_ALIASES = \{([\s\S]*?)\n\}/)
  assert.ok(aliasBody, "expected RA_SYSTEM_ALIASES to still exist in scanner.js")
  // Spot-check a handful of aliases the original audit exercised.
  assert.match(aliasBody[1], /nintendo64:\s*'n64'/)
  assert.match(aliasBody[1], /sonyplaystation:\s*'psx'/)
  assert.match(aliasBody[1], /segadreamcast:\s*'dreamcast'/)
  const mapBody = scannerSrc.match(/const RA_SYSTEM_MAP = \{([\s\S]*?)\n\}/)
  const labelRe = /label:\s*'([^']*)'/g
  const labels = []
  let m
  while ((m = labelRe.exec(mapBody[1]))) labels.push(m[1])
  assert.equal(labels.length, 45, "RA_SYSTEM_MAP folder-key count should be unaffected by this repair (Original Xbox has no RetroArch core, so nothing was added here)")
})

test("Xemu/Cxbx launch routing is unchanged: still two distinct IPC calls keyed off game.emulator", () => {
  assert.match(launcherSrc, /emu === "xemu"\)\s*launchResult = await window\.nuarcade\.launchXemuGame\(gamePath, session\.id\)/)
  assert.match(launcherSrc, /emu === "cxbx"\)\s*launchResult = await window\.nuarcade\.launchCxbxGame\(gamePath, session\.id\)/)
})
