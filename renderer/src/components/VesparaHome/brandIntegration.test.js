// brandIntegration.test.js -------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// VesparaHome.jsx/.module.css cannot be imported here (JSX and CSS -- see
// VesparaHome.test.js's own limitations note). These tests read the real
// committed source text and assert on the specific promise Vespara Brand
// Identity Milestone 2 made for the Sanctuary: a small architectural seal
// is placed above the world name, decorative and inert, without touching
// ACTIONS, runAction, Recently Played, focus zones, or restoration.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "VesparaHome.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "VesparaHome.module.css"), "utf8").replace(/\r\n/g, "\n")

test("the Sanctuary renders the Vespara symbol as a decorative threshold seal above the world name", () => {
  assert.match(jsx, /import vesparaSealAsset from "\.\.\/\.\.\/assets\/brand\/vespara-symbol-simplified\.svg"/)
  assert.match(jsx, /<img src=\{vesparaSealAsset\} alt="" aria-hidden="true" className=\{styles\.worldSeal\} \/>/)
})

test("the seal renders before worldName, inside worldIdentity -- additive, not a replacement for the existing VESPARA title text", () => {
  const worldIdentityIdx = jsx.indexOf("<div className={styles.worldIdentity}>")
  const sealIdx = jsx.indexOf("styles.worldSeal")
  const worldNameIdx = jsx.indexOf('{t("home.worldName")}')
  assert.ok(worldIdentityIdx > -1 && sealIdx > worldIdentityIdx && worldNameIdx > sealIdx)
})

test("the seal is decorative only: aria-hidden in JSX, pointer-events: none in CSS, no motion of its own", () => {
  const rule = css.match(/\.worldSeal\s*\{([^}]*)\}/)
  assert.ok(rule, ".worldSeal rule must exist")
  assert.match(rule[1], /pointer-events:\s*none/)
  assert.doesNotMatch(rule[1], /animation/)
  assert.doesNotMatch(rule[1], /transition/)
})

test("ACTIONS array, runAction dispatch, and focus state identifiers are unchanged by the brand pass (ACTIONS itself was later, separately extended by Control Room Milestone C2)", () => {
  assert.match(jsx, /const ACTIONS = \["library", "controlRoom", "switchPlayer", "depart"\]/)
  assert.match(jsx, /if \(action === "library"\) onEnterLibrary\?\.\(\)/)
  assert.match(jsx, /const \[focusZone, setFocusZone\] = useState/)
  assert.match(jsx, /const \[recentIndex, setRecentIndex\] = useState/)
  assert.match(jsx, /const \[actionIndex, setActionIndex\] = useState/)
})

test("Recently Played rendering and direct-launch wiring are unchanged", () => {
  assert.match(jsx, /displayedRecentGames\.map\(\(g, i\) =>/)
  assert.match(jsx, /onClick=\{\(\) => \{ acceptManualFocus\(\); setFocusZone\("recents"\); setRecentIndex\(i\); launch\(g\) \}\}/)
})

test("restoration consumption (shouldConsumeRestoration/consumeRestorationRequest/resolveHomeFocus) is unchanged", () => {
  assert.match(jsx, /shouldConsumeRestoration\(restorationRequest,\s*\{\s*catalogReady:\s*!loading\s*\}\)/)
  assert.match(jsx, /consumeRestorationRequest\(restorationRequest\)/)
  assert.match(jsx, /resolveHomeFocus\(restorationRequest,\s*\{\s*recentGames:\s*displayedRecentGames\s*\}\)/)
})

test("no new external dependency was introduced for the Sanctuary brand pass", () => {
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const knownIconLibs = ["react-icons", "@fortawesome/react-fontawesome", "lucide-react"]
  for (const lib of knownIconLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})
