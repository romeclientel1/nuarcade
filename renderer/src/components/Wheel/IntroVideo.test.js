// IntroVideo.test.js ----------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// IntroVideo.jsx cannot be imported here: it's JSX and this project has
// no DOM/React-hook test harness (no jsdom, no @testing-library/react --
// same limitation documented throughout PlayerSelect's own test files).
// These are source-level structural assertions on the real committed
// files proving the specific claims Vespara Traveler Recognition
// Milestone 1.2 (Production Resolution and Cinematic Identity) made for
// the startup cinematic's corner identity: it now uses the new
// purpose-built vespara-lockup-cinematic.svg (not the small utility-scale
// horizontal lockup), the mark is sized/placed for lower-left safe-area
// cinematic legibility, and every existing intro behavior -- playback,
// fade timing, skip paths (keyboard/mouse/controller), and the
// completion handoff into Traveler Recognition -- is completely
// unchanged.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "IntroVideo.jsx"), "utf8")
const css = readFileSync(join(HERE, "IntroVideo.module.css"), "utf8")

// -- 9 & 10. Uses the new cinematic lockup, not the previous utility lockup --

test("imports and renders the new purpose-built cinematic lockup, not the previous utility-scale horizontal lockup", () => {
  assert.match(jsx, /import vesparaLockupCinematic from "\.\.\/\.\.\/assets\/brand\/vespara-lockup-cinematic\.svg"/)
  assert.match(jsx, /<img src=\{vesparaLockupCinematic\} alt="" aria-hidden="true" className=\{styles\.brandMark\} \/>/)
  assert.doesNotMatch(jsx, /vespara-lockup-horizontal/, "the old utility lockup must no longer be imported here")
})

test("the referenced cinematic SVG is a real, existing production file", () => {
  const brandAssetPath = join(HERE, "../../assets/brand/vespara-lockup-cinematic.svg")
  assert.ok(existsSync(brandAssetPath))
})

// -- 14. Lower-left safe-area placement remains present ----------------------

test("the brand mark stays lower-left, sized within the 160-230 CSS px cinematic target, with a safe-area margin matching the skip hint's own inset", () => {
  const rule = css.match(/\.brandMark\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /bottom:\s*24px/)
  assert.match(rule[1], /left:\s*32px/)
  const widthMatch = rule[1].match(/width:\s*(\d+)px/)
  assert.ok(widthMatch)
  const width = Number(widthMatch[1])
  assert.ok(width >= 160 && width <= 230, `expected 160-230 CSS px, got ${width}`)
})

test("the mark is substantially larger/stronger than the previous tiny utility treatment (was 28px tall / ~0.55 opacity)", () => {
  const rule = css.match(/\.brandMark\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.doesNotMatch(rule[1], /height:\s*28px/, "must no longer use the old tiny fixed height")
  const opacityMatch = rule[1].match(/opacity:\s*([\d.]+)/)
  assert.ok(opacityMatch)
  assert.ok(Number(opacityMatch[1]) > 0.55, "must read stronger than the previous 0.55 opacity")
})

test("any localized backing behind the mark is a soft gradient, not a hard-edged glowing box", () => {
  const rule = css.match(/\.brandMarkBacking\s*\{([^}]*)\}/)
  if (!rule) return // a backing element is optional per the milestone brief
  assert.match(rule[1], /gradient/, "must be a soft gradient, not a flat/solid fill")
  assert.doesNotMatch(rule[1], /box-shadow/, "must not add a glow via box-shadow")
  assert.match(rule[1], /pointer-events:\s*none/)
})

test("the mark and its optional backing remain decorative and non-interactive", () => {
  assert.match(jsx, /className=\{styles\.brandMark\} \/>/)
  const rule = css.match(/\.brandMark\s*\{([^}]*)\}/)
  assert.match(rule[1], /pointer-events:\s*none/)
})

// -- 8, 15 & 16. Existing intro playback/fade/skip/input/transition/reduced-motion behavior is unchanged --

test("fade timing and the video/completion contract are unchanged", () => {
  assert.match(jsx, /const FADE_DURATION = 400/)
  assert.match(jsx, /transition: `opacity \$\{FADE_DURATION\}ms ease`/)
  assert.match(jsx, /completionTimerRef\.current = setTimeout\(onComplete, FADE_DURATION\)/)
})

test("video playback attributes and completion triggers are unchanged", () => {
  assert.match(jsx, /autoPlay/)
  assert.match(jsx, /playsInline/)
  assert.match(jsx, /onEnded=\{finish\}/)
  assert.match(jsx, /onError=\{finish\}/)
})

test("keyboard and mouse skip paths are unchanged", () => {
  assert.match(jsx, /window\.addEventListener\("keydown", finish\)/)
  assert.match(jsx, /window\.addEventListener\("click", finish\)/)
  assert.match(jsx, /window\.removeEventListener\("keydown", finish\)/)
  assert.match(jsx, /window\.removeEventListener\("click", finish\)/)
})

test("controller (gamepad) skip paths are unchanged -- every direction and confirm/close still finish()", () => {
  const block = jsx.slice(jsx.indexOf("useOverlayGamepad({"), jsx.indexOf("useEffect(() => {"))
  assert.match(block, /onClose:\s*finish/)
  assert.match(block, /onUp:\s*finish/)
  assert.match(block, /onDown:\s*finish/)
  assert.match(block, /onLeft:\s*finish/)
  assert.match(block, /onRight:\s*finish/)
  assert.match(block, /onConfirm:\s*finish/)
})

test("finish()'s one-shot guard and cleanup (timer clear on unmount) are unchanged", () => {
  assert.match(jsx, /if \(doneRef\.current\) return/)
  assert.match(jsx, /doneRef\.current = true/)
  assert.match(jsx, /clearTimeout\(completionTimerRef\.current\)/)
})

test("reduced-motion behavior is untouched -- no new animation/keyframe was introduced on the overlay or the brand mark", () => {
  assert.doesNotMatch(css, /@keyframes/)
  const overlayRule = css.match(/\.overlay\s*\{([^}]*)\}/)
  assert.doesNotMatch(overlayRule[1], /animation/)
})

test("no third-party dependency was added to renderer/package.json by this milestone's IntroVideo change", () => {
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  assert.deepEqual(Object.keys(rendererPkg.dependencies).sort(), ["@fontsource/orbitron", "howler", "react", "react-dom"].sort())
})
