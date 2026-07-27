import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findProtectedScopeOffenders } from "../../testSupport/protectedScopeCheck.js"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const crJsx = fs.readFileSync(path.join(ROOT, "ControlRoom.jsx"), "utf8")
const crCss = fs.readFileSync(path.join(ROOT, "ControlRoom.module.css"), "utf8")
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

// -- 1/2. Up from Systems reaches Return, Up from Archives reaches Depart --

test("moveUpWithinColumn enters the header via enterHeaderFromColumn, not a fixed header index", () => {
  const fn = crJsx.slice(crJsx.indexOf("const moveUpWithinColumn = () => {"), crJsx.indexOf("const confirm = () => {"))
  assert.match(fn, /enterHeaderFromColumn\(\)/)
  assert.doesNotMatch(fn, /setFocusZone\("header"\)/, "must delegate to enterHeaderFromColumn, not inline the header transition")
})

test("enterHeaderFromColumn selects Return for the Systems column and Depart for the Archives column", () => {
  const fn = crJsx.slice(crJsx.indexOf("const enterHeaderFromColumn = () => {"), crJsx.indexOf("const moveDown = () => {"))
  assert.match(fn, /setHeaderIdx\(columnRef\.current === "archives" \? 1 : 0\)/)
  assert.match(fn, /setFocusZone\("header"\)/)
})

// -- 3. Left/Right navigates Return and Depart within the header --

test("Left/Right toggles headerIdx between Return (0) and Depart (1) while in the header zone", () => {
  assert.match(crJsx, /const moveLeftRight = \(dir\) => \{\s*if \(focusZoneRef\.current === "header"\) \{ setHeaderIdx\(i => i === 0 \? 1 : 0\); return \}/)
})

// -- 4. Down restores the exact prior wing/station --

test("Down from the header returns to root without mutating column/systemsIdx/archivesIdx -- state never moved, so 'restore' is just re-entering root", () => {
  const fn = crJsx.slice(crJsx.indexOf("const moveDown = () => {"), crJsx.indexOf("const moveUpWithinColumn = () => {"))
  assert.match(fn, /if \(focusZoneRef\.current === "header"\) \{ setFocusZone\("root"\); return \}/)
  assert.doesNotMatch(fn, /setColumn\(/, "moveDown must not touch column -- header navigation never mutates it")
})

// -- 5. A/Enter activates once (single activation path per zone) --

test("confirm() dispatches to exactly one of activateHeaderItem/activateRootItem based on focusZone, no fallthrough", () => {
  assert.match(crJsx, /const confirm = \(\) => \{\s*if \(focusZoneRef\.current === "header"\) activateHeaderItem\(\)\s*else activateRootItem\(\)\s*\}/)
})

// -- 6. B at root returns safely (unchanged C2 contract, re-verified here) --

test("Back/Escape still resolves one level at a time and never dead-ends at the header", () => {
  const backFn = crJsx.slice(crJsx.indexOf("const back = () => {"), crJsx.indexOf("const openDepart"))
  assert.match(backFn, /if \(focusZoneRef\.current === "root"\) \{ setFocusZone\("header"\); return \}/)
  assert.match(backFn, /if \(focusZoneRef\.current === "header"\) \{ if \(onReturnHome\) onReturnHome\(\); return \}/)
})

// -- 7/8. Depart confirmation defaults to No and restores exact focus on cancel --

test("Depart confirmation defaults to No (index 1) and cancelling restores the exact invoking element's focus", () => {
  assert.match(crJsx, /const openDepart = \(invoker\) => \{\s*departTriggerRef\.current = resolveDepartInvoker\(invoker\)\s*setDepartChoice\(1\)/)
  assert.match(crJsx, /const cancelDepart = \(\) => \{ setShowDepart\(false\); restoreDepartFocus\(departTriggerRef\.current\) \}/)
  assert.match(crJsx, /const declineDepart = \(\) => cancelDepart\(\)/)
})

// -- 9/10/11. One true focus owner: distinct classes/semantics for selected vs focused vs hover --

test("the true-focus treatment is built on :focus-visible (a browser-enforced singleton), not a second derived-state class layered onto the selected wing", () => {
  const focusMatch = crCss.match(/\.returnHomeBtn:focus-visible,\s*\n\.departBtn:focus-visible,\s*\n\.station:focus-visible\s*\{([^}]*)\}/)
  assert.ok(focusMatch, "missing shared focus-visible rule for header and station controls")
  assert.match(focusMatch[1], /#a8823f/)
  assert.doesNotMatch(focusMatch[1], /cyan|#00fff|neon/i)
})

test("wingSelected (persistent selection marker) and stationFocused/:focus-visible (true focus) are visually distinct rules, not aliases", () => {
  const selected = block(crCss, ".wingSelected")
  const focused = block(crCss, ".stationFocused")
  assert.doesNotMatch(selected, /box-shadow/, "the quiet selected marker must not carry the same local-illumination treatment as true focus")
  assert.match(focused, /border-color/)
  assert.notEqual(selected.replace(/\s/g, ""), focused.replace(/\s/g, ""))
})

test("hover has its own, weaker rule that cannot be mistaken for controller/keyboard focus", () => {
  const hover = block(crCss, ".station:hover")
  const focused = block(crCss, ".stationFocused")
  assert.doesNotMatch(hover, /transform|box-shadow/, "hover must not pick up the focus treatment's lift/illumination")
  assert.notEqual(hover.replace(/\s/g, ""), focused.replace(/\s/g, ""))
})

test("the selected-wing class is driven by `column`, never gated on focusZone, so it survives focus moving to the header", () => {
  assert.match(crJsx, /column === "systems" && !stationOpen \? " " \+ styles\.wingSelected : ""/)
  assert.match(crJsx, /column === "archives" && !stationOpen \? " " \+ styles\.wingSelected : ""/)
})

test("station focus styling is gated on focusZone === \"root\", so a station can never appear focused while the header holds focus", () => {
  assert.match(crJsx, /focusZone === "root" && column === "systems" && systemsIdx === i && !continueSetupFocused \? " " \+ styles\.stationFocused : ""/)
  assert.match(crJsx, /focusZone === "root" && column === "archives" && archivesIdx === i \? " " \+ styles\.stationFocused : ""/)
})

// -- 12/13/14. Readiness workstation renders truthful state, no fabricated data --

test("the readiness workstation replaces the old static idle copy with rows derived from real config/library state", () => {
  assert.doesNotMatch(crJsx, /workstationIdle|workstationHint/, "the old static placeholder copy must be gone")
  assert.match(crJsx, /const \{ games, config, loading \} = useGameLibrary\(\)/)
  assert.match(crJsx, /const controllersConfigured = Object\.values\(config\?\.controllers \|\| \{\}\)\.filter\(Boolean\)\.length/)
  assert.match(crJsx, /const gamesDiscovered = games\.length/)
  assert.match(crJsx, /const setupComplete = !!config\?\.setupComplete/)
  assert.match(crJsx, /readinessRows\.map\(row =>/)
})

// -- Blocker 2 (review round 2): readiness must be able to reach a
// completed state through a live, reachable signal, and must never show
// urgent/failure language for platform-unsupported or still-loading state.

test("readinessState is derived with setupComplete as a positive override, platform-support and loading as honest non-blocking states, and gamesDiscovered as the only real essential-completion signal", () => {
  const fn = crJsx.slice(crJsx.indexOf("const readinessState ="), crJsx.indexOf("const readinessRows ="))
  assert.match(fn, /setupComplete \? "ready"/)
  assert.match(fn, /!platformSupported \? "unavailable"/)
  assert.match(fn, /loading \? "unknown"/)
  assert.match(fn, /gamesDiscovered === 0 \? "needsSetup"/)
  assert.match(fn, /: "ready"/)
})

test("controllers are never part of the essential-completion gate -- optional for keyboard/mouse play", () => {
  const fn = crJsx.slice(crJsx.indexOf("const readinessState ="), crJsx.indexOf("const readinessRows ="))
  assert.doesNotMatch(fn, /controllersConfigured/, "controllersConfigured must not appear in the gate -- it's informational-only in the rows")
  assert.match(crJsx, /controllersConfigured > 0 \? "controlRoom\.statusReady" : "controlRoom\.statusOptionalNotConfigured"/)
})

test("platform support is read the same way useGameLibrary itself gates config population, so 'unavailable' and 'config will never arrive' agree", () => {
  assert.match(crJsx, /const platformSupported = typeof window !== "undefined" && window\.nuarcade\?\.platform === "win32"/)
})

test("a fully configured known state (setupComplete=true) reaches 'ready' regardless of games/controllers -- readiness CAN complete through a live signal", () => {
  // setupComplete is checked first, before platform/loading/games -- so it
  // is capable of producing "ready" even if every other signal would have
  // said otherwise. This is what closes the "Continue Setup could show
  // indefinitely" gap: a real, reachable config field can win.
  const stateExpr = crJsx.slice(crJsx.indexOf("const readinessState ="), crJsx.indexOf("const readinessRows ="))
  assert.match(stateExpr, /^\s*const readinessState =\s*\n\s*setupComplete \? "ready"/)
})

test("no hardcoded percentage or fabricated count literal appears in the readiness rows", () => {
  const rowsBlock = crJsx.slice(crJsx.indexOf("const readinessRows ="), crJsx.indexOf("const continueSetup ="))
  assert.doesNotMatch(rowsBlock, /%/, "no percentage literals")
  assert.doesNotMatch(rowsBlock, /\b\d{2,}\b/, "no multi-digit literal counts -- only real derived values (gamesDiscovered) may appear")
  assert.match(rowsBlock, /gamesDiscovered/)
})

test("the only interpolated count in the readiness UI is the real scanned library size, not an invented number", () => {
  assert.match(crJsx, /t\("controlRoom\.statusDiscoveredCount", \{ count: gamesDiscovered \}\)/)
  assert.match(en, /"controlRoom\.statusDiscoveredCount":\s*"\{count\} discovered"/)
})

// -- 15. Continue Setup opens the correct existing Systems station --

test("Continue Setup opens the real Settings station through the same openStation path stations use, not a second implementation", () => {
  assert.match(crJsx, /const continueSetup = \(\) => \{ setFocusZone\("root"\); setColumn\("systems"\); setSystemsIdx\(0\); openStation\(SYSTEMS_STATIONS\[0\]\) \}/)
})

// Regression test for a real bug caught live in this milestone's own
// preview verification (Blocker 1): Tab-ing from the Settings station to
// Continue Setup left the Settings station's derived-state "focused" class
// stuck on (its onFocus fired and set focusZone/column/systemsIdx; nothing
// cleared that when focus moved on, since Continue Setup deliberately has
// no onFocus of its own) -- producing two simultaneously bright-focused
// controls. Fixed with continueSetupFocused, a flag that tracks real DOM
// focus on Continue Setup specifically and suppresses the station's
// focused class while it's true.
test("continueSetupFocused suppresses the Systems station's focused class and aria-current while Continue Setup genuinely holds focus", () => {
  assert.match(crJsx, /const \[continueSetupFocused, setContinueSetupFocused\] = useState\(false\)/)
  assert.match(crJsx, /systemsIdx === i && !continueSetupFocused \? " " \+ styles\.stationFocused : ""/)
  assert.match(crJsx, /onFocus=\{\(\) => \{ setFocusZone\("root"\); setColumn\("systems"\); setSystemsIdx\(i\); setContinueSetupFocused\(false\) \}\}/)
  assert.match(crJsx, /onFocus=\{\(\) => setContinueSetupFocused\(true\)\}/)
  assert.match(crJsx, /onBlur=\{\(\) => setContinueSetupFocused\(false\)\}/)
})

// -- 16/17/18. No false urgency once ready; wing purpose copy present --
// -- Required states 1-5 (Blocker 2): each readinessState renders distinct,
//    honest copy -- never a shared/ambiguous branch.

test("readinessState \"needsSetup\" (state 1: first-time/no games) renders the Continue Setup call-to-action", () => {
  assert.match(crJsx, /readinessState === "needsSetup" && \(\s*<button[\s\S]*?controlRoom\.continueSetup/)
})

test("readinessState \"ready\" (state 3: fully configured, or games discovered with no known blocker -- state 2) renders the static Vespara Ready readout, no button", () => {
  assert.match(crJsx, /readinessState === "ready" && \(\s*<div className=\{styles\.readinessComplete\}>\{t\("controlRoom\.vesparaReady"\)\}<\/div>\s*\)/)
})

test("readinessState \"unavailable\" (state 5: macOS/non-win32) renders neutral copy, not a failure or urgent CTA", () => {
  assert.match(crJsx, /readinessState === "unavailable" && \(\s*<div className=\{styles\.readinessNeutral\}>\{t\("controlRoom\.readinessUnavailable"\)\}<\/div>\s*\)/)
  assert.doesNotMatch(crJsx, /readinessState === "unavailable"[\s\S]{0,120}controlRoom\.continueSetup/)
})

test("readinessState \"unknown\" (state 4: config/library still loading) renders neutral 'checking' copy, not a permanent failure state", () => {
  assert.match(crJsx, /readinessState === "unknown" && \(\s*<div className=\{styles\.readinessNeutral\}>\{t\("controlRoom\.readinessChecking"\)\}<\/div>\s*\)/)
  assert.doesNotMatch(crJsx, /readinessState === "unknown"[\s\S]{0,120}controlRoom\.continueSetup/)
})

test("state 2 (games discovered, controller status optional/unknown) shows no urgent setup warning -- controllers cannot force needsSetup", () => {
  // Simulated: gamesDiscovered > 0, controllersConfigured === 0, platform
  // supported, not loading, setupComplete false -> falls through every
  // gate to "ready", never "needsSetup". Proven structurally: the gate
  // chain's only game-related branch is `gamesDiscovered === 0`, and
  // controllers never appear in that chain (asserted above).
  const fn = crJsx.slice(crJsx.indexOf("const readinessState ="), crJsx.indexOf("const readinessRows ="))
  assert.match(fn, /gamesDiscovered === 0 \? "needsSetup"\s*\n\s*: "ready"/)
})

test("Systems Wing and Archives Wing each render their real-world purpose line", () => {
  assert.match(crJsx, /t\("controlRoom\.systemsPurpose"\)/)
  assert.match(crJsx, /t\("controlRoom\.archivesPurpose"\)/)
  assert.match(en, /"controlRoom\.systemsPurpose":\s*"Make the worlds playable\."/)
  assert.match(en, /"controlRoom\.archivesPurpose":\s*"Make the collection come alive\."/)
})

// -- 19. Gold trim applies only to major world labels, never to descriptions/status --

test("goldTrim is applied to VESPARA, THE CONTROL ROOM, wing titles, Return, and Depart -- and nowhere else", () => {
  assert.match(crJsx, /styles\.returnHomeBtn \+ " " \+ styles\.goldTrim/)
  assert.match(crJsx, /styles\.departBtn \+ " " \+ styles\.goldTrim/)
  assert.match(crJsx, /styles\.brandName \+ " " \+ styles\.goldTrim/)
  assert.match(crJsx, /styles\.placeName \+ " " \+ styles\.goldTrim/)
  assert.match(crJsx, /styles\.wingTitle \+ " " \+ styles\.goldTrim/)
  assert.doesNotMatch(crJsx, /styles\.wingPurpose \+ " " \+ styles\.goldTrim/)
  assert.doesNotMatch(crJsx, /styles\.readinessLabel \+ " " \+ styles\.goldTrim/)
  assert.doesNotMatch(crJsx, /styles\.readinessValue \+ " " \+ styles\.goldTrim/)
  assert.doesNotMatch(crJsx, /styles\.stationHint \+ " " \+ styles\.goldTrim/)
  assert.doesNotMatch(crJsx, /styles\.stationLabel \+ " " \+ styles\.goldTrim/)
})

test("goldTrim itself is a restrained stroke + soft text-shadow, not a heavy glow or illegible outline", () => {
  const trim = block(crCss, ".goldTrim")
  assert.match(trim, /-webkit-text-stroke:\s*0\.6px/)
  assert.doesNotMatch(trim, /text-shadow:[^;]*0\s+0\s+(?:[5-9]\d|\d{3,})px/, "blur radius must stay restrained, not a giant glow")
})

// -- 20/21. Settings/Media close restores exact Systems/Archives focus (C1/C2 mechanism, re-verified) --

test("closing a station still restores focus to the exact wing/column it was opened from", () => {
  assert.match(crJsx, /const openStation = \(station\) => \{\s*restoreFocusRef\.current = \{ zone: "root", column: columnRef\.current \}/)
  assert.match(crJsx, /const closeStation = \(\) => \{\s*setActiveModule\(null\)\s*setActiveStationId\(null\)\s*const restore = restoreFocusRef\.current\s*if \(restore\) \{ setFocusZone\(restore\.zone\); setColumn\(restore\.column\) \}/)
})

// -- 22. Root controls are inert while a station is open (C1/C2 mechanism, re-verified) --

test("root-level input is suppressed while a station or Depart is open, and the room behind an open station is pointer-inert", () => {
  assert.match(crJsx, /enabled:\s*!activeModule && !showDepart/)
  assert.match(crJsx, /if \(activeModuleRef\.current \|\| showDepartRef\.current\) return/)
  assert.match(crCss, /\.roomInactive \{\s*pointer-events:\s*none;\s*\}/)
})

// -- 23/24/25. Contextual return contract: sanctuary/library origins, safe fallback --

test("ControlRoom accepts an entryOrigin prop with sanctuary as the default and library as a recognized-but-unwired alternative", () => {
  assert.match(crJsx, /entryOrigin = "sanctuary"/)
  assert.match(crJsx, /const RETURN_LABEL_BY_ORIGIN = \{\s*sanctuary:\s*"wheel\.navHome",\s*library:\s*"controlRoom\.returnLibrary",\s*\}/)
})

test("the current Sanctuary entry still displays 'Return to Sanctuary' via the unchanged wheel.navHome key", () => {
  assert.match(crJsx, /RETURN_LABEL_BY_ORIGIN\[entryOrigin\] \|\| RETURN_LABEL_BY_ORIGIN\.sanctuary/)
  assert.match(en, /"wheel\.navHome":\s*"Return to Sanctuary"/)
})

test("an unrecognized origin falls back to sanctuary, not to a broken/undefined label", () => {
  // RETURN_LABEL_BY_ORIGIN[entryOrigin] is undefined for any key not in the
  // map (e.g. a typo'd or future origin) -- the `||` fallback below is what
  // makes that safe.
  assert.match(crJsx, /const returnLabelKey = RETURN_LABEL_BY_ORIGIN\[entryOrigin\] \|\| RETURN_LABEL_BY_ORIGIN\.sanctuary/)
})

test("Library is not wired to Control Room yet -- App.jsx's only <ControlRoom> call site passes no entryOrigin, so the sanctuary default is what actually runs", () => {
  const callSite = appJsx.slice(appJsx.indexOf("<ControlRoom"), appJsx.indexOf("/>", appJsx.indexOf("<ControlRoom")))
  assert.doesNotMatch(callSite, /entryOrigin/)
  assert.equal((appJsx.match(/<ControlRoom/g) || []).length, 1)
})

// -- 26/27. Responsive: readiness content adapts at the compact breakpoint --

test("the compact breakpoint shrinks the workstation/readiness rows without hiding them", () => {
  const compact = crCss.slice(crCss.indexOf("@media (max-width: 1280px)"))
  assert.match(compact, /\.workstation \{/)
  assert.match(compact, /\.readinessRow \{/)
  assert.doesNotMatch(compact, /\.workstation \{[^}]*display:\s*none/)
})

// -- 28. Settings.jsx and MediaManager.jsx remain functionally unchanged --

test("Settings.jsx and MediaManager.jsx still carry no Control Room-specific edits", () => {
  assert.doesNotMatch(settingsJsx, /ControlRoom/)
  assert.doesNotMatch(mediaJsx, /ControlRoom/)
})

// -- i18n parity --

test("every new controlRoom.* key added this milestone exists in both en and es with parity", () => {
  const enKeys = [...en.matchAll(/"(controlRoom\.[a-zA-Z]+)":/g)].map(m => m[1]).sort()
  const esKeys = [...es.matchAll(/"(controlRoom\.[a-zA-Z]+)":/g)].map(m => m[1]).sort()
  assert.deepEqual(enKeys, esKeys)
  for (const key of [
    "controlRoom.systemsPurpose", "controlRoom.archivesPurpose", "controlRoom.returnLibrary",
    "controlRoom.readinessTitle", "controlRoom.readinessEmulators", "controlRoom.readinessControllers",
    "controlRoom.readinessPaths", "controlRoom.readinessGames", "controlRoom.readinessStatus",
    "controlRoom.statusConfigured", "controlRoom.statusNeedsSetup", "controlRoom.statusReady",
    "controlRoom.statusOptionalNotConfigured", "controlRoom.statusConnected", "controlRoom.statusNoPaths",
    "controlRoom.statusDiscoveredCount", "controlRoom.statusNotScanned", "controlRoom.statusUnavailable",
    "controlRoom.statusChecking", "controlRoom.continueSetup", "controlRoom.vesparaReady",
    "controlRoom.readinessUnavailable", "controlRoom.readinessChecking",
  ]) {
    assert.ok(enKeys.includes(key), `missing en key ${key}`)
  }
})

// -- 29. No Library, installer, preload, main-process, dependency, or version changes --

test("this milestone leaves Sanctuary, startup, audio, installer, preload, main-process, dependency, and version files untouched", () => {
  const { offenders, packageJsonOffenders } = findProtectedScopeOffenders(import.meta.url, {
    scopeDir: "renderer/src/components/ControlRoom/",
    excludeLabels: [],
  })
  assert.deepEqual(offenders, [], `protected files were modified: ${offenders.join(", ")}`)
  assert.deepEqual(packageJsonOffenders, [], `protected package.json fields were modified: ${packageJsonOffenders.join(", ")}`)
})
