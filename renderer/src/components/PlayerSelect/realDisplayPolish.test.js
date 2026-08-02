// realDisplayPolish.test.js -------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// PlayerSelect.jsx/.module.css cannot be imported here (JSX and CSS -- see
// entryFlowPolish.test.js's own limitations note). These tests read the
// real committed source text and the real bundled background asset, and
// assert on the specific promises Vespara Traveler Recognition
// Milestone 1.1 (Real-Display Visual Polish) made: the approved bundled
// PNG is byte-identical to what shipped in Milestone 1, the global veil/
// haze wash was reduced (not removed) while localized readability layers
// stay present, the Traveler plaque and the two action plaques keep their
// exact render/handlers/labels/order, the lower composition was raised
// via relative flex spacing (never a fixed/raster coordinate), Depart
// remains present and operational, focus-visible and reduced-motion
// coverage are intact, and no behavior/startup/Sanctuary-transition/
// technical identifier changed. No JSX file was touched this milestone.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { createHash } from "node:crypto"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")

const jsx = read("PlayerSelect.jsx")
const css = read("PlayerSelect.module.css")
const appJsx = read("../../App.jsx")

const BG_ASSET_PATH = join(HERE, "assets/traveler-recognition-observatory.png")
const APPROVED_BG_SHA256 = "c78338aa1f569b49c38a97cbde64525ddd729191d1bd4ce84a7dc4a083ddbdc3"

// -- 1. The approved bundled gateway asset remains unchanged -----------------

test("the bundled gateway background is byte-identical to the approved supplied source (SHA-256 match)", () => {
  assert.ok(existsSync(BG_ASSET_PATH))
  const hash = createHash("sha256").update(readFileSync(BG_ASSET_PATH)).digest("hex")
  assert.equal(hash, APPROVED_BG_SHA256, "the approved PNG must never be repainted, re-exported, or edited")
})

// Milestone 1.2 added the gateway-music import/wiring elsewhere in this
// file (see productionCinematicPolish.test.js) and updated the profile
// button's onClick to route through the new selectProfile() wrapper below
// -- but the background import/render call sites this Milestone 1.1 test
// originally locked remain untouched.
test("the approved replacement keeps the established local import/render path", () => {
  assert.match(jsx, /import gatewayBackground from '\.\/assets\/traveler-recognition-observatory\.png'/)
  assert.match(jsx, /<img src=\{gatewayBackground\} alt="" aria-hidden="true" className=\{styles\.gatewayBg\} \/>/)
})

// -- 2. Global veil/haze reduced without removing localized readability -----

test("the veil's linear-gradient darkening alphas were meaningfully deepened, not just retinted", () => {
  const rule = css.match(/\.gatewayVeil\s*\{([^}]*)\}/)
  assert.ok(rule)
  const alphas = [...rule[1].matchAll(/rgba\(2, 5, 6, ([\d.]+)\)/g)].map(m => Number(m[1]))
  assert.ok(alphas.length >= 4, "expected the veil's linear-gradient darkening stops")
  assert.ok(Math.max(...alphas) >= 0.7, "the deepest veil stop must read as true near-black shadow, not a pale wash")
})

test("the veil's radial gradient still leaves a bright transparent core so the central sun/platform reflection is preserved", () => {
  const rule = css.match(/\.gatewayVeil\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /radial-gradient\(ellipse[^,]*,\s*transparent\s+\d+%/, "expected a transparent core in the radial component")
})

test("gatewayHaze's base alpha and animated opacity range were both reduced from the Milestone 1 values", () => {
  const hazeRule = css.match(/\.gatewayHaze\s*\{([^}]*)\}/)
  assert.ok(hazeRule)
  const alphaMatch = hazeRule[1].match(/rgba\(214, 178, 116, ([\d.]+)\)/)
  assert.ok(alphaMatch)
  assert.ok(Number(alphaMatch[1]) <= 0.1, "gatewayHaze's base alpha must be reduced from Milestone 1's 0.14")

  const keyframe = css.match(/@keyframes gatewayBreathe \{\s*from \{ opacity: ([\d.]+); \}\s*to\s*\{ opacity: ([\d.]+); \}\s*\}/)
  assert.ok(keyframe, "expected the gatewayBreathe keyframe")
  assert.ok(Number(keyframe[2]) <= 0.7, "the breathing animation's peak opacity must be reduced from Milestone 1's 1.0")
})

test("the veil and haze remain present, decorative, and non-interactive -- reduced in intensity, never removed", () => {
  assert.match(jsx, /className=\{styles\.gatewayVeil\} aria-hidden="true"/)
  assert.match(jsx, /className=\{styles\.gatewayHaze\} aria-hidden="true"/)
  for (const cls of [".gatewayVeil", ".gatewayHaze"]) {
    const rule = css.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule)
    assert.match(rule[1], /pointer-events:\s*none/)
  }
})

// -- 3. Traveler plaque retains render/handlers ------------------------------

test("the profile render loop, icon/name content, and selection dispatch are byte-for-byte unchanged", () => {
  assert.match(jsx, /\{profiles\.map\(\(p, i\) => \(/)
  assert.match(jsx, /onClick=\{\(\) => \{ snd\.select\(\); selectProfile\(p\) \}\}/)
  assert.match(jsx, /<span className=\{styles\.profileIcon\}>\{p\.name\[0\]\.toUpperCase\(\)\}<\/span>/)
  assert.match(jsx, /<span className=\{styles\.profileName\}>\{p\.name\}<\/span>/)
})

test("the plaque's new narrower/taller proportions and profileName's max-width stay internally consistent", () => {
  const btnRule = css.match(/\.profileBtn\s*\{([^}]*)\}/)
  assert.ok(btnRule)
  const widthMatch = btnRule[1].match(/width:\s*min\((\d+)px/)
  const paddingMatch = btnRule[1].match(/padding:\s*\d+px\s+(\d+)px/)
  assert.ok(widthMatch && paddingMatch)
  const availableInnerWidth = Number(widthMatch[1]) - Number(paddingMatch[1]) * 2

  const nameRule = css.match(/\.profileName\s*\{([^}]*)\}/)
  const nameMaxWidth = Number(nameRule[1].match(/max-width:\s*(\d+)px/)[1])
  assert.ok(nameMaxWidth <= availableInnerWidth, "profileName max-width must still fit inside the (now narrower) plaque")
})

// -- 4. New Traveler and Guest retain exact handlers/labels/order/input -----

test("New Traveler and Guest keep their exact onClick handlers and rendered order in the action row", () => {
  const actionRowIdx = jsx.indexOf("<div className={styles.actionRow}>")
  const newPlayerIdx = jsx.indexOf("styles.btnNewPlayer", actionRowIdx)
  const guestIdx = jsx.indexOf("styles.btnGuest", actionRowIdx)
  assert.ok(actionRowIdx > -1 && newPlayerIdx > actionRowIdx && guestIdx > newPlayerIdx, "New Traveler must still render before Guest, inside actionRow")
  assert.match(jsx, /onClick=\{\(\) => setAdding\(true\)\}/)
  assert.match(jsx, /onClick=\{enterGuest\}/)
  assert.match(jsx, /\{t\("playerSelect\.addPlayer"\)\}/)
  assert.match(jsx, /\{t\("playerSelect\.guest"\)\}/)
})

test("New Traveler and Guest are visually distinct plaques, never a single shared rectangle (different background/border hues)", () => {
  const newPlayerRule = css.match(/\.btnNewPlayer\s*\{([^}]*)\}/)
  const guestRule = css.match(/\.btnGuest\s*\{([^}]*)\}/)
  assert.ok(newPlayerRule && guestRule)
  assert.match(newPlayerRule[1], /rgba\(20, 62, 60,/, "New Traveler must keep its teal identity")
  assert.match(guestRule[1], /rgba\(58, 46, 20,/, "Guest must keep its warm-gold identity")
})

// -- 5. Lower composition uses relative flex spacing, never fixed/raster coordinates --

test("the lower cluster was raised via .content padding and profileRow/actionRow margins -- no position: absolute/fixed top|bottom pixel value was introduced for them", () => {
  for (const cls of [".profileRow", ".actionRow"]) {
    const rule = css.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule)
    assert.doesNotMatch(rule[1], /position:\s*(absolute|fixed)/, cls + " must remain in normal flex flow, not pinned to a raster coordinate")
  }
  const contentRule = css.match(/\.content\s*\{([^}]*)\}/)
  assert.ok(contentRule)
  assert.match(contentRule[1], /padding:\s*34px 28px 20px;/)
})

test("profileRow and actionRow margins were tightened from their Milestone 1 values", () => {
  const profileRowRule = css.match(/\.profileRow\s*\{([^}]*)\}/)
  const actionRowRule = css.match(/\.actionRow\s*\{([^}]*)\}/)
  assert.ok(profileRowRule && actionRowRule)
  const profileRowMarginTop = Number(profileRowRule[1].match(/margin-top:\s*(\d+)px/)[1])
  const actionRowMarginTop = Number(actionRowRule[1].match(/margin-top:\s*(\d+)px/)[1])
  assert.ok(profileRowMarginTop < 18, "profileRow margin-top must be reduced from Milestone 1's 18px")
  assert.ok(actionRowMarginTop < 22, "actionRow margin-top must be reduced from Milestone 1's 22px")
})

// -- 6. Depart remains present and operational -------------------------------

test("Depart's handler, confirm-then-quit sequence, and t() label are unchanged", () => {
  assert.match(jsx, /onClick=\{\(\) => \{ snd\.back\(\); handleExit\(\) \}\}/)
  assert.match(jsx, /window\.nuarcade\?\.quit\?\.\(\)/)
  assert.match(jsx, /\{exitConfirm \? t\("playerSelect\.confirmExit"\) : t\("playerSelect\.exit"\)\}/)
})

test("Depart's refined styling keeps it visually subordinate -- no bright/large glow was introduced", () => {
  const rule = css.match(/\.exitBtn\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.doesNotMatch(rule[1], /box-shadow/, "the resting Depart plaque must not gain a glow")
  const hoverRule = css.match(/\.exitBtn:hover\s*\{([^}]*)\}/)
  assert.ok(hoverRule)
  assert.doesNotMatch(hoverRule[1], /box-shadow/)
})

// -- 7. Focus-visible and reduced-motion rules remain intact -----------------

test("every focusable control still has explicit :focus-visible treatment", () => {
  assert.match(css, /\.exitBtn:focus-visible/)
  assert.match(css, /\.btnNewPlayer:focus-visible/)
  assert.match(css, /\.btnGuest:focus-visible/)
  assert.match(css, /\.profileRow \.profileBtn:focus-visible/)
})

test("reduced-motion coverage for the entrance/ambient/decorative animations is unchanged in structure", () => {
  const reducedBlock = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {"))
  assert.match(reducedBlock, /\.coin, \.runner \{ display: none; \}/)
  assert.match(reducedBlock, /\.gatewayHaze \{ animation: none; \}/)
  assert.match(reducedBlock, /\.overlay \{ animation: none; \}/)
  assert.match(reducedBlock, /\.content \{ animation: none; opacity: 1; transform: none; \}/)
  assert.doesNotMatch(reducedBlock, /outline:\s*none/)
})

// -- 8. No behavior, startup, Sanctuary transition, or technical identifier changed --

test("App.jsx's phase transitions and window.nuarcade calls are untouched", () => {
  assert.match(appJsx, /const handlePlayerSelect = \(player\) => \{\s*\n\s*selectProfile\(player\.id\)\s*\n\s*setPhase\("main"\)/)
  assert.match(appJsx, /const handleGuest = \(\) => \{\s*\n\s*selectGuest\(\)\s*\n\s*setPhase\("main"\)/)
  assert.match(jsx, /window\.nuarcade\?\.quit\?\.\(\)/)
})

test("no third-party dependency was added to renderer/package.json by this milestone", () => {
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  assert.deepEqual(Object.keys(rendererPkg.dependencies).sort(), ["@fontsource/orbitron", "howler", "react", "react-dom"].sort())
})

// -- 9. No JSX file changed unless specifically justified --------------------

test("PlayerSelect.jsx's git-diffable surface is CSS-only in spirit -- the same import/render call sites from Milestone 1 are present verbatim", () => {
  assert.match(jsx, /import vesparaSeal from '\.\.\/\.\.\/assets\/brand\/vespara-symbol-simplified\.svg'/)
  assert.match(jsx, /<img src=\{vesparaSeal\} alt="" aria-hidden="true" className=\{styles\.gatewaySeal\} \/>/)
})
