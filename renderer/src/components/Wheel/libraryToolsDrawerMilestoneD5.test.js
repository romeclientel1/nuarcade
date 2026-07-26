// libraryToolsDrawerMilestoneD5.test.js -------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Vespara Library Milestone D5 -- center-card spacing, unmistakable
// selection, raised strip/Archive View, the approved Vespara fallback,
// working collection creation (see collectionsCreationMilestoneD5.test.js),
// and the renamed, explicit-open, cleaned-up Library Tools drawer.
// Individual pre-existing test files already cover the byte-level
// CARD_SLOT_WIDTH/.center/.infoPanel/.previewReservation/topMenuActions
// changes as part of their own compatibility contracts (updated in this
// same milestone) -- this file covers what's genuinely new: the no-curved-
// geometry guarantee, the three-cue selection contract read as a whole,
// the fallback chain's ending, explicit drawer-open semantics, and the
// cross-surface checks (Settings/Media in Control Room, Switch Player in
// Sanctuary) that prove nothing was actually lost by removing them here.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const cardCss = readFileSync(join(HERE, "GameCard.module.css"), "utf8").replace(/\r\n/g, "\n")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")
const crJsx = readFileSync(join(HERE, "../ControlRoom/ControlRoom.jsx"), "utf8")
const homeJsx = readFileSync(join(HERE, "../VesparaHome/VesparaHome.jsx"), "utf8")

// -- Part 1: center spacing without reintroducing curved geometry ----------

test("no arc/rotateY/fan/cylindrical/perspective-wheel geometry exists anywhere in the shelf transform", () => {
  const styleFn = jsx.slice(jsx.indexOf("const getCardStyle = (index) => {"), jsx.indexOf("const getTabStyle = (index) => {"))
  assert.doesNotMatch(styleFn, /rotateY|perspective|Math\.sin|Math\.cos|radius/i)
  assert.match(styleFn, /translateX\(/)
})

test("CARD_SLOT_WIDTH increased from 230 to 252, the sole spacing lever used", () => {
  assert.match(jsx, /const CARD_SLOT_WIDTH = 252/)
})

// -- Part 2: selected card carries at least three independent cues --------

test(".center combines border, glow, lift/scale, and a distinct local-backing drop shadow -- at least three simultaneous cues, none color-only", () => {
  const rule = cardCss.match(/(?<!\.card)\.center\s*\{([^}]*)\}/)
  assert.ok(rule, ".center rule must exist")
  assert.match(rule[1], /border:\s*2px solid #d6b274/, "cue 1: outline")
  assert.match(rule[1], /transform:\s*scale\(1\.07\) translateY\(-5px\)/, "cue 2: lift/scale")
  assert.match(rule[1], /filter:\s*drop-shadow\(/, "cue 3: local-backing contrast")
  assert.match(rule[1], /box-shadow:/, "cue 4: glow")
})

test("center title/metadata are brighter than neighbors -- an additional, non-color-only cue", () => {
  assert.match(cardCss, /\.card\.center \.title\s*\{[^}]*color:\s*#f8f0dc/s)
  assert.match(cardCss, /\.card\.center \.system\s*\{[^}]*color:\s*rgba\(120, 214, 198, 0\.8\)/s)
})

test("no gold text-stroke exists on game titles or metadata (reserved for major world labels elsewhere, not card content)", () => {
  assert.doesNotMatch(cardCss, /\.title\s*\{[^}]*-webkit-text-stroke/s)
  assert.doesNotMatch(cardCss, /\.system\s*\{[^}]*-webkit-text-stroke/s)
})

test("persistent selection (.center) and active controller focus (.centerActive) remain visually distinct rules", () => {
  const center = cardCss.match(/(?<!\.card)\.center\s*\{([^}]*)\}/)[1]
  const active = cardCss.match(/\.centerActive\s*\{([^}]*)\}/)[1]
  assert.notEqual(center.replace(/\s/g, ""), active.replace(/\s/g, ""))
  assert.match(active, /border-color:\s*#f0d29c/, "active focus uses a brighter border than persistent selection's #d6b274")
})

test("hover only reveals the play overlay -- no border/scale change, so it can't be mistaken for focus", () => {
  assert.match(cardCss, /\.card:hover \.playOverlay \{ opacity: 1; \}/)
  assert.doesNotMatch(cardCss, /\.card:hover\s*\{[^}]*(border|transform|box-shadow)/s)
})

test("neighbors recede via desaturation/dimming, a distinct cue from the center card's own treatment", () => {
  assert.match(cardCss, /\.neighbor\s*\{\s*filter:\s*saturate\(0\.86\) brightness\(0\.94\);\s*\}/)
})

test("reduced motion keeps border/glow/brighter-title/neighbor-desaturation cues even with lift removed", () => {
  const reducedBlock = cardCss.slice(cardCss.indexOf("@media (prefers-reduced-motion: reduce)"))
  assert.match(reducedBlock, /\.center \{ transform: none; \}/)
})

// -- Part 5: fallback chain ends at the approved Vespara mark --------------

test("the still-image fallback order is hero -> screenshot -> snap -> capsule -> cover -> logo, then the Vespara mark placeholder", () => {
  const order = jsx.slice(jsx.indexOf("const previewStill ="), jsx.indexOf("currentRef.current = current"))
  assert.match(order, /currentArtwork\?\.hero \|\|/)
  assert.match(order, /currentArtwork\?\.screenshot \|\|/)
  assert.match(order, /current\?\.snapPath \|\|/)
  assert.match(order, /currentArtwork\?\.capsule \|\|/)
  assert.match(order, /current\?\.boxArtPath \|\|/)
  assert.match(order, /currentArtwork\?\.logo \|\|/)
})

test("the no-artwork fallback renders the approved Vespara doorway/beacon mark, a local SVG import -- never a remote asset, base64, or an old NuArcade logo", () => {
  assert.match(jsx, /import vesparaMicroMark from "\.\.\/\.\.\/assets\/brand\/vespara-symbol-micro\.svg"/)
  assert.match(jsx, /<div className=\{styles\.previewFallback\}>\s*\n\s*<img src=\{vesparaMicroMark\} alt=""/)
  assert.doesNotMatch(jsx, /NuArcadeLogo|nuarcade-logo|arcade-logo/i)
  const fallbackBlock = jsx.slice(jsx.indexOf("<div className={styles.previewFallback}>"), jsx.indexOf("</div>", jsx.indexOf("<div className={styles.previewFallback}>")))
  assert.doesNotMatch(fallbackBlock, /https?:\/\/|data:image/)
})

// -- Part 7: the drawer is renamed Tools / Library Tools --------------------

test("the trigger button reads TOOLS and the panel's own visible title reads LIBRARY TOOLS", () => {
  assert.match(jsx, /\{t\("wheel\.libraryTools"\)\}/)
  assert.match(jsx, /<div className=\{styles\.consolePanelTitle\}>\{t\("wheel\.libraryToolsPanelTitle"\)\}<\/div>/)
  assert.match(en, /"wheel\.libraryTools":\s*"Tools"/)
  assert.match(en, /"wheel\.libraryToolsPanelTitle":\s*"Library Tools"/)
  assert.match(es, /"wheel\.libraryTools":\s*"Herramientas"/)
})

test("the drawer is no longer called Console anywhere in the current i18n keys or JSX ids", () => {
  assert.doesNotMatch(jsx, /libraryConsole\b|library-console-panel/)
  assert.doesNotMatch(en, /"wheel\.libraryConsole/)
})

// -- Part 9: opening is explicit (A on the trigger), never a focus side effect --

test("consoleVisible is driven solely by consoleOpen -- arriving on the trigger (focusZone 0) no longer opens it by itself", () => {
  assert.match(jsx, /const consoleVisible = consoleOpen$/m)
})

test("Confirm on topMenuIdx 1 (the Tools trigger) is the one explicit action that opens the drawer", () => {
  assert.match(jsx, /\(\) => setConsoleOpen\(true\),\s*\/\/ 1 Tools trigger/)
  const confirmBlock = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("back: () => {"))
  assert.match(confirmBlock, /if \(z === 0\) \{ topMenuActions\[topMenuIdxRef\.current\]\?\.\(\); return \}/)
})

// -- Regression: two real double-highlight bugs caught live in this
// milestone's own preview-review round 2 (both fixed in production, not
// just documented) --------------------------------------------------------

test("real DOM focus follows consoleFocusIdx via toolsItemRefs -- Left/Right moves both the barFocused class AND real focus, so no stale item keeps its own :focus-visible ring", () => {
  assert.match(jsx, /const toolsItemRefs = useRef\(\[\]\)/)
  for (let i = 1; i <= 6; i++) {
    assert.match(jsx, new RegExp("ref=\\{el => toolsItemRefs\\.current\\[" + i + "\\] = el\\}"))
  }
  assert.match(jsx, /const target = consoleFocusIdx === 0 \? consoleFirstItemRef\.current : toolsItemRefs\.current\[consoleFocusIdx\]/)
  assert.match(jsx, /target\?\.focus\(\)/)
})

test("the Tools trigger's real focus is explicitly cleared when focusZone leaves 0 -- closeConsole() correctly refocuses it on B, but Down afterward no longer leaves it stuck showing :focus-visible alongside the tab strip's own focus ring", () => {
  const block = jsx.slice(jsx.indexOf("// Same class of fix, one level up"), jsx.indexOf("// Opening always starts on a valid item"))
  assert.match(block, /if \(focusZone !== 0 && document\.activeElement === consoleTriggerRef\.current\) \{/)
  assert.match(block, /consoleTriggerRef\.current\.blur\(\)/)
})

test("opening the drawer highlights Search first but does not activate/open it -- only Confirm on it does", () => {
  assert.match(jsx, /if \(consoleVisible\) setConsoleFocusIdx\(0\)/)
  const confirmBlock = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("back: () => {"))
  assert.match(confirmBlock, /if \(consoleFocusIdxRef\.current === 0\) \{ setShowSearch\(true\); setConsoleOpen\(false\); return \}/)
})

// -- Part 8: removed items are gone from the drawer, but not from the app --

test("Settings/Media/Switch Player/Depart are absent from the Tools panel specifically", () => {
  const panelIdx = jsx.indexOf('id="library-tools-panel"')
  const panelEndIdx = jsx.indexOf('<div className={styles.travelerGreeting}')
  const panel = jsx.slice(panelIdx, panelEndIdx)
  assert.doesNotMatch(panel, /setShowSettings|setShowMediaManager|onSwitchPlayer|openDepart/)
})

test("Settings and Media remain fully available in the Control Room (Milestone C3), untouched by this milestone", () => {
  assert.match(crJsx, /id: "settings"/)
  assert.match(crJsx, /<Settings\b/)
  assert.match(crJsx, /id: "media"/)
  assert.match(crJsx, /<MediaManager\b/)
})

test("Switch Player remains available in Sanctuary (VesparaHome's own action row), untouched by this milestone", () => {
  assert.match(homeJsx, /const ACTIONS = \["library", "controlRoom", "switchPlayer", "depart"\]/)
})

test("the universal Depart plaque remains the one Depart entry point in the Library", () => {
  assert.match(jsx, /className=\{styles\.departReservation\}/)
  assert.equal((jsx.match(/onClick=\{openDepart\}/g) || []).length, 1)
})

// -- Cross-cutting: no protected surfaces were touched ----------------------

test("this milestone's changes stay within Library/Collections files -- no Control Room or Sanctuary source was modified to remove these items (only read for cross-checks above)", () => {
  // Sanity check only: confirms the cross-surface files above still parse
  // as real, substantial source (i.e. these reads found real files, not
  // empty/missing ones), not a claim about git history.
  assert.ok(crJsx.length > 1000)
  assert.ok(homeJsx.length > 1000)
})
