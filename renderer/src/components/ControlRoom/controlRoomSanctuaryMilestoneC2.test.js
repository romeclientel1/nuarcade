import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findProtectedScopeOffenders } from "../../testSupport/protectedScopeCheck.js"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const crJsx = fs.readFileSync(path.join(ROOT, "ControlRoom.jsx"), "utf8")
const crCss = fs.readFileSync(path.join(ROOT, "ControlRoom.module.css"), "utf8")
const homeJsx = fs.readFileSync(path.join(ROOT, "../VesparaHome/VesparaHome.jsx"), "utf8")
const homeCss = fs.readFileSync(path.join(ROOT, "../VesparaHome/VesparaHome.module.css"), "utf8")
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

// NOTE on scope: Part 5 (unifying the Library Console's Settings/Media
// buttons to route through this same Control Room surface) is deliberately
// NOT implemented this milestone and has no tests here. Doing so would
// route Wheel's "Media"/"Settings" console-bar buttons through App.jsx's
// currentSurface swap, which unmounts Wheel entirely (App renders Wheel /
// ControlRoom / VesparaHome as mutually exclusive branches) -- losing
// Wheel's own in-place scroll position, active filter tab, and selected
// game, none of which are lost today (Settings/MediaManager currently
// mount as overlays on top of a still-mounted Wheel). It also collides
// with Part 12's fixed "always return to Sanctuary" header contract versus
// Part 5's own "preserve current user expectations" requirement (today,
// closing Settings from Library returns to Library, not Sanctuary). See
// the milestone report for the full writeup; this was reported rather than
// guessed, per that part's own explicit escape hatch.

// -- 1/2. Control Room is a real Sanctuary destination, in world-language --

test("Control Room is a Sanctuary destination with a real, ordered ACTIONS entry", () => {
  assert.match(homeJsx, /const ACTIONS = \["library", "controlRoom", "switchPlayer", "depart"\]/)
})

test("the destination uses world-language (The Control Room), not software-language (Settings/Console)", () => {
  assert.match(homeJsx, /controlRoom:\s*t\("home\.controlRoomDestination"\)/)
  assert.match(en, /"home\.controlRoomDestination":\s*"The Control Room"/)
  assert.match(es, /"home\.controlRoomDestination":\s*"La Sala de Control"/)
  assert.doesNotMatch(homeJsx, /home\.settingsDestination|home\.consoleDestination/)
})

test("no generic Settings menu tile was added, and no Library/Media destination is duplicated", () => {
  const actionsLiteral = homeJsx.match(/const ACTIONS = \[([^\]]+)\]/)?.[1] || ""
  assert.doesNotMatch(actionsLiteral, /settings|media/i)
  // Exactly one "library" entry -- Control Room is additive, not a second
  // route into the same place.
  assert.equal((actionsLiteral.match(/"library"/g) || []).length, 1)
})

// -- 3/4. Reachable by keyboard and controller -------------------------------
// VesparaHome's action row already has one generic, array-driven
// left/right/confirm implementation (both the keyboard handler and
// useOverlayGamepad) that every ACTIONS entry flows through -- there is no
// per-destination branch to add or miss, so Control Room inherits full
// keyboard/controller reachability automatically. These tests confirm
// that generic path still governs all four entries post-change.

test("keyboard Left/Right/Enter navigate the action row generically -- Control Room requires no special-cased branch", () => {
  const handler = homeJsx.slice(homeJsx.indexOf("const handler = (e) => {"), homeJsx.indexOf("window.addEventListener(\"keydown\", handler)"))
  assert.match(handler, /actionIndex < ACTIONS\.length - 1/)
  assert.match(handler, /actionIndex > 0/)
  assert.match(handler, /if \(e\.key === "Enter"\) \{ e\.preventDefault\(\); launchFocusedRef\.current\(\) \}/)
  assert.doesNotMatch(handler, /action === "controlRoom"/, "no special-cased branch should exist for one destination")
})

// Regression test for a real bug caught live in this milestone's own
// preview verification: the keyboard handler used to be registered with a
// dependency array including focusZone/recentIndex/actionIndex, so two
// keydown events close enough together (a fast keypress, not merely a
// contrived edge case) could land before React's effect-cleanup/resubscribe
// cycle completed, reading a stale actionIndex -- reproduced live: pressing
// Right then Enter on the newly-added Control Room tile sometimes activated
// Library instead. Fixed the same way Control Room C1 fixed its own root
// navigation: mirror everything into refs, register the listener once.
test("the native keydown listener is registered once and reads current state through refs, not a stale closure", () => {
  const effectMatch = homeJsx.match(/useEffect\(\(\) => \{\s*const handler = \(e\) => \{[\s\S]*?\}, \[\]\)/)
  assert.ok(effectMatch, "the keyboard-parity effect must have an empty dependency array")
  assert.match(effectMatch[0], /const focusZone = focusZoneRef\.current/)
  assert.match(effectMatch[0], /const recentIndex = recentIndexRef\.current/)
  assert.match(effectMatch[0], /const actionIndex = actionIndexRef\.current/)
  assert.match(homeJsx, /const focusZoneRef = useRef\(focusZone\); focusZoneRef\.current = focusZone/)
  assert.match(homeJsx, /const actionIndexRef = useRef\(actionIndex\); actionIndexRef\.current = actionIndex/)
  assert.match(homeJsx, /const launchFocusedRef = useRef\(launchFocused\); launchFocusedRef\.current = launchFocused/)
})

test("controller Left/Right/Confirm navigate the action row through the same generic useOverlayGamepad wiring", () => {
  const gamepadBlock = homeJsx.slice(homeJsx.indexOf("useOverlayGamepad({"), homeJsx.indexOf("// Keyboard parity"))
  assert.match(gamepadBlock, /actionIndex < ACTIONS\.length - 1/)
  assert.match(gamepadBlock, /onConfirm: launchFocused/)
})

// Regression test for a second real bug caught live in this milestone's own
// preview verification: VesparaHome's keyboard handler never called
// e.preventDefault() on Enter/Arrow keys. This was invisible before Control
// Room existed (nothing native was focused), but once Control Room mounts
// and moves real DOM focus onto its own Return button, an unprevented Enter
// keydown's default browser action can synthesize a click on whatever
// element now holds focus -- reproduced live: pressing Enter on the Control
// Room tile entered the room and then immediately, silently exited it via a
// phantom click on the Return button, within the same event.
test("the keyboard handler calls preventDefault on every key it handles, closing the gap that let a stray Enter reach a newly-focused element after navigating", () => {
  assert.match(homeJsx, /if \(e\.key === "Enter"\) \{ e\.preventDefault\(\); launchFocusedRef\.current\(\) \}/)
  assert.match(homeJsx, /if \(e\.key === "Escape"\) \{ e\.preventDefault\(\);/)
  assert.match(homeJsx, /if \(e\.key === "ArrowLeft"\) \{\s*e\.preventDefault\(\)/)
  assert.match(homeJsx, /if \(e\.key === "ArrowRight"\) \{\s*e\.preventDefault\(\)/)
})

// -- 5. Enter/A opens the C1 ControlRoom surface -----------------------------

test("activating the Control Room destination calls onEnterControlRoom, reusing the C1 surface", () => {
  assert.match(homeJsx, /else if \(action === "controlRoom"\) onEnterControlRoom\?\.\(\)/)
  assert.match(appJsx, /const handleEnterControlRoom = \(\) => \{[\s\S]*?navigateSurface\("controlRoom"\)/)
  assert.match(appJsx, /onEnterControlRoom=\{handleEnterControlRoom\}/)
  // The same <ControlRoom> import/branch C1 already wired -- not a second
  // implementation.
  assert.equal((appJsx.match(/import ControlRoom from/g) || []).length, 1)
  assert.equal((appJsx.match(/<ControlRoom/g) || []).length, 1)
})

// -- 6. Return restores the same Sanctuary session ---------------------------

test("returning from Control Room goes through the same goHome path as Library, not a new session/phase reset", () => {
  const fn = appJsx.slice(appJsx.indexOf("const handleReturnHomeFromControlRoom"), appJsx.indexOf("return (", appJsx.indexOf("const handleReturnHomeFromControlRoom")))
  assert.match(fn, /goToSurfaceRoot\(\)/)
  assert.doesNotMatch(fn, /setPhase\(/, "must not reset phase (that would drop the Traveler back to Player Select)")
  assert.doesNotMatch(fn, /selectProfile|selectGuest/, "must not touch profile/session selection")
})

// -- 7. Focus restores to the Control Room destination on return ------------

test("App threads a one-shot focus hint so Sanctuary re-focuses the Control Room tile after a same-session return", () => {
  assert.match(appJsx, /const \[homeFocusHint, setHomeFocusHint\] = useState\(null\)/)
  assert.match(appJsx, /setHomeFocusHint\("controlRoom"\)/)
  assert.match(appJsx, /initialFocusHint=\{homeFocusHint\}/)
  assert.match(appJsx, /onFocusHintConsumed=\{\(\) => setHomeFocusHint\(null\)\}/)
  // Cleared on every OTHER deliberate navigation so it can't leak into an
  // unrelated later Home visit (e.g. after switching players).
  assert.match(appJsx, /const handleEnterLibrary = \(\) => \{[\s\S]*?setHomeFocusHint\(null\)/)
  assert.match(appJsx, /const handleReturnToPlayerSelect = \(\) => \{[\s\S]*?setHomeFocusHint\(null\)/)
})

// Regression test for a third real bug caught live in this milestone's own
// preview verification: the derived-default-focus effect (gated only on
// `hasAcceptedInitialFocus`/`loading`) could re-fire, after the hint effect
// already ran, in a render where `loading` had just resolved but
// `hasAcceptedInitialFocus` hadn't yet reflected the hint effect's own
// update from the SAME mount -- a genuine race between two independently
// triggered re-renders, not merely a hypothetical. It won the last write
// and silently overrode the Control Room focus hint back to the Library
// default. Reproduced live: returning from Control Room landed focus on
// THE LIBRARY instead of THE CONTROL ROOM tile.
test("the derived-default-focus effect also yields to a pending focus hint, closing a real race with the hint effect", () => {
  // Normalized first (per the platform-independence contract below), then
  // isolated via two single-line, structurally-unique anchors rather than
  // a literal multi-line string -- a literal "X\n    Y" anchor breaks on a
  // CRLF checkout (Windows) since the actual byte sequence between those
  // two lines is "\r\n", not "\n", so indexOf silently returns -1 and the
  // slice becomes "" (this is exactly what broke in CI). Neither anchor
  // used here embeds a newline of its own, so both are immune to line-
  // ending style regardless of normalization, and normalizing besides is
  // just defense in depth.
  const normalized = homeJsx.replace(/\r\n/g, "\n")

  const startAnchor = "if (hasAcceptedInitialFocus) return"
  // The effect's own closing dependency array -- unique in the file and
  // therefore an unambiguous right edge for exactly this effect, not
  // "wherever the next occurrence of some generic token happens to be".
  const endAnchor = "}, [hasAcceptedInitialFocus, initialFocusHint, loading, initialFocus, displayedRecentGames])"

  const startIdx = normalized.indexOf(startAnchor)
  const endIdx = normalized.indexOf(endAnchor)
  assert.ok(startIdx !== -1, "could not locate the derived-default-focus effect's start anchor")
  assert.ok(endIdx !== -1, "could not locate the derived-default-focus effect's own dependency array")
  assert.ok(endIdx > startIdx, "the dependency array must close AFTER the effect body starts")

  const effectBlock = normalized.slice(startIdx, endIdx)
  assert.ok(effectBlock.length > 0, "extracted effect block must not be empty")
  assert.match(effectBlock, /if \(initialFocusHint\) return/)

  // Simulated-CRLF regression check: the same extraction, run against a
  // CRLF copy of the source, must produce the same non-empty, guard-
  // containing block -- this is what would have caught the original bug
  // before it ever reached CI.
  const crlfSource = normalized.replace(/\n/g, "\r\n")
  const crlfNormalized = crlfSource.replace(/\r\n/g, "\n")
  const crlfStart = crlfNormalized.indexOf(startAnchor)
  const crlfEnd = crlfNormalized.indexOf(endAnchor)
  assert.ok(crlfStart !== -1 && crlfEnd !== -1 && crlfEnd > crlfStart, "extraction must also succeed against a CRLF copy of the source")
  const crlfEffectBlock = crlfNormalized.slice(crlfStart, crlfEnd)
  assert.ok(crlfEffectBlock.length > 0)
  assert.match(crlfEffectBlock, /if \(initialFocusHint\) return/)

  assert.match(normalized, /\}, \[hasAcceptedInitialFocus, initialFocusHint, loading, initialFocus, displayedRecentGames\]\)/)
})

test("VesparaHome consumes the focus hint exactly once and focuses the matching ACTIONS entry", () => {
  const effect = homeJsx.slice(homeJsx.indexOf("// Returning-destination focus hint"), homeJsx.indexOf("// Visual-only correction:"))
  assert.match(effect, /if \(!initialFocusHint\) return/)
  assert.match(effect, /ACTIONS\.indexOf\(initialFocusHint\)/)
  assert.match(effect, /setHasAcceptedInitialFocus\(true\)/)
  assert.match(effect, /onFocusHintConsumed\?\.\(\)/)
})

// -- 11/12. Settings opens from Systems Wing, MediaManager from Archives ----
// (already covered structurally by C1's own test; re-asserted here as part
// of C2's explicit checklist)

test("Settings opens from the Systems Wing stations and MediaManager from the Archives Wing stations (R1: direct destinations, same two underlying components)", () => {
  assert.match(crJsx, /const SYSTEMS_STATIONS = \[/)
  assert.match(crJsx, /const ARCHIVES_STATIONS = \[/)
  assert.match(crJsx, /activeModule === "settings" &&[\s\S]*<Settings/)
  assert.match(crJsx, /activeModule === "media" &&[\s\S]*<MediaManager/)
})

// -- 13/14. Settings/MediaManager remain functionally intact ----------------

test("Settings.jsx and MediaManager.jsx carry no Control Room-specific edits -- integration is prop-passing and CSS wrapping only", () => {
  assert.doesNotMatch(settingsJsx, /ControlRoom/)
  assert.doesNotMatch(mediaJsx, /ControlRoom/)
  // Every prop C1 already passed remains passed unchanged, except themeId/
  // onThemeChange -- removed repo-wide when the Theme Color setting was
  // retired (see useTheme.js). R1 added scrollToSection/initialTab as new,
  // additive props.
  assert.match(crJsx, /<Settings\s*\n\s*games=\{games\}\s*\n\s*onClose=\{closeStation\}\s*\n\s*onCRTChange=\{onCRTChange\}\s*\n\s*crtEnabled=\{crtEnabled\}\s*\n\s*uiSoundsEnabled=\{uiSoundsEnabled\}\s*\n\s*onUiSoundsChange=\{onUiSoundsChange\}\s*\n\s*uiSoundVolume=\{uiSoundVolume\}\s*\n\s*onUiSoundVolumeChange=\{onUiSoundVolumeChange\}\s*\n\s*scrollToSection=\{/)
  assert.doesNotMatch(crJsx, /themeId|onThemeChange/)
  assert.match(crJsx, /<MediaManager\s*\n\s*onClose=\{closeStation\}\s*\n\s*onVideosUpdated=\{\(\) => \{\}\}\s*\n\s*onArtworkUpdated=\{\(\) => \{\}\}\s*\n\s*initialTab=\{/)
})

// -- 15. Closing a station restores the exact originating station -----------

test("closing a station still restores focus to the exact wing/column it was opened from (C1 mechanism untouched)", () => {
  assert.match(crJsx, /const openStation = \(station\) => \{\s*restoreFocusRef\.current = \{ zone: "root", column: columnRef\.current \}/)
  assert.match(crJsx, /const closeStation = \(\) => \{\s*setActiveModule\(null\)\s*setActiveStationId\(null\)\s*const restore = restoreFocusRef\.current\s*if \(restore\) \{ setFocusZone\(restore\.zone\); setColumn\(restore\.column\) \}/)
})

// -- 16. B/Escape returns exactly one level, extended to leave the room -----

test("Back/Escape at the root wings returns to the header, and Back/Escape at the header now leaves Control Room via the Return path", () => {
  const backFn = crJsx.slice(crJsx.indexOf("const back = () => {"), crJsx.indexOf("const openDepart"))
  assert.match(backFn, /if \(focusZoneRef\.current === "root"\) \{ setFocusZone\("header"\); return \}/)
  assert.match(backFn, /if \(focusZoneRef\.current === "header"\) \{ if \(onReturnHome\) onReturnHome\(\); return \}/)
})

// -- 17. Native form controls unaffected by the workstation wrapper ---------

test("the station frame is a pure CSS wrapper -- no keydown/keyup interception that could hijack native form controls", () => {
  const frameJsxBlock = crJsx.slice(crJsx.indexOf('<div className={styles.stationFrame} data-active-wing="systems">'), crJsx.indexOf("{activeModule === \"media\""))
  assert.doesNotMatch(frameJsxBlock, /onKeyDown|onKeyUp|onKeyPress/)
  assert.doesNotMatch(block(crCss, ".stationFrame"), /pointer-events:\s*none/, "the frame itself must stay interactive -- only the room behind it is dimmed/inert")
})

// -- 18/19. Neutral-frame protection and no held-input leakage ---------------

test("root-level input still uses the same shared useOverlayGamepad/keydown gating (neutral-frame protection is that hook's concern, untouched)", () => {
  assert.match(crJsx, /import \{ useOverlayGamepad \} from "\.\.\/\.\.\/hooks\/useOverlayGamepad\.js"/)
  assert.match(crJsx, /enabled:\s*!activeModule && !showDepart/)
  assert.match(crJsx, /if \(activeModuleRef\.current \|\| showDepartRef\.current\) return/)
})

test("VesparaHome's own overlay gamepad continues to disable itself while Depart or a controller prompt is active", () => {
  assert.match(homeJsx, /enabled:\s*!showDepartConfirm && !needsControllerPrompt/)
})

// -- 20. Depart remains separate and protected -------------------------------

test("Depart in both Sanctuary and Control Room still uses the shared DepartConfirmation dialog, untouched by this milestone", () => {
  assert.match(homeJsx, /<DepartConfirmation/)
  assert.match(crJsx, /<DepartConfirmation/)
  assert.doesNotMatch(homeJsx, /data-vespara-depart-dialog/, "Home doesn't hardcode the dialog's own marker -- that's DepartConfirmation's internal concern")
})

// -- 21/22. Responsive: room stays coherent at both resolutions -------------

test("the Sanctuary action row grid has four columns (library/controlRoom/switchPlayer/depart) at both the default and compact breakpoints", () => {
  assert.match(homeCss, /\.actionRow \{\s*display: grid;\s*grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1\.3fr\) minmax\(0, 0\.9fr\) minmax\(110px, 0\.5fr\);/)
  const compact = homeCss.slice(homeCss.indexOf("@media (max-width: 900px)"), homeCss.indexOf("@media (max-width: 680px)"))
  // R8: Depart's compact column dropped its 100px hard floor (minmax(0,
  // 0.6fr), matching every sibling column) after a packaged Windows
  // screenshot showed Depart clipped off the right edge at 1366x768 -- see
  // sanctuaryPackagedLayoutMilestoneR6.test.js for the full investigation.
  assert.match(compact, /\.actionRow \{\s*grid-template-columns: minmax\(0, 1\.8fr\) minmax\(0, 1\.1fr\) minmax\(0, 0\.9fr\) minmax\(0, 0\.6fr\);/)
})

test("the station frame narrows at the Control Room's own compact breakpoint without disappearing", () => {
  const compact = crCss.slice(crCss.indexOf("@media (max-width: 1280px)"))
  assert.match(compact, /\.stationFrame \{\s*inset:\s*10px 24px;/)
})

// -- 23. Room remains visible around the active workstation ------------------

test("the room dims (opacity) rather than disappears while a station is open, and stays non-interactive rather than hidden", () => {
  assert.match(crCss, /\.roomInactive \{\s*pointer-events:\s*none;\s*\}/)
  assert.match(crCss, /\.globalHeader\.roomInactive,\s*\n\.titleRow\.roomInactive \{\s*opacity:\s*0\.5;/)
  assert.doesNotMatch(crCss, /\.roomInactive \{[^}]*display:\s*none/)
  // The station frame is inset from the viewport, not edge-to-edge --
  // that's what leaves the room visible around it.
  assert.match(block(crCss, ".stationFrame"), /inset:\s*clamp\(/)
})

// -- 24. No duplicate global/local Vespara symbol -----------------------------

test("the new Sanctuary destination tile adds no doorway/beacon glyph of its own -- text and a plain marker bar only, matching its siblings", () => {
  const tileBlock = block(homeCss, ".controlRoomDestination")
  assert.doesNotMatch(tileBlock, /background-image|url\(/)
  // Exactly the one pre-existing symbol import (the world seal above
  // worldName) -- no second lockup/glyph asset was added for the tile.
  assert.equal((homeJsx.match(/from ".*vespara-(symbol|lockup)[^"]*"/g) || []).length, 1)
})

// -- 25. THE SANCTUARY absent from the Control Room header (C1 contract held)

test("Control Room's header still shows VESPARA only, never THE SANCTUARY (unchanged since C1)", () => {
  assert.match(crJsx, />VESPARA</)
  assert.doesNotMatch(crJsx, />THE SANCTUARY</)
})

// -- 26. No startup/audio/installer/preload/main-process/dependency/version --

test("this milestone leaves Sanctuary ambience, startup, audio, installer, preload, main-process, dependency, and version files untouched outside the authorized destination-routing edit", () => {
  // Sanctuary itself (VesparaHome.jsx/.module.css) is EXCLUDED here -- it is
  // this milestone's own, explicitly authorized primary deliverable (Parts
  // 1/2). Every other protected category remains fully enforced.
  const { offenders, packageJsonOffenders } = findProtectedScopeOffenders(import.meta.url, {
    scopeDir: "renderer/src/components/ControlRoom/",
    excludeLabels: ["Sanctuary", "main-process"],
    allowPackageJsonVersionBump: true,
  })
  assert.deepEqual(offenders, [], `protected files were modified: ${offenders.join(", ")}`)
  assert.deepEqual(packageJsonOffenders, [], `protected package.json fields were modified: ${packageJsonOffenders.join(", ")}`)
})

test("Sanctuary's own protected behaviors -- ambience hook, Recently Played -- are untouched by the destination-routing edit", () => {
  assert.match(homeJsx, /import \{ useSanctuaryAmbience \} from "\.\/useSanctuaryAmbience\.js"/)
  assert.equal((homeJsx.match(/useSanctuaryAmbience\(\)/g) || []).length, 1)
  assert.match(homeJsx, /displayedRecentGames\.map\(\(g, i\) =>/)
  assert.match(homeJsx, /onClick=\{\(\) => \{ acceptManualFocus\(\); setFocusZone\("recents"\); setRecentIndex\(i\); launch\(g\) \}\}/)
})
