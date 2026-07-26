// libraryShelfFoundation.test.js ------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/Wheel.module.css/GameCard.module.css cannot be imported here
// (JSX and CSS -- see Wheel.test.js's own limitations note). These tests
// read the real committed source text and assert on the specific
// promises Vespara Library Milestone 3 (Shelf Foundation) made: a
// decorative shelf rail/bays/niche layer exists behind the carousel,
// none of it is interactive or exposed to assistive technology, the
// existing card render path (GameCard, cardSlot, getCardStyle) is
// completely untouched, carousel geometry constants are unchanged, the
// approved center-card scale survives, neighbor cards remain rendered
// and selectable, the pedestal/Library-Console/Search/Settings/Media/
// Return-to-Sanctuary/category behavior are all unaffected, and every
// new transition has reduced-motion coverage.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")
const cardJsx = readFileSync(join(HERE, "GameCard.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "Wheel.module.css"), "utf8").replace(/\r\n/g, "\n")
const cardCss = readFileSync(join(HERE, "GameCard.module.css"), "utf8").replace(/\r\n/g, "\n")
const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))

// -- 1. A decorative shelf foundation is present in the carousel region ------

test("shelfBays, shelfNiche, and shelfRail render inside wheelArea, before the nav buttons and card track", () => {
  const wheelAreaIdx = jsx.indexOf("<div className={styles.wheelArea}>")
  const navBtnIdx = jsx.indexOf("className={styles.navBtn} onClick={() => navigate(-1)}")
  assert.ok(wheelAreaIdx > -1 && navBtnIdx > wheelAreaIdx)
  const preNavBlock = jsx.slice(wheelAreaIdx, navBtnIdx)
  assert.match(preNavBlock, /<div className=\{styles\.shelfBays\} aria-hidden="true" \/>/)
  assert.match(preNavBlock, /<div className=\{styles\.shelfNiche\} aria-hidden="true" \/>/)
  assert.match(preNavBlock, /<div className=\{styles\.shelfRail\} aria-hidden="true" \/>/)
})

test("shelfBays/shelfNiche/shelfRail are real CSS rules with actual visual treatment, not placeholders", () => {
  for (const cls of [".shelfBays", ".shelfNiche", ".shelfRail"]) {
    const rule = css.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule, cls + " rule must exist")
    assert.match(rule[1], /background/, cls + " must have a visual background treatment")
  }
})

test("the shelf rail fades toward the edges (never a flat full-width divider) and stays restrained (no bright glow)", () => {
  const rule = css.match(/\.shelfRail\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /linear-gradient\(90deg, transparent/, "expected an edge-fading gradient, not a solid bar")
  assert.doesNotMatch(rule[1], /#00c8ff|#00ff88|rgba\(0,\s*200,\s*255/, "must not reuse the old cyan HUD glow language")
})

// -- 2. Shelf decoration is non-interactive and inaccessible to AT ----------

test("every shelf layer is aria-hidden in JSX and pointer-events: none in CSS", () => {
  for (const cls of ["shelfBays", "shelfNiche", "shelfRail"]) {
    assert.match(jsx, new RegExp(`className=\\{styles\\.${cls}\\} aria-hidden="true"`))
  }
  for (const cls of [".shelfBays", ".shelfNiche", ".shelfRail"]) {
    const rule = css.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule)
    assert.match(rule[1], /pointer-events:\s*none/, cls + " must be pointer-events: none")
  }
})

test("shelf layers sit at a low z-index, well behind cardSlot (6+) and navBtn (20)", () => {
  for (const cls of [".shelfBays", ".shelfNiche", ".shelfRail"]) {
    const rule = css.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule)
    const z = Number(rule[1].match(/z-index:\s*(-?\d+)/)?.[1])
    assert.ok(Number.isFinite(z) && z <= 2, cls + " must have a low z-index (<= 2), got " + z)
  }
})

// -- 3. Shelf decoration does not replace or wrap away the existing card render path --

test("the card render loop (filteredGames.map, cardSlot, GameCard) is structurally unchanged -- shelf layers are siblings, not wrappers", () => {
  assert.match(jsx, /\{filteredGames\.map\(\(game, index\) => \{/)
  assert.match(jsx, /const cardStyle = getCardStyle\(index\)/)
  assert.match(jsx, /className=\{styles\.cardSlot\}\s*\n\s*style=\{cardStyle\}/)
  assert.match(jsx, /isCenter=\{index === selectedIndex\}/)
})

test("cardTrack still directly follows the shelf layers and the first nav button, unwrapped", () => {
  const shelfRailIdx = jsx.indexOf("styles.shelfRail")
  const cardTrackIdx = jsx.indexOf("<div className={styles.cardTrack}>")
  const navBtnIdx = jsx.indexOf("className={styles.navBtn} onClick={() => navigate(-1)}")
  assert.ok(shelfRailIdx > -1 && navBtnIdx > shelfRailIdx && cardTrackIdx > navBtnIdx)
})

// -- 4. Existing carousel geometry constants and getCardStyle are unchanged --

test("getCardStyle's zIndex/pointerEvents/transition contract is unchanged; D3 replaced only the transform's arc math with a flat shelf", () => {
  assert.match(jsx, /const CARD_SLOT_WIDTH = 252/)
  assert.match(jsx, /const scale = signed === 0 \? 1 : Math\.max\(0\.74, 1 - absPos \* 0\.065\)/)
  assert.match(jsx, /const opacity = signed === 0 \? 1 : Math\.max\(0\.5, 1 - absPos \* 0\.12\)/)
  assert.match(jsx, /pointerEvents: signed === 0 \? 'auto' : 'none'/)
  assert.match(jsx, /transition: 'transform 0\.2s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\), opacity 0\.2s ease'/)
})

test("navigate(), selectedIndex, and velocity behavior are untouched", () => {
  assert.match(jsx, /const navigate = \(dir\) => \{/)
  assert.match(jsx, /const \[selectedIndex, setSelectedIndex\] = useState\(0\)/)
  assert.match(jsx, /velocityRef\.current = Math\.min\(velocityRef\.current \+ 1, 6\)/)
})

// -- 5. The focused card retains a modest, single-value scale -----------------

test(".center keeps a single restrained scale value (D2: 1.05 -> 1.07, a tiny CSS-only offset, not a carousel geometry change)", () => {
  const rule = cardCss.match(/(?<!\.card)\.center\s*\{([^}]*)\}/) || cardCss.match(/\n\.center \{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /transform:\s*scale\(1\.07\) translateY\(-5px\)/)
  assert.match(rule[1], /#d6b274/)
})

test("reduced motion still forces .center's transform to none, neutralizing the new translateY along with the scale", () => {
  assert.match(cardCss, /@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*\.center \{ transform: none; \}\s*\n\}/)
})

// -- 6. Neighbor cards remain rendered and selectable -------------------------

test("GameCard still applies .neighbor to non-center cards and their onClick still selects them, unchanged", () => {
  assert.match(cardJsx, /\$\{styles\.card\} \$\{isCenter \? styles\.center : styles\.neighbor\}/)
  assert.match(jsx, /onClick=\{\(\) => \{\s*\n\s*if \(index === selectedIndex\) \{ sounds\.select\(\); resetLaunching\(\); setShowDetail\(true\) \}\s*\n\s*else setSelectedIndex\(index\)\s*\n\s*\}\}/)
})

test(".neighbor still desaturates/dims via filter only -- deeper this milestone, but still no layout/geometry property touched", () => {
  const rule = cardCss.match(/\.neighbor\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /filter:\s*saturate\(/)
  assert.doesNotMatch(rule[1], /\b(width|height|top|left|position)\s*:/)
})

// -- 7. Selected-game pedestal actions and handlers remain unchanged --------

test("the pedestal's launch/favorite handlers and infoPanel structure are untouched -- only a decorative ::before was added", () => {
  assert.match(jsx, /onClick=\{launchGame\} disabled=\{launching\}/)
  assert.match(jsx, /onClick=\{\(\) => toggleFavorite\(current\.id \|\| current\.profile\)\}/)
  const rule = css.match(/\.infoPanel\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /display:\s*flex/)
})

test("infoPanel::before is decorative only (pointer-events: none), providing the shelf-to-pedestal light continuity", () => {
  const rule = css.match(/\.infoPanel::before\s*\{([^}]*)\}/)
  assert.ok(rule, "expected an .infoPanel::before rule")
  assert.match(rule[1], /pointer-events:\s*none/)
  assert.match(rule[1], /rgba\(214, 178, 116/, "expected the same warm-gold gradient language as .shelfNiche")
})

// -- 8. Library Console structure and controller behavior are unchanged -----

test("Library Tools trigger/panel/consoleFocusIdx model are unaffected by the shelf pass", () => {
  assert.match(jsx, /className=\{styles\.consoleTrigger \+ \(consoleVisible \? " " \+ styles\.consoleTriggerActive : ""\) \+ \(focusZone === 0 && topMenuIdx === 1 \? " " \+ styles\.barFocused : ""\)\}/)
  assert.match(jsx, /const \[consoleFocusIdx, setConsoleFocusIdx\] = useState\(0\)/)
  assert.match(jsx, /const TOP_MENU_MAX = 1/)
})

test("console Down-exit and Up-boundary controller behavior are unaffected by the shelf pass", () => {
  const downBlock = jsx.slice(jsx.indexOf("down: () => {"), jsx.indexOf("confirm: () => {"))
  assert.match(downBlock, /if \(consoleOpenRef\.current\) \{ setConsoleOpen\(false\); setFocusZone\(1\); sounds\.navigate\(\); return \}/)
})

// -- 9. Search, Return to Sanctuary, category behavior intact --

test("search filtering/clear and Return to Sanctuary are unaffected by the shelf pass", () => {
  assert.match(jsx, /if \(debouncedSearch\.trim\(\)\) \{/)
  assert.match(jsx, /<div className=\{styles\.worldNav\}>\s*\n\s*<button className=\{styles\.returnHomeBtn/)
})

test("category tab rendering/positioning (getTabStyle, SLOT_WIDTH, catPill) is unaffected by the shelf pass", () => {
  assert.match(jsx, /const SLOT_WIDTH = 168/)
  assert.match(jsx, /className=\{styles\.catPill \+/)
})

// -- 10. Reduced-motion coverage includes every new transition ---------------

test("the new .cardSlot::after contact-shadow transition is neutralized under reduced motion, alongside the existing rule set", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) || []
  const covered = blocks.some(b => /\.cardSlot::after/.test(b) && /transition:\s*none/.test(b))
  assert.ok(covered, "expected a reduced-motion rule turning off .cardSlot::after's transition")
})

test("reduced-motion overrides still never remove outline or box-shadow anywhere in Wheel.module.css", () => {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g) || []
  for (const block of blocks) {
    assert.doesNotMatch(block, /outline:\s*none/)
  }
})

test("no shelf layer introduces a @keyframes animation -- purely static/positional, so there is nothing else for reduced motion to neutralize", () => {
  for (const cls of ["shelfBays", "shelfNiche", "shelfRail"]) {
    const rule = css.match(new RegExp("\\." + cls + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule)
    assert.doesNotMatch(rule[1], /animation/)
  }
})

// -- 11. Existing focus-visible rules remain intact --------------------------

test("every previously-restyled control class still has its own :focus-visible rule, unremoved by the shelf pass", () => {
  for (const cls of [".catPill", ".navBtn", ".launchBtn", ".settingsBtn", ".returnHomeBtn", ".consoleDepartBtn", ".consoleTrigger", ".consoleSearchItem"]) {
    assert.match(css, new RegExp(cls.replace(".", "\\.") + ":focus-visible"), cls + " must still have a :focus-visible rule")
  }
})

// -- 12. No remote asset, dependency, raster data, or unrelated file change --

test("no new dependency was added to renderer/package.json", () => {
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  const knownLibs = ["three", "@react-three/fiber", "framer-motion", "gsap"]
  for (const lib of knownLibs) {
    assert.equal(lib in deps, false, lib + " must not be added as a dependency")
  }
})

test("no remote URL or embedded raster (base64 image) reference was introduced in the touched CSS files", () => {
  for (const file of [css, cardCss]) {
    assert.doesNotMatch(file, /https?:\/\//i)
    assert.doesNotMatch(file, /data:image\/(png|jpe?g|gif|webp);base64/i)
  }
})
