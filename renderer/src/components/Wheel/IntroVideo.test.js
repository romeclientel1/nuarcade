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
// the startup cinematic's corner identity: it uses the approved doorway
// symbol with live classical-serif VESPARA / THE SANCTUARY text, remains
// in the lower-left safe area, and leaves every existing intro behavior
// unchanged.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "IntroVideo.jsx"), "utf8")
const css = readFileSync(join(HERE, "IntroVideo.module.css"), "utf8")

// -- 9 & 10. Approved symbol plus live world-facing identity ------------

test("renders the approved doorway symbol with live VESPARA and THE SANCTUARY text", () => {
  assert.match(jsx, /import vesparaSymbol from "\.\.\/\.\.\/assets\/brand\/vespara-symbol-simplified\.svg"/)
  assert.match(jsx, /<img src=\{vesparaSymbol\} alt="" className=\{styles\.brandSymbol\} \/>/)
  assert.match(jsx, /<div className=\{styles\.brandName\}>VESPARA<\/div>/)
  assert.match(jsx, /<div className=\{styles\.brandSubtitle\}>THE SANCTUARY<\/div>/)
  assert.doesNotMatch(jsx, /vespara-(?:lockup|wordmark)/, "no old techno or hand-built alphabet asset may be active")
})

// -- 14. Lower-left safe-area placement remains present ----------------------

test("the live lockup stays lower-left at the 260-285px cinematic target with the established safe-area inset", () => {
  const rule = css.match(/\.brandLockup\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /bottom:\s*24px/)
  assert.match(rule[1], /left:\s*32px/)
  const widthMatch = rule[1].match(/width:\s*(\d+)px/)
  assert.ok(widthMatch)
  const width = Number(widthMatch[1])
  assert.ok(width >= 260 && width <= 285, `expected 260-285 CSS px, got ${width}`)
})

test("uses the Traveler Recognition serif stack and production-scale type hierarchy", () => {
  assert.match(css, /font-family:\s*"Times New Roman", Georgia, "Liberation Serif", serif/)
  assert.match(css, /\.brandName\s*\{[^}]*font-size:\s*30px/s)
  assert.match(css, /\.brandSubtitle\s*\{[^}]*font-size:\s*11px/s)
  assert.match(css, /\.brandSymbol\s*\{[^}]*height:\s*52px/s)
})

test("any localized backing behind the mark is a soft gradient, not a hard-edged glowing box", () => {
  const rule = css.match(/\.brandMarkBacking\s*\{([^}]*)\}/)
  if (!rule) return // a backing element is optional per the milestone brief
  assert.match(rule[1], /gradient/, "must be a soft gradient, not a flat/solid fill")
  assert.doesNotMatch(rule[1], /box-shadow/, "must not add a glow via box-shadow")
  assert.match(rule[1], /pointer-events:\s*none/)
})

test("the mark and its optional backing remain decorative and non-interactive", () => {
  assert.match(jsx, /<div className=\{styles\.brandLockup\} aria-hidden="true">/)
  const rule = css.match(/\.brandLockup\s*\{([^}]*)\}/)
  assert.match(rule[1], /pointer-events:\s*none/)
})

test("no remote font, embedded font, base64, or new dependency supports the lockup", () => {
  assert.doesNotMatch(jsx + "\n" + css, /@font-face|data:font|base64|https?:\/\//i)
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
