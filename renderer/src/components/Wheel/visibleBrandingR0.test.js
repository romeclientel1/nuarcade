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
  assert.match(attractMode, /<span className=\{styles\.brandPrimary\}>VESPARA<\/span>/)
})

test("Attract Mode's bottom bar no longer contains a brandSecondary element", () => {
  const bottomBarStart = attractMode.indexOf("{/* Bottom bar */}")
  const bottomBarEnd = attractMode.indexOf("{/* Progress dots */}")
  assert.ok(bottomBarStart > -1 && bottomBarEnd > bottomBarStart, "expected to locate the bottom bar JSX block")
  const bottomBar = attractMode.slice(bottomBarStart, bottomBarEnd)
  assert.doesNotMatch(bottomBar, /brandSecondary/)
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
  // renaming visible copy did not spill into a CSS class name, an import
  // path, or any other source identifier in either file.
  assert.match(attractMode, /className=\{styles\.nuarcadeBrand\}/, "the internal (non-user-visible) nuarcadeBrand CSS class name must remain unchanged by this milestone")
  assert.doesNotMatch(attractMode, /window\.nuarcade\s*=/, "this file must not itself redefine window.nuarcade")
  assert.doesNotMatch(settings, /app\.setName/, "this file has no business touching app.setName")
})
