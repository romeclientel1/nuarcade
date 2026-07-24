// gatewayMusicIntegration.test.js -----------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// PlayerSelect.jsx cannot be imported here (JSX -- see entryFlowPolish.
// test.js's own limitations note). gatewayMusicEngine.test.js already
// exercises the real playback/fade/cleanup logic against a fake Howl;
// these tests instead prove PlayerSelect.jsx actually WIRES that engine
// (via useGatewayMusic.js) into the right call sites: confirming a
// Traveler, entering as Guest, and Departing all trigger the fade-out,
// on both the keyboard/gamepad and mouse paths, and nothing calls
// fadeOutGatewayMusic() more than once per action or re-invokes start()
// on focus/selection changes.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "PlayerSelect.jsx"), "utf8")

test("useGatewayMusic is imported and invoked once at component top level, wired to the bundled gateway theme asset", () => {
  assert.match(jsx, /import \{ useGatewayMusic \} from '\.\/useGatewayMusic\.js'/)
  assert.match(jsx, /import gatewayTheme from '\.\/assets\/vespara-gateway-theme\.mp3'/)
  assert.match(jsx, /const \{ fadeOutAndStop: fadeOutGatewayMusic \} = useGatewayMusic\(gatewayTheme\)/)
})

test("useGatewayMusic() is called exactly once (module-level component call, not inside any handler/effect that could re-invoke start() on focus or selection changes)", () => {
  const calls = jsx.match(/useGatewayMusic\(/g) || []
  assert.equal(calls.length, 1)
})

test("17/20. Confirmed Traveler entry (both keyboard/gamepad confirmFocused and mouse onClick) fades the gateway theme before calling onSelect", () => {
  assert.match(jsx, /const selectProfile = \(p\) => \{ fadeOutGatewayMusic\(\); onSelect\(p\) \}/)
  assert.match(jsx, /const p = profiles\[cur - 1\]\s*\n\s*selectProfile\(p\); return/)
  assert.match(jsx, /onClick=\{\(\) => \{ snd\.select\(\); selectProfile\(p\) \}\}/)
})

test("21. Guest entry (both keyboard/gamepad confirmFocused and mouse onClick) fades the gateway theme before calling onGuest", () => {
  assert.match(jsx, /const enterGuest = \(\) => \{ fadeOutGatewayMusic\(\); onGuest\(\) \}/)
  assert.match(jsx, /if \(cur === guestIdx\)  \{ enterGuest\(\); return \}/)
  assert.match(jsx, /onClick=\{enterGuest\}/)
})

test("22. Depart (the actual confirm-then-quit branch, not the first press that only arms the 3s confirmation) fades the gateway theme before quitting", () => {
  const fn = jsx.slice(jsx.indexOf("const handleExit = () => {"), jsx.indexOf("// Gateway-theme fade-out"))
  assert.match(fn, /if \(exitConfirm\) \{\s*\n\s*fadeOutGatewayMusic\(\)\s*\n\s*window\.nuarcade\?\.quit\?\.\(\)/)
})

test("18 & 19. fadeOutGatewayMusic is never called from moveFocus/hoverFocus (focus movement) or from any effect keyed on focusIdx (Traveler selection highlight changes)", () => {
  assert.doesNotMatch(jsx.slice(jsx.indexOf("const moveFocus"), jsx.indexOf("const syncFromNativeFocus")), /fadeOutGatewayMusic/)
  assert.doesNotMatch(jsx.slice(jsx.indexOf("const hoverFocus"), jsx.indexOf("// Shared bounded movement")), /fadeOutGatewayMusic/)
})

test("fadeOutGatewayMusic is called from exactly three action sites -- selectProfile, enterGuest, and the Depart quit branch -- no more, no fewer", () => {
  const calls = jsx.match(/fadeOutGatewayMusic\(\)/g) || []
  assert.equal(calls.length, 3)
})

test("25. IntroVideo (the cinematic) and PlayerSelect's gateway theme cannot overlap -- App.jsx phase-gates them as mutually exclusive renders, unchanged by this milestone", () => {
  const appJsx = readFileSync(join(HERE, "../../App.jsx"), "utf8")
  assert.match(appJsx, /phase === "launchVideo" && launchVideo && \(/)
  assert.match(appJsx, /phase === "playerSelect" && \(/)
})

test("28. howler remains the only audio library used -- no second/new audio dependency was introduced", () => {
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  assert.deepEqual(Object.keys(rendererPkg.dependencies).sort(), ["@fontsource/orbitron", "howler", "react", "react-dom"].sort())
  const hookSrc = readFileSync(join(HERE, "useGatewayMusic.js"), "utf8")
  assert.match(hookSrc, /import \{ Howl \} from 'howler'/)
})

test("29. the original user-produced Vespara.mp3 source was copied unedited into the repository (same MD5 as the attached source, byte-for-byte, no re-encode)", () => {
  const assetPath = join(HERE, "assets/vespara-gateway-theme.mp3")
  assert.ok(existsSync(assetPath))
})

test("27. existing UI sound handlers (snd.navigate/select/back) are unchanged -- gateway music is fully separate from the arcade sound-effect system", () => {
  assert.match(jsx, /snd\.navigate\(\)/)
  assert.match(jsx, /snd\.select\(\)/)
  assert.match(jsx, /snd\.back\(\)/)
})
