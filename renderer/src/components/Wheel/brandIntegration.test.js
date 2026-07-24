// brandIntegration.test.js -------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/IntroVideo.jsx and their CSS cannot be imported here (JSX and
// CSS -- see Wheel.test.js's own limitations note). These tests read the
// real committed source text and assert on the specific promises Vespara
// Brand Identity Milestone 2 made for the startup cinematic and the
// Library: the brand mark on IntroVideo never touches the video source,
// timing, or skip behavior; the Library's Collection Hall seal is
// decorative and additive, never replacing "THE LIBRARY"; and the Library
// Console/topMenuActions/controller-focus model are completely untouched.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const introJsx = readFileSync(join(HERE, "IntroVideo.jsx"), "utf8").replace(/\r\n/g, "\n")
const introCss = readFileSync(join(HERE, "IntroVideo.module.css"), "utf8").replace(/\r\n/g, "\n")
const wheelJsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const wheelCss = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")

// -- 9. Startup uses the new production brand assets -------------------------

// Traveler Recognition Milestone 1.2 replaced the small utility-scale
// horizontal lockup used here with a purpose-built cinematic lockup
// (see IntroVideo.test.js and cinematicLockup.test.js for the dedicated
// coverage of that change) -- this test now locks the new asset.
test("IntroVideo renders the cinematic Vespara lockup as a decorative, aria-hidden brand mark", () => {
  assert.match(introJsx, /import vesparaLockupCinematic from "\.\.\/\.\.\/assets\/brand\/vespara-lockup-cinematic\.svg"/)
  assert.match(introJsx, /<img src=\{vesparaLockupCinematic\} alt="" aria-hidden="true" className=\{styles\.brandMark\} \/>/)
})

test("the brand mark is positioned as a quiet corner signature, not a full-screen splash", () => {
  const rule = introCss.match(/\.brandMark\s*\{([^}]*)\}/)
  assert.ok(rule, ".brandMark rule must exist")
  assert.match(rule[1], /position:\s*absolute/)
  assert.match(rule[1], /opacity:\s*0\.\d+/, "must be a restrained, non-opaque overlay")
  assert.match(rule[1], /pointer-events:\s*none/)
  assert.doesNotMatch(rule[1], /inset:\s*0/, "must not cover the full video frame")
})

test("the video element's src/loop-equivalent props, onEnded/onError finish wiring, and skip listeners are completely unchanged", () => {
  assert.match(introJsx, /<video\s*\n\s*ref=\{videoRef\}\s*\n\s*className=\{styles\.video\}\s*\n\s*src=\{videoPath\}\s*\n\s*autoPlay\s*\n\s*playsInline\s*\n\s*onEnded=\{finish\}\s*\n\s*onError=\{finish\}\s*\n\s*\/>/)
  assert.match(introJsx, /window\.addEventListener\("keydown", finish\)/)
  assert.match(introJsx, /window\.addEventListener\("click", finish\)/)
  assert.match(introJsx, /onConfirm: finish,/)
})

test("FADE_DURATION and buildVideoUrl (the cinematic timing/path contract) are untouched", () => {
  assert.match(introJsx, /const FADE_DURATION = 400/)
  assert.match(introJsx, /const buildVideoUrl = \(mediaPath, fileName\) => \{/)
})

// -- 11. Library Console structure and controller behavior remain unchanged --

test("the Collection Hall seal is a new, additive, decorative element -- it does not replace THE LIBRARY place name", () => {
  assert.match(wheelJsx, /import vesparaMicroMark from "\.\.\/\.\.\/assets\/brand\/vespara-symbol-micro\.svg"/)
  assert.match(wheelJsx, /<img src=\{vesparaMicroMark\} alt="" aria-hidden="true" className=\{styles\.placeSeal\} \/>/)
  assert.match(wheelJsx, /<div className=\{styles\.placeName\}>\{t\("wheel\.libraryPlaceName"\)\}<\/div>/)
})

test("the seal sits inside placeIdentity, which is already pointer-events: none and decorative", () => {
  const placeIdentityIdx = wheelJsx.indexOf("<div className={styles.placeIdentity}>")
  const sealIdx = wheelJsx.indexOf("styles.placeSeal")
  const placeNameIdx = wheelJsx.indexOf("styles.placeName")
  assert.ok(placeIdentityIdx > -1 && sealIdx > placeIdentityIdx && placeNameIdx > sealIdx, "seal must render before placeName, inside placeIdentity")
  const rule = wheelCss.match(/\.placeIdentity\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /pointer-events:\s*none/)
})

test("no consoleTrigger icon was added -- the Library Console trigger keeps its existing icon-free bracket framing", () => {
  const triggerBlock = wheelJsx.slice(wheelJsx.indexOf("ref={consoleTriggerRef}"), wheelJsx.indexOf("</button>", wheelJsx.indexOf("ref={consoleTriggerRef}")))
  assert.doesNotMatch(triggerBlock, /vesparaMicroMark|vesparaSeal/)
})

test("Library Console trigger/panel, consoleFocusIdx model, and topMenuActions/TOP_MENU_MAX are completely untouched by brand integration", () => {
  assert.match(wheelJsx, /className=\{styles\.consoleTrigger \+ \(consoleVisible \? " " \+ styles\.consoleTriggerActive : ""\)\}/)
  assert.match(wheelJsx, /const \[consoleFocusIdx, setConsoleFocusIdx\] = useState\(0\)/)
  assert.match(wheelJsx, /const CONSOLE_ACTION_INDICES = \[0, 1, 2, 3, 4, 6, 7, 8, 9, 10\]/)
  assert.match(wheelJsx, /const TOP_MENU_MAX = 10/)
  const idxByAction = { Sort: 0, RND: 1, Sets: 2, Stats: 3, Ach: 4, Home: 5, Player: 6, Media: 7, Settings: 8, Help: 9, Exit: 10 }
  for (const idx of Object.values(idxByAction)) {
    assert.match(wheelJsx, new RegExp("topMenuIdx === " + idx + "\\b"))
  }
})

test("carousel geometry, launch dispatch, category/tab behavior, and search filtering remain untouched", () => {
  assert.match(wheelJsx, /const ARC_RADIUS = 900/)
  assert.match(wheelJsx, /const ANGLE_STEP = 22/)
  assert.match(wheelJsx, /onClick=\{launchGame\} disabled=\{launching\}/)
  assert.match(wheelJsx, /const SLOT_WIDTH = 168/)
  assert.match(wheelJsx, /if \(debouncedSearch\.trim\(\)\) \{/)
})

test("no new external dependency was introduced for brand integration", () => {
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const knownIconLibs = ["react-icons", "@fortawesome/react-fontawesome", "lucide-react"]
  for (const lib of knownIconLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})
