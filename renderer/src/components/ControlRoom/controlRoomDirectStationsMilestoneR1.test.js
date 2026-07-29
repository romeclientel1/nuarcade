// controlRoomDirectStationsMilestoneR1.test.js -------------------------------
// R1 -- Control Room navigation redesign: the two side columns now list
// direct-destination stations instead of each opening one large folder.
// Settings.jsx and MediaManager.jsx are still reused wholesale (their
// save/apply/IPC logic is untouched) -- each station scrolls Settings.jsx to
// an anchor or opens MediaManager on a specific tab. This file covers the
// behavior that's genuinely NEW in R1; the pre-existing C1/C2/C3 milestone
// tests were updated in place (not superseded) to match the new station
// model where an old assertion encoded the one-station-per-wing invariant
// this milestone deliberately replaces.

import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findProtectedScopeOffenders } from "../../testSupport/protectedScopeCheck.js"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const crJsx = fs.readFileSync(path.join(ROOT, "ControlRoom.jsx"), "utf8")
const crCss = fs.readFileSync(path.join(ROOT, "ControlRoom.module.css"), "utf8")
const settingsJsx = fs.readFileSync(path.join(ROOT, "../Settings/Settings.jsx"), "utf8")
const settingsCss = fs.readFileSync(path.join(ROOT, "../Settings/Settings.module.css"), "utf8")
const mediaJsx = fs.readFileSync(path.join(ROOT, "../MediaManager/MediaManager.jsx"), "utf8")
const mediaCss = fs.readFileSync(path.join(ROOT, "../MediaManager/MediaManager.module.css"), "utf8")
const en = fs.readFileSync(path.join(ROOT, "../../i18n/en.js"), "utf8")
const es = fs.readFileSync(path.join(ROOT, "../../i18n/es.js"), "utf8")

// -- 1. Systems Wing has 7 direct stations, Archives Wing has 4 -------------

test("Systems Wing lists 7 direct stations and Archives Wing lists 5 (4 media-tab stations + Media Restoration), matching the R1 destination mapping", () => {
  const systemsBlock = crJsx.slice(crJsx.indexOf("const SYSTEMS_STATIONS"), crJsx.indexOf("const ARCHIVES_STATIONS"))
  const archivesBlock = crJsx.slice(crJsx.indexOf("const ARCHIVES_STATIONS"), crJsx.indexOf("const RETURN_LABEL_BY_ORIGIN"))
  assert.equal([...systemsBlock.matchAll(/\{ id:/g)].length, 7)
  assert.equal([...archivesBlock.matchAll(/\{ id:/g)].length, 5)
})

// -- 2. Every station resolves to a real Settings anchor or MediaManager tab -

test("every Systems station names a real section id that exists in Settings.jsx, every Archives station names a real MediaManager tab", () => {
  const sectionIds = [...crJsx.matchAll(/section:\s*"([\w-]+)"/g)].map(m => m[1])
  for (const id of sectionIds) {
    assert.match(settingsJsx, new RegExp(`id="${id}"`), `Settings.jsx is missing anchor id="${id}"`)
  }
  const tabIds = [...crJsx.matchAll(/tab:\s*"(\w+)"/g)].map(m => m[1])
  const TABS = [...mediaJsx.match(/const TABS = \[([^\]]+)\]/)[1].matchAll(/'(\w+)'/g)].map(m => m[1])
  for (const tabId of tabIds) {
    assert.ok(TABS.includes(tabId), `MediaManager.jsx has no "${tabId}" tab (TABS: ${TABS.join(", ")})`)
  }
})

// -- 3. Media Restoration is an Archives Wing station that opens Settings ---

test("Media Restoration lives in ARCHIVES_STATIONS but opens the settings module (its real content lives in Settings.jsx, not duplicated into MediaManager)", () => {
  const archivesBlock = crJsx.slice(crJsx.indexOf("const ARCHIVES_STATIONS"), crJsx.indexOf("const RETURN_LABEL_BY_ORIGIN"))
  assert.match(archivesBlock, /id:\s*"mediaRestoration",\s*module:\s*"settings"/)
})

// -- 4. activeWing is derived from which wing a station was opened FROM, not from which module happens to render --

test("activeWing (used for wing dim/select styling) is derived from the wing the station opened from, not from activeModule alone -- so Media Restoration (an Archives station backed by the settings module) doesn't wrongly dim/select the Systems Wing", () => {
  assert.match(crJsx, /const activeWing = stationOpen \? restoreFocusRef\.current\?\.column : null/)
  assert.doesNotMatch(crJsx, /const activeWing = activeModule === "settings" \? "systems"/)
})

// -- 5. Settings/MediaManager receive the new, additive-only props ----------

test("Settings receives scrollToSection and MediaManager receives initialTab, each derived from the active station", () => {
  assert.match(crJsx, /scrollToSection=\{\s*\(SYSTEMS_STATIONS\.find/)
  assert.match(crJsx, /initialTab=\{ARCHIVES_STATIONS\.find\(s => s\.id === activeStationId\)\?\.tab\}/)
})

test("Settings.jsx scrolls to the requested section exactly once per mount, guarded against re-firing on every config edit", () => {
  assert.match(settingsJsx, /scrollToSection/)
  assert.match(settingsJsx, /scrolledRef\.current = true/)
  assert.match(settingsJsx, /document\.getElementById\(scrollToSection\)\?\.scrollIntoView/)
})

test("MediaManager.jsx opens directly on initialTab when given a recognized tab id, and falls back to library otherwise", () => {
  assert.match(mediaJsx, /const \[tab, setTab\] = useState\(TABS\.includes\(initialTab\) \? initialTab : "library"\)/)
})

// -- 6. Controllers station finishes wiring the previously-orphaned ControllerTest, doesn't invent a new feature --

test("the Controllers station wires up the pre-existing ControllerTest component that was imported but never rendered before R1", () => {
  assert.match(settingsJsx, /id="section-controllers"/)
  assert.match(settingsJsx, /onClick=\{\(\) => setShowControllerTest\(true\)\}/)
  assert.match(settingsJsx, /\{showControllerTest && \(\s*<ControllerTest onClose=\{\(\) => setShowControllerTest\(false\)\} \/>\s*\)\}/)
})

// -- 7. The duplicate "Emulators" heading bug (two disconnected sections --
//       sharing one i18n key) is fixed -----------------------------------

test("the second, disconnected Emulators section (auto-configure/toggles) no longer shares the first Emulators section's heading", () => {
  const occurrences = [...settingsJsx.matchAll(/t\("settings\.sectionEmulators"\)/g)]
  assert.equal(occurrences.length, 1, "settings.sectionEmulators should now be used for exactly one heading")
  assert.match(settingsJsx, /t\("settings\.sectionEmulatorBehavior"\)/)
})

// -- 8. Keyboard/gamepad navigation graph generalizes to N stations, not just 1 --

test("Up/Down within a column are bounded by that column's real station-list length, not a hardcoded 1", () => {
  assert.match(crJsx, /Math\.min\(SYSTEMS_STATIONS\.length - 1, i \+ 1\)/)
  assert.match(crJsx, /Math\.min\(ARCHIVES_STATIONS\.length - 1, i \+ 1\)/)
})

// -- 9. i18n coverage for every new station label/hint key -------------------

test("every new controlRoom.station.* key exists in both en and es with parity", () => {
  const enKeys = [...en.matchAll(/"(controlRoom\.station\.[a-zA-Z]+)":/g)].map(m => m[1]).sort()
  const esKeys = [...es.matchAll(/"(controlRoom\.station\.[a-zA-Z]+)":/g)].map(m => m[1]).sort()
  assert.equal(enKeys.length, 24, "expected 7 Systems + 5 Archives stations (Archives includes Media Restoration) x 2 keys each = 24")
  assert.deepEqual(enKeys, esKeys)
})

// -- 10. Responsive: wings still scroll internally, no page-level scrollbar --
//        introduced by the longer per-wing station lists ---------------------

test("wings still scroll internally (overflow-y: auto) rather than growing the page -- unchanged by the longer station lists", () => {
  const wingBlock = crCss.match(/\.wing\s*\{([^}]*)\}/)
  assert.ok(wingBlock)
  assert.match(wingBlock[1], /overflow-y:\s*auto/)
  assert.doesNotMatch(crCss, /\.stage\s*\{[^}]*overflow-y:\s*(auto|scroll)/s)
})

// -- 11. Visual-language restyle: no cyan tech-HUD tokens remain on station --
//        surfaces, and the panel no longer competes with .stationFrame -------

test("Settings.jsx and MediaManager.jsx panels no longer use the old cyan/Orbitron tech-HUD styling", () => {
  for (const css of [settingsCss, mediaCss]) {
    assert.doesNotMatch(css, /rgba\(\s*0,\s*(180|200),\s*255/, "cyan accent must be gone")
    assert.doesNotMatch(css, /#00c8ff/i, "cyan accent hex must be gone")
    assert.doesNotMatch(css, /Orbitron/i, "tech-HUD display font must be gone")
  }
})

test("the inner panel no longer draws its own border/shadow -- Control Room's .stationFrame is the only console frame now, so a station reads as one activated surface, not a window inside a window", () => {
  for (const css of [settingsCss, mediaCss]) {
    const panelBlock = css.match(/\.panel\s*\{([^}]*)\}/)
    assert.ok(panelBlock)
    assert.match(panelBlock[1], /border:\s*none/)
    assert.match(panelBlock[1], /box-shadow:\s*none/)
  }
})

test("panel titles use Vespara's shared neutral palette, not stark white or neon", () => {
  for (const css of [settingsCss, mediaCss]) {
    const titleBlock = css.match(/\.title\s*\{([^}]*)\}/)
    assert.ok(titleBlock)
    assert.match(titleBlock[1], /#cbd8e2/)
  }
})

// -- 12. Scope confinement ----------------------------------------------------

test("this milestone leaves Sanctuary, startup, audio, installer, preload, main-process, dependency, and version files untouched", () => {
  const { offenders, packageJsonOffenders } = findProtectedScopeOffenders(import.meta.url, {
    scopeDir: "renderer/src/components/ControlRoom/",
    excludeLabels: ["Sanctuary", "main-process"],
    allowPackageJsonVersionBump: true,
  })
  assert.deepEqual(offenders, [], `protected files were modified: ${offenders.join(", ")}`)
  assert.deepEqual(packageJsonOffenders, [], `protected package.json fields were modified: ${packageJsonOffenders.join(", ")}`)
})
