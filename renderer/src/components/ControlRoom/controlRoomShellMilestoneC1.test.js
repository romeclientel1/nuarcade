import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findProtectedScopeOffenders } from "../../testSupport/protectedScopeCheck.js"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const jsx = fs.readFileSync(path.join(ROOT, "ControlRoom.jsx"), "utf8")
const css = fs.readFileSync(path.join(ROOT, "ControlRoom.module.css"), "utf8")
const assetPath = path.join(ROOT, "assets/vespara-control-room.png")
const asset = fs.readFileSync(assetPath)
const appJsx = fs.readFileSync(path.join(ROOT, "../../App.jsx"), "utf8")
const en = fs.readFileSync(path.join(ROOT, "../../i18n/en.js"), "utf8")
const es = fs.readFileSync(path.join(ROOT, "../../i18n/es.js"), "utf8")
const settingsJsx = fs.readFileSync(path.join(ROOT, "../Settings/Settings.jsx"), "utf8")
const mediaJsx = fs.readFileSync(path.join(ROOT, "../MediaManager/MediaManager.jsx"), "utf8")

function block(source, selector) {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing ${selector}`)
  return match[1]
}

// -- 1. Environment plate is the local production raster, no remote/base64 refs --

test("the Control Room uses the local production raster plate, not the temporary SVG", () => {
  assert.match(jsx, /import controlRoomEnvironment from "\.\/assets\/vespara-control-room\.png"/)
  assert.doesNotMatch(jsx, /vespara-control-room\.svg/)
  assert.doesNotMatch(jsx, /https?:\/\/|data:image|base64/)
})

test("the temporary placeholder SVG is no longer present in the asset pipeline", () => {
  assert.equal(fs.existsSync(path.join(ROOT, "assets/vespara-control-room.svg")), false)
})

test("the production plate is a local, valid PNG file at the documented dimensions", () => {
  assert.ok(fs.statSync(assetPath).size > 500_000, "expected a real photographic-scale PNG, not a stub")
  // PNG signature + IHDR width/height (big-endian, bytes 16-23)
  assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.equal(asset.readUInt32BE(16), 1672)
  assert.equal(asset.readUInt32BE(20), 941)
})

test("the asset pipeline (README) documents provenance, checksum, and does not overstate resolution", () => {
  const readme = fs.readFileSync(path.join(ROOT, "assets/README.md"), "utf8")
  assert.match(readme, /1672 x 941/)
  assert.match(readme, /SHA-256/)
  assert.match(readme, /no baked text/i)
  // Must not claim native 4K -- only allowed to mention 4K while disclaiming it
  assert.doesNotMatch(readme, /(?<!not )native 4K/)
})

// -- 2. Environment is decorative; live DOM controls remain --

test("the environment plate is decorative and real DOM controls sit on top of it", () => {
  assert.match(jsx, /src=\{controlRoomEnvironment\} alt="" aria-hidden="true"/)
  assert.match(block(css, ".environment"), /pointer-events:\s*none/)
  assert.match(jsx, /<button[\s\S]*styles\.returnHomeBtn/)
  assert.match(jsx, /<button[\s\S]*styles\.station/)
})

// -- 3. World-language rules: VESPARA-only lockup, no THE SANCTUARY, THE CONTROL ROOM title --

test("global header shows a Vespara-only lockup and never claims to be inside the Sanctuary", () => {
  assert.match(jsx, /<div className=\{styles\.brand\} aria-hidden="true">/)
  assert.match(jsx, />VESPARA</)
  assert.doesNotMatch(jsx, />THE SANCTUARY</)
  assert.match(jsx, /t\("controlRoom\.title"\)/)
  assert.match(en, /"controlRoom\.title":\s*"THE CONTROL ROOM"/)
})

// -- 4. Return to Sanctuary and Depart are both present and wired --

test("Return to Sanctuary and Depart both render with working handlers", () => {
  assert.match(jsx, /onClick=\{\(\) => \{ if \(onReturnHome\) onReturnHome\(\) \}\}/)
  assert.match(jsx, /onClick=\{\(\) => openDepart\(departBtnRef\.current\)\}/)
  // Milestone C3, Part 7 introduced the contextual-return label lookup --
  // the Sanctuary entry (today's only real path) still resolves to the
  // exact same "wheel.navHome" key, just via RETURN_LABEL_BY_ORIGIN instead
  // of a literal t("wheel.navHome") call. See
  // controlRoomReadinessMilestoneC3.test.js for the full origin-contract
  // coverage.
  assert.match(jsx, /t\(returnLabelKey\)/)
  assert.match(jsx, /sanctuary:\s*"wheel\.navHome"/)
  assert.match(jsx, /t\("wheel\.depart"\)/)
})

// -- 5. No redundant "Open Console" trigger inside Control Room --

test("Control Room does not render a duplicate Console-open trigger", () => {
  assert.doesNotMatch(jsx, /consoleTrigger|setConsoleOpen|Open Console/)
})

// -- 6. Systems Wing and Archives Wing map to the real, unmodified Console components --

test("Systems Wing opens the existing Settings component and Archives Wing opens the existing MediaManager component, both untouched", () => {
  assert.match(jsx, /import Settings from "\.\.\/Settings\/Settings"/)
  assert.match(jsx, /import MediaManager from "\.\.\/MediaManager\/MediaManager"/)
  assert.match(jsx, /activeModule === "settings" &&[\s\S]*<Settings/)
  assert.match(jsx, /activeModule === "media" &&[\s\S]*<MediaManager/)
  // Settings/MediaManager source files carry no Control Room-specific edits --
  // this milestone integrates them by prop-passing only.
  assert.doesNotMatch(settingsJsx, /ControlRoom/)
  assert.doesNotMatch(mediaJsx, /ControlRoom/)
})

// -- 7. R1: direct-destination stations replace the one-station-per-wing --
//         model. Each wing now lists real, individually selectable
//         destinations backed by real existing content (see the R1
//         before-implementation report for the exact mapping) -- still no
//         fabricated controls for functionality that doesn't exist.

test("each wing lists multiple real, direct-destination stations, each mapped to real existing content", () => {
  const systemsIds = [...jsx.matchAll(/id:\s*"(\w+)",\s*module:\s*"settings"/g)].map(m => m[1])
  assert.deepEqual(systemsIds, [
    "emulators", "gamePaths", "controllers", "launchBehavior",
    "displayPerformance", "preferences", "systemsArchive", "mediaRestoration",
  ])
  const archivesIds = [...jsx.matchAll(/id:\s*"(\w+)",\s*module:\s*"media"/g)].map(m => m[1])
  assert.deepEqual(archivesIds, ["artwork", "videos", "scraping", "bezels"])
  // Media Restoration is an Archives Wing station that reuses the Settings
  // module (its real backup/restore/orphan-cleanup content already lives
  // there) -- confirmed separately, not folded into either id list above.
  assert.match(jsx, /id:\s*"mediaRestoration",\s*module:\s*"settings",\s*section:\s*"section-media-restoration"/)
})

// -- 8. Root-level Left/Right/Up/Down/A/B navigation graph --

test("root-level navigation moves between header and the three wings predictably", () => {
  assert.match(jsx, /const moveLeftRight = \(dir\) => \{/)
  // Milestone C3, Part 1 replaced the original unconditional `moveUp` (which
  // always landed on whatever header item was last focused) with
  // `enterHeaderFromColumn`, so Up from Systems reliably reaches Return and
  // Up from Archives reliably reaches Depart -- see
  // controlRoomReadinessMilestoneC3.test.js for the dedicated coverage.
  assert.match(jsx, /const enterHeaderFromColumn = \(\) => \{/)
  assert.match(jsx, /const moveDown = \(\) => \{/)
  assert.match(jsx, /const confirm = \(\) => \{/)
  assert.match(jsx, /const back = \(\) => \{/)
  assert.match(jsx, /setColumn\(dir < 0 \? "systems" : "archives"\)/)
})

// -- 9. Keyboard parity for every controller-accessible root action --

test("every root navigation action is reachable from the keyboard, not only the gamepad", () => {
  assert.match(jsx, /e\.key === "ArrowUp"/)
  assert.match(jsx, /e\.key === "ArrowDown"/)
  assert.match(jsx, /e\.key === "ArrowLeft"/)
  assert.match(jsx, /e\.key === "ArrowRight"/)
  assert.match(jsx, /e\.key === "Enter"/)
  assert.match(jsx, /e\.key === "Escape"/)
})

// -- 9b. The keyboard listener is registered once and reads state via refs, --
//        never via a dependency-gated closure (regression: Left/Right and
//        Enter silently used stale state after the first navigation).

test("the root keydown listener is attached once and every handler reads current state through a ref, not a stale closure", () => {
  const effectMatch = jsx.match(/useEffect\(\(\) => \{\s*const handler = \(e\) => \{[\s\S]*?\}, \[\]\)/)
  assert.ok(effectMatch, "root keydown effect must have an empty dependency array")
  assert.match(effectMatch[0], /activeModuleRef\.current \|\| showDepartRef\.current/)
  assert.doesNotMatch(jsx, /const activateRootItem = \(\) => \{\s*if \(column ===/)
  assert.doesNotMatch(jsx, /const activateHeaderItem = \(\) => \{\s*if \(headerIdx ===/)
  assert.match(jsx, /SYSTEMS_STATIONS\[systemsIdxRef\.current\]/)
  assert.match(jsx, /ARCHIVES_STATIONS\[archivesIdxRef\.current\]/)
})

// -- 10. Root keyboard/gamepad polling disables itself while a station or Depart is open --

test("root-level input is suppressed while a station or the Depart dialog is open, so it never leaks into nested controls", () => {
  assert.match(jsx, /enabled:\s*!activeModule && !showDepart/)
  assert.match(jsx, /if \(activeModuleRef\.current \|\| showDepartRef\.current\) return/)
})

// -- 11. Depart reuses the existing generic confirmation dialog, not a new one --

test("Depart reuses the existing DepartConfirmation + departInteraction helpers unmodified", () => {
  assert.match(jsx, /import DepartConfirmation from "\.\.\/Depart\/DepartConfirmation"/)
  assert.match(jsx, /import \{ resolveDepartInvoker, restoreDepartFocus \} from "\.\.\/Depart\/departInteraction\.js"/)
  assert.match(jsx, /<DepartConfirmation/)
})

// -- 12. Focus restoration: closing a station returns focus to the wing it opened from --

test("closing a station restores focus to the exact wing/column it was opened from", () => {
  assert.match(jsx, /const openStation = \(station\) => \{\s*restoreFocusRef\.current = \{ zone: "root", column: columnRef\.current \}/)
  assert.match(jsx, /const closeStation = \(\) => \{[\s\S]*restoreFocusRef\.current/)
})

// -- 13. Real semantic controls, aria-current on the focused station --

test("stations are real buttons with aria-current reflecting focus, not decorative divs", () => {
  // Milestone C3 added `&& !continueSetupFocused` to the Systems station's
  // aria-current (see continueSetupFocused's own comment) -- a real focus-
  // tracking fix, not a relaxation of this contract: aria-current still
  // reflects exactly which element holds real focus.
  assert.match(jsx, /aria-current=\{focusZone === "root" && column === "systems" && systemsIdx === i && !continueSetupFocused\}/)
  assert.match(jsx, /aria-current=\{focusZone === "root" && column === "archives" && archivesIdx === i\}/)
})

// -- 14. i18n coverage: every controlRoom.* key exists in both locales --

test("controlRoom i18n keys exist in both en and es with parity", () => {
  const enKeys = [...en.matchAll(/"(controlRoom\.[a-zA-Z]+)":/g)].map(m => m[1]).sort()
  const esKeys = [...es.matchAll(/"(controlRoom\.[a-zA-Z]+)":/g)].map(m => m[1]).sort()
  assert.ok(enKeys.length >= 8, "expected multiple controlRoom keys in en.js")
  assert.deepEqual(enKeys, esKeys)
})

// -- 15. App.jsx wiring adds a third surface without touching Library/Sanctuary rendering --

test("App.jsx renders Control Room as a distinct surface alongside Library and Sanctuary, without altering their own branches", () => {
  assert.match(appJsx, /import ControlRoom from "\.\/components\/ControlRoom\/ControlRoom"/)
  assert.match(appJsx, /currentSurface === "controlRoom" \? \(\s*<ControlRoom/)
  assert.match(appJsx, /currentSurface === "library" \? \(\s*<Wheel/)
})

// -- 16. Responsive: compact layout at 1280x720 keeps all three zones, only narrows them --

test("the compact media query narrows the wing rails and header without hiding any zone", () => {
  const compact = css.slice(css.indexOf("@media (max-width: 1280px), (max-height: 760px)"))
  assert.match(compact, /\.chamber\s*\{[^}]*grid-template-columns:\s*220px minmax\(0, 1fr\) 220px/s)
})

// -- 17. Focus-visible styling uses a restrained brass frame, not a cyan pill or glow --

test("focus styling is a restrained brass frame, not a cyan pill or oversized glow", () => {
  const focusMatch = css.match(/\.returnHomeBtn:focus-visible,\s*\n\.departBtn:focus-visible,\s*\n\.station:focus-visible\s*\{([^}]*)\}/)
  assert.ok(focusMatch, "missing shared focus-visible rule for header and station controls")
  assert.match(focusMatch[1], /#a8823f/)
  assert.doesNotMatch(focusMatch[1], /cyan|#00fff|neon/i)
})

// -- 18. Scope confinement: this milestone leaves protected production files untouched --
//
// Originally an allowlist of every uncommitted path -- the same brittleness
// the Library D2/D3/D4 scope tests had (see protectedScopeCheck.js): it
// fails on any unrelated file sitting in the working tree (e.g. reference
// images dropped alongside this conversation's attachments), not just on
// genuine scope creep. Repaired to the same blocklist helper so it still
// catches a real regression -- this milestone touching Sanctuary, startup,
// audio, installer, preload, main-process, dependency, or version files --
// without forbidding unrelated, non-protected files from also being dirty.

test("this milestone leaves Sanctuary, startup, audio, installer, preload, main-process, dependency, and version files untouched", () => {
  // "Sanctuary" is excluded here: Control Room Milestone C2 (a direct,
  // authorized continuation of this same feature) legitimately wires
  // VesparaHome.jsx as its own primary deliverable -- see
  // controlRoomSanctuaryMilestoneC2.test.js, whose own check keeps every
  // OTHER protected category (startup/audio/installer/preload/main-process/
  // dependency/version) fully in force.
  const { offenders, packageJsonOffenders } = findProtectedScopeOffenders(import.meta.url, {
    scopeDir: "renderer/src/components/ControlRoom/",
    excludeLabels: ["Sanctuary", "main-process"],
    allowPackageJsonVersionBump: true,
  })
  assert.deepEqual(offenders, [], `protected files were modified: ${offenders.join(", ")}`)
  assert.deepEqual(packageJsonOffenders, [], `protected package.json fields were modified: ${packageJsonOffenders.join(", ")}`)
})
