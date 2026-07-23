// entryFlowPolish.test.js ------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// PlayerSelect.jsx cannot be imported here: it's JSX and this project has
// no DOM/React-hook test harness (no jsdom, no @testing-library/react --
// same limitation documented in Wheel.test.js/VesparaHome.test.js). These
// are source-level structural assertions on the real committed files
// proving the specific claims the Player Select and Entry-Flow Polish
// milestone made: UI-sound config is wired through (not hardcoded), mouse
// hover never plays a navigation cue, keyboard parity exists and is
// bounded the same way the controller already is, the add-player input is
// fully insulated from the screen-level keyboard handler, EXIT/CONFIRM
// EXIT are localized, native focus and focusIdx are reconciled, reduced
// motion is handled locally, and useNavSound.js (still deferred cleanup,
// not part of this milestone) is untouched.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))

// Normalized to LF: on the windows-latest CI runner, git checks these
// files out as CRLF, which would silently break any indexOf/slice anchor
// further down that (incorrectly) embedded a literal "\n".
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")

const jsx = read("PlayerSelect.jsx")
const css = read("PlayerSelect.module.css")
const appJsx = read("../../App.jsx")
const en = read("../../i18n/en.js")
const es = read("../../i18n/es.js")
const navSoundSrc = read("../../hooks/useNavSound.js")
const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))

// Extracts the substring between two anchors, throwing a descriptive error
// instead of silently returning "" when an anchor is missing -- a missing
// anchor is a broken test, not an empty (and therefore vacuously-passing)
// block. Mirrors the helper introduced for the same class of bug in
// App.test.js / VesparaHome/soundPolish.test.js.
function sliceBetween(src, startAnchor, endAnchor, label) {
  const start = src.indexOf(startAnchor)
  if (start === -1) throw new Error(`sliceBetween(${label}): start anchor not found: ${JSON.stringify(startAnchor)}`)
  const end = src.indexOf(endAnchor, start)
  if (end === -1) throw new Error(`sliceBetween(${label}): end anchor not found: ${JSON.stringify(endAnchor)}`)
  return src.slice(start, end)
}

// -- sound: config wired through, not hardcoded ---------------------------

test("App passes uiSoundsEnabled and uiSoundVolume into PlayerSelect (read-only, no setters -- PlayerSelect never renders Settings)", () => {
  const block = sliceBetween(appJsx, "<PlayerSelect", "/>", "<PlayerSelect ... /> render block")
  assert.match(block, /uiSoundsEnabled=\{uiSoundsEnabled\}/)
  assert.match(block, /uiSoundVolume=\{uiSoundVolume\}/)
  assert.doesNotMatch(block, /onUiSoundsChange|onUiSoundVolumeChange/)
})

test("PlayerSelect passes the raw uiSoundsEnabled/uiSoundVolume props straight through to useArcadeSounds -- no local pre-conversion", () => {
  assert.match(jsx, /useArcadeSounds\(\{ enabled: uiSoundsEnabled, volume: uiSoundVolume \}\)/)
  assert.doesNotMatch(jsx, /uiSoundVolumeToGainScale|normalizeUiSoundsEnabled/, "PlayerSelect must not duplicate the conversion useArcadeSounds already performs")
})

// -- mouse: hover never plays a navigation cue -----------------------------

test("hoverFocus (the shared mouse-enter handler) never calls snd.navigate()", () => {
  const fn = sliceBetween(jsx, "const hoverFocus = (idx) => {", "// Shared bounded movement", "hoverFocus body")
  assert.doesNotMatch(fn, /snd\.navigate\(\)/)
})

test("no onMouseEnter handler anywhere in PlayerSelect.jsx calls snd.navigate() directly", () => {
  const hoverHandlers = jsx.match(/onMouseEnter=\{[^}]*\}/g) || []
  assert.ok(hoverHandlers.length >= 4, "expected at least 4 onMouseEnter handlers (EXIT, profile cards, New Player, Guest)")
  for (const handler of hoverHandlers) {
    assert.doesNotMatch(handler, /snd\.navigate/)
  }
})

test("mouse interaction itself is preserved -- every focusable slot still has an onMouseEnter and an onClick", () => {
  const mouseEnterCount = (jsx.match(/onMouseEnter=\{/g) || []).length
  const onClickCount = (jsx.match(/onClick=\{/g) || []).length
  assert.ok(mouseEnterCount >= 4)
  assert.ok(onClickCount >= 4)
})

// -- keyboard: parity exists, bounded the same way the controller is ------

test("a screen-level keydown listener exists (window.addEventListener), matching the controller's own movement/confirm rules", () => {
  assert.match(jsx, /window\.addEventListener\("keydown", handler\)/)
  assert.match(jsx, /window\.removeEventListener\("keydown", handler\)/)
})

test("a single shared moveFocus(direction) helper owns the EXIT_IDX/maxIdx clamping -- keyboard and controller cannot drift into separate bounds", () => {
  const helper = sliceBetween(jsx, "const moveFocus = (direction) => {", "const syncFromNativeFocus", "moveFocus body")
  assert.match(helper, /Math\.max\(EXIT_IDX, i - 1\)/)
  assert.match(helper, /Math\.min\(maxIdx, i \+ 1\)/)
  assert.match(helper, /direction < 0 \? Math\.max\(EXIT_IDX, i - 1\) : Math\.min\(maxIdx, i \+ 1\)/)
})

test("moveFocus() gates snd.navigate() on the clamped result actually differing from the current index -- boundary input stays silent", () => {
  const helper = sliceBetween(jsx, "const moveFocus = (direction) => {", "const syncFromNativeFocus", "moveFocus body")
  assert.match(helper, /if \(next !== i\) snd\.navigate\(\)/)
  // The gate must run BEFORE the (possibly-unchanged) index is returned --
  // proves the sound decision is based on the comparison, not just always
  // firing ahead of the clamp.
  const gateIdx = helper.indexOf("if (next !== i) snd.navigate()")
  const returnIdx = helper.indexOf("return next")
  assert.ok(gateIdx !== -1 && returnIdx !== -1 && gateIdx < returnIdx)
})

test("moveFocus() returns the resulting index through the functional setFocusIdx form -- never a stale outer-scope value", () => {
  const helper = sliceBetween(jsx, "const moveFocus = (direction) => {", "const syncFromNativeFocus", "moveFocus body")
  assert.match(helper, /setFocusIdx\(i => \{/)
})

test("moveFocus() is a no-op while the add-player form is open, matching the pre-existing !adding guard", () => {
  const helper = sliceBetween(jsx, "const moveFocus = (direction) => {", "const syncFromNativeFocus", "moveFocus body")
  assert.match(helper, /if \(adding\) return/)
})

test("both the controller (onUp/onDown/onLeft/onRight) and the keyboard handler (ArrowLeft/Up, ArrowRight/Down) route through moveFocus() -- not a separate navigation model", () => {
  const gamepadBlock = sliceBetween(jsx, "useOverlayGamepad({", "})", "gamepad block")
  assert.match(gamepadBlock, /onUp:\s*\(\) => moveFocus\(-1\)/)
  assert.match(gamepadBlock, /onDown:\s*\(\) => moveFocus\(1\)/)
  assert.match(gamepadBlock, /onLeft:\s*\(\) => moveFocus\(-1\)/)
  assert.match(gamepadBlock, /onRight:\s*\(\) => moveFocus\(1\)/)

  const handler = sliceBetween(jsx, "const handler = (e) => {", "window.addEventListener(\"keydown\", handler)", "keydown handler body")
  assert.match(handler, /if \(e\.key === "ArrowLeft" \|\| e\.key === "ArrowUp"\) \{\s*moveFocus\(-1\)/)
  assert.match(handler, /else if \(e\.key === "ArrowRight" \|\| e\.key === "ArrowDown"\) \{\s*moveFocus\(1\)/)

  // Neither call site re-clamps or re-decides the sound itself -- the
  // literal Math.max/Math.min clamp text appears exactly once in the
  // whole file (inside moveFocus), not duplicated at each call site.
  const maxOccurrences = (jsx.match(/Math\.max\(EXIT_IDX, i - 1\)/g) || []).length
  const minOccurrences = (jsx.match(/Math\.min\(maxIdx, i \+ 1\)/g) || []).length
  assert.equal(maxOccurrences, 1, "Math.max(EXIT_IDX, ...) clamp must exist in exactly one place (moveFocus)")
  assert.equal(minOccurrences, 1, "Math.min(maxIdx, ...) clamp must exist in exactly one place (moveFocus)")
})

// -- keyboard: Enter confirms, without duplicating native button activation

test("Enter is wired to confirmFocused() at the screen level", () => {
  const handler = sliceBetween(jsx, "const handler = (e) => {", "window.addEventListener(\"keydown\", handler)", "keydown handler body")
  assert.match(handler, /\} else if \(e\.key === "Enter"\) \{\s*confirmFocused\(\)/)
})

test("Enter is not double-processed when a real <button> already has native focus -- the handler defers to native activation instead of also calling confirmFocused()", () => {
  const handler = sliceBetween(jsx, "const handler = (e) => {", "window.addEventListener(\"keydown\", handler)", "keydown handler body")
  assert.match(handler, /if \(tag === "BUTTON" && e\.key === "Enter"\) return/)
})

// -- keyboard: add-player input is fully insulated -------------------------

test("the screen-level handler returns before any navigation/confirm/escape branch when the event target is the text input", () => {
  const handler = sliceBetween(jsx, "const handler = (e) => {", "window.addEventListener(\"keydown\", handler)", "keydown handler body")
  const guardIdx = handler.indexOf('if (tag === "INPUT" || tag === "TEXTAREA") return')
  const firstBranchIdx = handler.indexOf("ArrowLeft")
  assert.ok(guardIdx !== -1, "expected an INPUT/TEXTAREA guard")
  assert.ok(guardIdx < firstBranchIdx, "the INPUT/TEXTAREA guard must come before any navigation branch")
})

test("the add-player input keeps its own independent Enter-submits/Escape-cancels handler, untouched by this milestone", () => {
  assert.match(jsx, /onKeyDown=\{e => \{\s*if \(e\.key === 'Enter' && name\.trim\(\)\) \{ snd\.select\(\); onAdd\(name\.trim\(\)\); setAdding\(false\); setName\(''\) \}\s*if \(e\.key === 'Escape'\) \{ setAdding\(false\); setName\(''\) \}/)
})

// -- keyboard: Escape is scoped correctly -----------------------------------

test("the screen-level Escape branch only cancels the add-player state -- it does not invent a back destination on the main screen", () => {
  const handler = sliceBetween(jsx, "const handler = (e) => {", "window.addEventListener(\"keydown\", handler)", "keydown handler body")
  assert.match(handler, /else if \(e\.key === "Escape"\) \{[\s\S]*?if \(adding\) \{ setAdding\(false\); setName\(''\) \}/)
})

// -- focus: native DOM focus and focusIdx are reconciled --------------------

test("a bounded slot-ref map exists and every focusable slot registers into it (no generic focus-management framework)", () => {
  assert.match(jsx, /const slotRefs = useRef\(\{\}\)/)
  const registerCalls = jsx.match(/ref=\{registerSlot\(/g) || []
  assert.ok(registerCalls.length >= 4, "expected EXIT, each profile card, New Player, and Guest to all register a slot ref")
})

test("controller/keyboard-driven focus changes move real native focus (preventScroll, so it cannot cause an unwanted page scroll)", () => {
  const effect = sliceBetween(jsx, "useEffect(() => {\n    if (adding) return", "[focusIdx, adding])", "native-focus-sync effect")
  assert.match(effect, /slotRefs\.current\[focusIdx\]\?\.focus\?\.\(\{ preventScroll: true \}\)/)
})

test("mouse-hover-driven focus changes are suppressed from stealing real native focus (one-shot ref flag)", () => {
  assert.match(jsx, /const suppressNativeFocusRef = useRef\(false\)/)
  const hoverFn = sliceBetween(jsx, "const hoverFocus = (idx) => {", "// Shared bounded movement", "hoverFocus body")
  assert.match(hoverFn, /suppressNativeFocusRef\.current = true/)
  const effect = sliceBetween(jsx, "useEffect(() => {\n    if (adding) return", "[focusIdx, adding])", "native-focus-sync effect")
  assert.match(effect, /if \(suppressNativeFocusRef\.current\) \{ suppressNativeFocusRef\.current = false; return \}/)
})

test("native Tab focus lands back on focusIdx via onFocus sync on every registered slot", () => {
  const syncCalls = jsx.match(/onFocus=\{syncFromNativeFocus\(/g) || []
  assert.ok(syncCalls.length >= 4)
})

test("explicit :focus-visible treatment exists in the stylesheet for every focusable control", () => {
  assert.match(css, /\.exitBtn:focus-visible/)
  assert.match(css, /\.btnNewPlayer:focus-visible/)
  assert.match(css, /\.btnGuest:focus-visible/)
  assert.match(css, /\.profileBtn:focus-visible/)
})

test("profile-card focus/active state outranks hover by genuine selector specificity, not source order alone", () => {
  // .profileBtn:hover has two specificity components (one class, one
  // pseudo-class). The focus/active rule is scoped through the real
  // .profileRow ancestor, adding a third class-level component -- so it
  // wins the cascade by specificity regardless of where either rule is
  // declared in the file, not merely because it happens to be declared
  // later.
  assert.match(css, /\.profileRow \.profileBtn\.profileBtnActive,\s*\n\.profileRow \.profileBtn:focus-visible \{/)
  const hoverRule = sliceBetween(css, ".profileBtn:hover {", "}", ".profileBtn:hover rule")
  assert.doesNotMatch(hoverRule, /\.profileRow/, "the hover rule must NOT also be scoped through .profileRow -- otherwise the specificity gap disappears")
})

test("outlines are not globally suppressed -- no blanket *:focus/outline:none reset was introduced", () => {
  assert.doesNotMatch(css, /\*\s*\{[^}]*outline\s*:\s*none/)
  assert.doesNotMatch(css, /^\s*\*\s*:focus\s*\{/m)
})

test("mouse hover styling stays visually weaker than the focused/focus-visible treatment -- no outline or scale on :hover rules", () => {
  const hoverRules = css.match(/\.\w+:hover\s*\{[^}]*\}/g) || []
  assert.ok(hoverRules.length > 0)
  for (const rule of hoverRules) {
    assert.doesNotMatch(rule, /outline\s*:/)
  }
})

// -- localization: EXIT/CONFIRM EXIT use keys, not raw literals ------------

test("EXIT and CONFIRM EXIT are rendered via t(...) with semantic playerSelect keys, not raw English literals", () => {
  assert.match(jsx, /t\("playerSelect\.confirmExit"\) : t\("playerSelect\.exit"\)/)
  assert.doesNotMatch(jsx, />\s*EXIT\s*</)
  assert.doesNotMatch(jsx, /'CONFIRM EXIT'/)
  assert.doesNotMatch(jsx, /'EXIT'/)
})

test("playerSelect.exit and playerSelect.confirmExit exist and are distinct, non-empty strings in both English and Spanish", () => {
  assert.match(en, /"playerSelect\.exit": "DEPART"/)
  assert.match(en, /"playerSelect\.confirmExit": "CONFIRM DEPARTURE"/)
  assert.match(es, /"playerSelect\.exit": "PARTIR"/)
  assert.match(es, /"playerSelect\.confirmExit": "CONFIRMAR PARTIDA"/)
})

test("neither key was cached at module scope -- both call sites use t(...) inline, not a translated constant captured once", () => {
  assert.doesNotMatch(jsx, /const\s+\w+\s*=\s*t\("playerSelect\.exit"\)/)
  assert.doesNotMatch(jsx, /const\s+\w+\s*=\s*t\("playerSelect\.confirmExit"\)/)
})

// -- visual polish: profile-card overflow safety ----------------------------

test("profile names have a safe overflow treatment (ellipsis truncation) even though creation is capped at 12 characters", () => {
  const rule = sliceBetween(css, ".profileName {", "}", ".profileName rule")
  assert.match(rule, /overflow\s*:\s*hidden/)
  assert.match(rule, /text-overflow\s*:\s*ellipsis/)
  assert.match(rule, /white-space\s*:\s*nowrap/)
})

test("profileName's max-width fits inside .profileBtn's actual available inner width", () => {
  const btnRule = sliceBetween(css, ".profileBtn {", "}", ".profileBtn rule")
  const btnWidthMatch = btnRule.match(/width:\s*min\((\d+)px,\s*\d+vw\)/)
  const paddingMatch = btnRule.match(/padding:\s*\d+px\s+(\d+)px/)
  assert.ok(btnWidthMatch, "expected .profileBtn to declare a bounded width")
  assert.ok(paddingMatch, "expected .profileBtn to declare shorthand padding (vertical horizontal)")
  const btnWidth = Number(btnWidthMatch[1])
  const horizontalPadding = Number(paddingMatch[1])
  const availableInnerWidth = btnWidth - horizontalPadding * 2

  const nameRule = sliceBetween(css, ".profileName {", "}", ".profileName rule")
  const nameMaxWidthMatch = nameRule.match(/max-width:\s*(\d+)px/)
  assert.ok(nameMaxWidthMatch, "expected .profileName to declare a max-width")
  const nameMaxWidth = Number(nameMaxWidthMatch[1])

  assert.equal(availableInnerWidth, 200, "sanity check: .profileBtn is 260px wide with 30px horizontal padding")
  assert.ok(nameMaxWidth <= availableInnerWidth, `.profileName max-width (${nameMaxWidth}px) must not exceed .profileBtn's available inner width (${availableInnerWidth}px)`)
  assert.equal(nameMaxWidth, 196)
})

test("zero-profile and one-profile information architecture is untouched -- profile row still conditionally renders only when profiles exist, action row unchanged", () => {
  assert.match(jsx, /\{profiles\.length > 0 && \(/)
})

// -- reduced motion: scoped locally, does not touch Home/Wheel -------------

test("prefers-reduced-motion handling exists in PlayerSelect.module.css and neutralizes the decorative coin/runner/shimmer/pulse animations", () => {
  const block = sliceBetween(css, "@media (prefers-reduced-motion: reduce) {", "\n}", "reduced-motion block")
  assert.match(block, /\.coin, \.runner \{ display: none; \}/)
  assert.match(block, /\.brand \{ animation: none/)
  assert.match(block, /\.headline \{\s*animation: none;/)
})

test("reduced motion still leaves the focus/hover state changes visible -- only transform/transition are neutralized, not outline or color", () => {
  const block = sliceBetween(css, "@media (prefers-reduced-motion: reduce) {", "\n}", "reduced-motion block")
  const focusRule = sliceBetween(block, ".focused,", "transform: none !important;", "reduced-motion focus rule")
  assert.doesNotMatch(focusRule, /outline\s*:\s*none/)
})

// -- explicitly untouched: useNavSound.js -----------------------------------

test("useNavSound.js (deferred cleanup, out of scope for this milestone) is left untouched", () => {
  assert.match(navSoundSrc, /export function useNavSound\(volume = 0\.3\)/)
  assert.match(navSoundSrc, /playClick/)
  assert.match(navSoundSrc, /playSelect/)
})

test("no third-party dependency was added to renderer/package.json by this milestone", () => {
  assert.deepEqual(Object.keys(rendererPkg.dependencies).sort(), ["@fontsource/orbitron", "howler", "react", "react-dom"].sort())
})

// -- extraction-helper safety net -------------------------------------------

test("sliceBetween fails loudly (not with a silent empty string) when an anchor is missing", () => {
  assert.throws(
    () => sliceBetween(jsx, "TOTALLY_MISSING_START", "const hoverFocus", "bogus start anchor"),
    /start anchor not found/
  )
  assert.throws(
    () => sliceBetween(jsx, "const hoverFocus = (idx) => {", "TOTALLY_MISSING_END", "bogus end anchor"),
    /end anchor not found/
  )
})
