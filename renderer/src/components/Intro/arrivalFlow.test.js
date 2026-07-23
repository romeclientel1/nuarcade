import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relativePath) =>
  readFileSync(join(HERE, relativePath), "utf8").replace(/\r\n/g, "\n")

const jsx = read("Intro.jsx")
const css = read("Intro.module.css")
const app = read("../../App.jsx")

test("App still owns the intro-to-playerSelect handoff", () => {
  assert.match(app, /const \[phase, setPhase\] = useState\("intro"\)/)
  assert.match(app, /const handleIntroComplete = \(\) => setPhase\("playerSelect"\)/)
  assert.match(app, /<Intro onComplete=\{handleIntroComplete\} \/>/)
})

test("arrival remains short, bounded, and guarded against duplicate completion", () => {
  assert.match(jsx, /const ARRIVAL_DURATION = 2500/)
  assert.match(jsx, /const SAFETY_DURATION = 3500/)
  assert.match(jsx, /const completedRef = useRef\(false\)/)
  assert.match(jsx, /if \(completedRef\.current\) return/)
  assert.match(jsx, /completedRef\.current = true/)
  assert.match(jsx, /at\(\(\) => done\(\), ARRIVAL_DURATION\)/)
  assert.match(jsx, /at\(\(\) => done\(\), SAFETY_DURATION\)/)
})

test("keyboard and mouse skipping use the same guarded completion path and clean up listeners", () => {
  assert.match(jsx, /const skip = \(\) => \{[\s\S]*?timersRef\.current\.forEach\(clearTimeout\)[\s\S]*?done\(\)/)
  assert.match(jsx, /window\.addEventListener\('keydown', skip\)/)
  assert.match(jsx, /window\.addEventListener\('click', skip\)/)
  assert.match(jsx, /window\.removeEventListener\('keydown', skip\)/)
  assert.match(jsx, /window\.removeEventListener\('click', skip\)/)
})

test("all supported overlay-gamepad inputs can skip the arrival", () => {
  assert.match(jsx, /useOverlayGamepad\(\{/)
  for (const handler of ["onClose", "onUp", "onDown", "onLeft", "onRight", "onConfirm"]) {
    assert.match(jsx, new RegExp(`${handler}: done`))
  }
  assert.match(jsx, /enabled: true/)
})

test("visible arrival language is localized and the version remains present", () => {
  assert.match(jsx, /t\("home\.worldName"\)/)
  assert.match(jsx, /t\("home\.sanctuary"\)/)
  assert.match(jsx, /t\("playerSelect\.headline"\)/)
  assert.match(jsx, /t\("bootScreen\.hint"\)/)
  assert.match(jsx, /v\{currentVersion\}/)
})

test("obsolete arcade intro identity and procedural sound engine are gone", () => {
  assert.doesNotMatch(jsx, /NuArcade/)
  assert.doesNotMatch(jsx, /Modern arcade\. One cabinet\. Zero compromises\./)
  assert.doesNotMatch(jsx, /AudioContext|createOscillator|playCoin|playLogoSlam|playBassHit|startAmbient/)
  assert.doesNotMatch(jsx, /PARTICLES/)
  assert.doesNotMatch(css, /coinSpin|logoSlam|scanSweep|gridPulse|flicker/)
})

test("arrival styling includes a local reduced-motion treatment", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /\.arrival \{[\s\S]*?opacity: 1;[\s\S]*?transform: none;[\s\S]*?filter: none;/)
  assert.match(css, /\.divider \{[\s\S]*?transform: scaleX\(1\);/)
})
