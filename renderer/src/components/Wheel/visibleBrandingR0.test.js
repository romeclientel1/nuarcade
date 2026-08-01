import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// Remediation Milestone R0, Commit 1 (FIN-UX-001 / FIN-UX-002) -----------------
// Attract Mode and the Settings bezel help copy previously showed "NuArcade"
// as visible, Traveler-facing text. NuArcade is a protected COMPATIBILITY
// identifier (package name, appId, executable, app.setName, window.nuarcade)
// -- it must never be renamed -- but it is not the customer-facing brand and
// must not appear as on-screen copy. This test locks both fixes in place and
// separately locks that no protected technical identifier was touched by
// pursuing them.

const HERE = dirname(fileURLToPath(import.meta.url))
const attractMode = readFileSync(join(HERE, "AttractMode.jsx"), "utf8").replace(/\r\n/g, "\n")
const settings = readFileSync(join(HERE, "../Settings/Settings.jsx"), "utf8").replace(/\r\n/g, "\n")

test("Attract Mode no longer renders a secondary 'by NuArcade' brand line", () => {
  assert.doesNotMatch(attractMode, /by NuArcade/)
  // The primary Vespara brand mark itself must still render -- this is a
  // removal of the secondary attribution line only, not the brand block.
  assert.match(attractMode, /<span className=\{styles\.wordmark\}>VESPARA<\/span>/)
  assert.match(attractMode, /<span className=\{styles\.context\}>FROM THE LIBRARY<\/span>/)
})

test("Attract Mode no longer renders the retired generic frontend HUD", () => {
  assert.doesNotMatch(attractMode, /brandSecondary/)
  assert.doesNotMatch(attractMode, /INSERT COIN/)
  assert.doesNotMatch(attractMode, /gameCount/)
  assert.doesNotMatch(attractMode, /Progress dots/)
})

test("Settings bezel help copy refers to Vespara, not NuArcade, as the visible product actor", () => {
  const helpTextMatch = settings.match(/Fills bezel gaps in three passes:[^<]*/)
  assert.ok(helpTextMatch, "expected to locate the bezel-fill help copy")
  const helpText = helpTextMatch[0]
  assert.doesNotMatch(helpText, /NuArcade/)
  assert.match(helpText, /never fetched or redistributed by Vespara/)
  assert.match(helpText, /then Vespara's own bundled placeholder art/)
})

test("no protected NuArcade compatibility identifier was touched by this branding cleanup", () => {
  // These are source-identifier concerns, not visible-copy concerns, and must
  // never be renamed. AttractMode.jsx and Settings.jsx do not define any of
  // these identifiers themselves, so the correct assertion here is that
  // renaming visible copy did not spill into a runtime compatibility bridge
  // or other protected source identifier in either file.
  assert.doesNotMatch(attractMode, /window\.nuarcade\s*=/, "this file must not itself redefine window.nuarcade")
  assert.doesNotMatch(settings, /app\.setName/, "this file has no business touching app.setName")
})
