// gatewayIntegration.test.js -----------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// PlayerSelect.jsx/.module.css cannot be imported here (JSX and CSS -- see
// entryFlowPolish.test.js's own limitations note). These tests read the
// real committed source text and the real bundled background asset, and
// assert on the specific promises Vespara Traveler Recognition Milestone 1
// (Gateway Integration) made: the production background is bundled
// locally (not remote/base64), decorative and non-interactive, the
// reference mockup image was never added to the repository, existing
// profile/New-Traveler/Guest/Depart behavior and all input paths are
// completely unchanged, focus-visible treatment survives, the entrance
// treatment and its reduced-motion coverage are intact, the transition
// into the Sanctuary and startup cinematic timing are untouched, Vespara
// brand assets are reused rather than recreated, typography uses only
// existing bundled resources or a documented fallback stack, no NuArcade
// technical identifier changed, English/Spanish copy remains valid, and
// the production build resolves the background asset.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (relPath) => readFileSync(join(HERE, relPath), "utf8").replace(/\r\n/g, "\n")

const jsx = read("PlayerSelect.jsx")
const css = read("PlayerSelect.module.css")
const en = read("../../i18n/en.js")
const es = read("../../i18n/es.js")
const appJsx = read("../../App.jsx")
const introJsx = read("../Intro/Intro.jsx")

const BG_ASSET_PATH = join(HERE, "assets/celestial_observatory_with_cosmic_vista.png")

// -- 1 & 2. Bundled background asset present, imported locally, no remote/base64 --

test("the gateway background asset exists as a real bundled file in a PlayerSelect-owned assets directory", () => {
  assert.ok(existsSync(BG_ASSET_PATH), "expected celestial_observatory_with_cosmic_vista.png in PlayerSelect/assets/")
  const stat = statSync(BG_ASSET_PATH)
  assert.ok(stat.size > 500_000, "expected the full-resolution production plate, not a placeholder")
})

test("PlayerSelect.jsx imports the background asset as a local ES module (Vite-bundled), not a remote URL or base64 string", () => {
  assert.match(jsx, /import gatewayBackground from '\.\/assets\/celestial_observatory_with_cosmic_vista\.png'/)
  assert.doesNotMatch(jsx, /https?:\/\/[^"'\s]*\.(png|jpe?g|gif|webp)/i, "must not reference the background remotely")
  assert.doesNotMatch(jsx, /data:image\/(png|jpe?g|gif|webp);base64/i, "must not convert the background to base64")
})

test("the background is rendered via a plain <img src={gatewayBackground}>, not a CSS background-image with an inlined data URI", () => {
  assert.match(jsx, /<img src=\{gatewayBackground\} alt="" aria-hidden="true" className=\{styles\.gatewayBg\} \/>/)
  assert.doesNotMatch(css, /data:image\/(png|jpe?g|gif|webp);base64/i)
})

test("the background renders without stretching -- object-fit: cover with a fixed focal object-position, never background-size: 100% 100% or stretch", () => {
  const rule = css.match(/\.gatewayBg\s*\{([^}]*)\}/)
  assert.ok(rule, ".gatewayBg rule must exist")
  assert.match(rule[1], /object-fit:\s*cover/)
  assert.match(rule[1], /object-position:\s*center\s+55%/)
  assert.doesNotMatch(rule[1], /background-size/)
})

// -- 3. The reference mockup image was never added to the repository --------

test("the reference mockup (cosmic_sanctuary_traveler_interface) was not added anywhere in the repository", () => {
  assert.doesNotMatch(jsx, /cosmic_sanctuary_traveler_interface/i)
  assert.doesNotMatch(css, /cosmic_sanctuary_traveler_interface/i)
  assert.ok(!existsSync(join(HERE, "assets/cosmic_sanctuary_traveler_interface.png")))
})

test("PlayerSelect never renders a flattened full-screen mockup image -- the only <img> sources are the local background and the brand seal, both decorative", () => {
  const imgTags = jsx.match(/<img[^>]*\/>/g) || []
  assert.ok(imgTags.length >= 2, "expected at least the background and seal <img> tags")
  for (const tag of imgTags) {
    assert.match(tag, /aria-hidden="true"/, "every <img> in PlayerSelect must be decorative")
  }
})

// -- 4 & 5. Existing profile render/selection and New Traveler/Guest/Depart handlers unchanged --

test("profile render loop, selection dispatch, and zero/one-profile architecture are byte-for-byte unchanged", () => {
  assert.match(jsx, /\{profiles\.length > 0 && \(/)
  assert.match(jsx, /\{profiles\.map\(\(p, i\) => \(/)
  assert.match(jsx, /onClick=\{\(\) => \{ snd\.select\(\); selectProfile\(p\) \}\}/)
  assert.match(jsx, /<span className=\{styles\.profileIcon\}>\{p\.name\[0\]\.toUpperCase\(\)\}<\/span>/)
  assert.match(jsx, /<span className=\{styles\.profileName\}>\{p\.name\}<\/span>/)
})

test("confirmFocused's dispatch table (EXIT/profile/New Traveler/Guest) is unchanged", () => {
  const fn = jsx.slice(jsx.indexOf("const confirmFocused = () => {"), jsx.indexOf("useOverlayGamepad({"))
  assert.match(fn, /if \(cur === EXIT_IDX\)  \{ handleExit\(\); return \}/)
  assert.match(fn, /if \(cur >= 1 && cur <= profileEnd\) \{/)
  assert.match(fn, /const p = profiles\[cur - 1\]/)
  assert.match(fn, /selectProfile\(p\); return/)
  assert.match(fn, /if \(cur === newPIdx\)   \{ setAdding\(true\); return \}/)
  assert.match(fn, /if \(cur === guestIdx\)  \{ enterGuest\(\); return \}/)
})

test("New Traveler (add-player) submit/cancel and Guest onClick are unchanged", () => {
  assert.match(jsx, /if \(e\.key === 'Enter' && name\.trim\(\)\) \{ snd\.select\(\); onAdd\(name\.trim\(\)\); setAdding\(false\); setName\(''\) \}/)
  assert.match(jsx, /onClick=\{\(\) => \{\s*\n\s*if \(name\.trim\(\)\) \{ snd\.select\(\); onAdd\(name\.trim\(\)\); setAdding\(false\); setName\(''\) \}\s*\n\s*\}\}/)
  assert.match(jsx, /onClick=\{enterGuest\}/)
})

test("handleExit's confirm-then-quit sequence and its 3s auto-reset are unchanged", () => {
  const fn = jsx.slice(jsx.indexOf("const handleExit = () => {"), jsx.indexOf("const confirmFocused = () => {"))
  assert.match(fn, /window\.nuarcade\?\.quit\?\.\(\)/)
  assert.match(fn, /setTimeout\(\(\) => setExitConfirm\(false\), 3000\)/)
})

test("App.jsx's PlayerSelect render props (onSelect/onGuest/onAdd/onDelete/profiles) are unchanged", () => {
  const block = appJsx.slice(appJsx.indexOf("<PlayerSelect"), appJsx.indexOf("/>", appJsx.indexOf("<PlayerSelect")))
  assert.match(block, /profiles=\{profiles\}/)
  assert.match(block, /onSelect=\{handlePlayerSelect\}/)
  assert.match(block, /onGuest=\{handleGuest\}/)
  assert.match(block, /onAdd=\{handleAddProfile\}/)
  assert.match(block, /onDelete=\{deleteProfile\}/)
})

// -- 6. Keyboard, controller, and mouse paths unchanged ----------------------

test("moveFocus/hoverFocus/keyboard-handler bodies are structurally unchanged (same clamping, same guards)", () => {
  assert.match(jsx, /const moveFocus = \(direction\) => \{/)
  assert.match(jsx, /Math\.max\(EXIT_IDX, i - 1\)/)
  assert.match(jsx, /Math\.min\(maxIdx, i \+ 1\)/)
  assert.match(jsx, /const hoverFocus = \(idx\) => \{/)
  assert.match(jsx, /window\.addEventListener\("keydown", handler\)/)
})

test("the gamepad wiring (onUp/onDown/onLeft/onRight/onConfirm/onClose) is unchanged", () => {
  const block = jsx.slice(jsx.indexOf("useOverlayGamepad({"), jsx.indexOf("// Keyboard parity"))
  assert.match(block, /onUp:\s*\(\) => moveFocus\(-1\)/)
  assert.match(block, /onDown:\s*\(\) => moveFocus\(1\)/)
  assert.match(block, /onLeft:\s*\(\) => moveFocus\(-1\)/)
  assert.match(block, /onRight:\s*\(\) => moveFocus\(1\)/)
  assert.match(block, /onConfirm:\s*\(\) => confirmFocused\(\)/)
})

// -- 7. Focus-visible rules remain intact ------------------------------------

test("explicit :focus-visible treatment still exists for every focusable control", () => {
  assert.match(css, /\.exitBtn:focus-visible/)
  assert.match(css, /\.btnNewPlayer:focus-visible/)
  assert.match(css, /\.btnGuest:focus-visible/)
  assert.match(css, /\.profileRow \.profileBtn:focus-visible/)
})

test("no blanket outline: none reset was introduced", () => {
  assert.doesNotMatch(css, /\*\s*\{[^}]*outline\s*:\s*none/)
})

test("the selected Traveler plaque is never communicated by color alone -- outline, box-shadow, AND border-color all move together on selection", () => {
  const rule = css.match(/\.profileRow \.profileBtn\.profileBtnActive,\s*\n\.profileRow \.profileBtn:focus-visible \{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /outline:/)
  assert.match(rule[1], /box-shadow:/)
  assert.match(rule[1], /border-color:/)
})

test("the Traveler Recognition headline keeps its cream fill and adds only a restrained Vespara-gold hairline edge", () => {
  const rule = css.match(/\.headline\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /color:\s*#f8f0dc/)
  assert.match(rule[1], /-webkit-text-stroke:\s*0\.55px rgba\(214, 178, 116, 0\.9\)/)
  assert.doesNotMatch(rule[1], /-webkit-text-stroke:\s*[2-9]/, "the title edge must remain thin, never cartoonishly heavy")
})

// -- 8. Background/decorative layers are aria-hidden and non-interactive ----

test("the background, veil, haze, and seal are all aria-hidden and pointer-events: none", () => {
  assert.match(jsx, /className=\{styles\.gatewayVeil\} aria-hidden="true"/)
  assert.match(jsx, /className=\{styles\.gatewayHaze\} aria-hidden="true"/)
  assert.match(jsx, /className=\{styles\.gatewaySeal\} \/>/)
  for (const cls of [".gatewayBg", ".gatewayVeil", ".gatewayHaze", ".gatewaySeal"]) {
    const rule = css.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule, cls + " rule must exist")
    assert.match(rule[1], /pointer-events:\s*none/, cls + " must be pointer-events: none")
  }
})

test("decorative layers sit behind interactive content (z-index 0 vs. .content's z-index 2)", () => {
  for (const cls of [".gatewayBg", ".gatewayVeil", ".gatewayHaze"]) {
    const rule = css.match(new RegExp(cls.replace(".", "\\.") + "\\s*\\{([^}]*)\\}"))
    assert.ok(rule)
    assert.match(rule[1], /z-index:\s*0/, cls + " must be z-index: 0")
  }
  const contentRule = css.match(/\.content\s*\{([^}]*)\}/)
  assert.ok(contentRule)
  assert.match(contentRule[1], /z-index:\s*2/)
})

// -- 9. Entrance treatment exists and reduced motion neutralizes every new animation --

test("the existing overlay fade + content entrance timing is unchanged (~0.5s + ~0.4s, well inside the 400-600ms target)", () => {
  assert.match(css, /\.overlay\s*\{[^}]*animation:\s*fadeIn 0\.5s ease;/s)
  assert.match(css, /\.content\s*\{[^}]*animation:\s*contentEnter 0\.4s ease;/s)
})

test("the new gatewayHaze breathing animation is slow/restrained (>= 6s) and neutralized under reduced motion", () => {
  const rule = css.match(/\.gatewayHaze\s*\{([^}]*)\}/)
  assert.ok(rule)
  const durationMatch = rule[1].match(/animation:\s*gatewayBreathe\s+(\d+)s/)
  assert.ok(durationMatch, "expected a gatewayBreathe animation with a duration")
  assert.ok(Number(durationMatch[1]) >= 6, "the ambient haze must be slow (>= 6s), not a noticeable pulse")
  const reducedBlock = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {"))
  assert.match(reducedBlock, /\.gatewayHaze \{ animation: none; \}/)
})

test("reduced motion still removes the background/content entrance animations and the decorative coin/runner motifs, per the pre-existing rule set", () => {
  const reducedBlock = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {"))
  assert.match(reducedBlock, /\.coin, \.runner \{ display: none; \}/)
  assert.match(reducedBlock, /\.overlay \{ animation: none; \}/)
  assert.match(reducedBlock, /\.content \{ animation: none; opacity: 1; transform: none; \}/)
})

test("the background image itself is never animated (no zoom/pan keyframes reference .gatewayBg)", () => {
  const rule = css.match(/\.gatewayBg\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.doesNotMatch(rule[1], /animation/)
  assert.doesNotMatch(rule[1], /transform/)
})

// -- 10 & 11. Sanctuary transition and startup cinematic timing untouched ---

test("handlePlayerSelect/handleGuest/handleAddProfile all still transition into phase 'main' in App.jsx, unchanged", () => {
  assert.match(appJsx, /const handlePlayerSelect = \(player\) => \{\s*\n\s*selectProfile\(player\.id\)\s*\n\s*setPhase\("main"\)/)
  assert.match(appJsx, /const handleGuest = \(\) => \{\s*\n\s*selectGuest\(\)\s*\n\s*setPhase\("main"\)/)
  assert.match(appJsx, /const handleAddProfile = \(name\) => \{\s*\n\s*addProfile\(name\)\s*\n\s*setPhase\("main"\)/)
})

test("Intro.jsx's timing constants and skip behavior are completely untouched (not part of this milestone's edited files)", () => {
  assert.match(introJsx, /const ARRIVAL_DURATION = 2500/)
  assert.match(introJsx, /const SAFETY_DURATION = 3500/)
  assert.match(introJsx, /window\.addEventListener\('keydown', skip\)/)
  assert.match(introJsx, /window\.addEventListener\('click', skip\)/)
})

// -- 12. Vespara brand assets are reused, not recreated ---------------------

test("PlayerSelect imports the existing production micro-mark SVG from renderer/src/assets/brand/, not a new/duplicated asset", () => {
  assert.match(jsx, /import vesparaSeal from '\.\.\/\.\.\/assets\/brand\/vespara-symbol-micro\.svg'/)
  const brandAssetPath = join(HERE, "../../assets/brand/vespara-symbol-micro.svg")
  assert.ok(existsSync(brandAssetPath), "the referenced brand asset must be the real, existing production file")
})

test("no new SVG was created inside PlayerSelect/assets -- only the bundled raster background and (as of Milestone 1.2) the bundled gateway theme mp3 live there", () => {
  const files = readdirSync(join(HERE, "assets")).sort()
  assert.deepEqual(files, ["celestial_observatory_with_cosmic_vista.png", "vespara-gateway-theme.mp3"].sort())
})

// -- 13. Typography uses only existing bundled/licensed resources or a documented fallback --

test("the new display-serif treatment is a documented cross-platform system-font fallback stack, not a newly downloaded/bundled font file", () => {
  assert.match(css, /font-family:\s*'Times New Roman', Georgia, 'Liberation Serif', serif;/)
  // No new @font-face or font file reference was introduced.
  assert.doesNotMatch(css, /@font-face/)
  assert.doesNotMatch(css, /\.(woff2?|ttf|otf)['"]/)
})

test("the quieter interface face for helper/metadata text (.sub, .sanctuary) remains the pre-existing Share Tech Mono, unchanged", () => {
  const subRule = css.match(/\.sub\s*\{([^}]*)\}/)
  const sanctuaryRule = css.match(/\.sanctuary\s*\{([^}]*)\}/)
  assert.match(subRule[1], /font-family:\s*'Share Tech Mono', monospace;/)
  assert.match(sanctuaryRule[1], /font-family:\s*'Share Tech Mono', monospace;/)
})

test("no new font dependency was added to renderer/package.json", () => {
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  const deps = { ...(rendererPkg.dependencies || {}), ...(rendererPkg.devDependencies || {}) }
  assert.deepEqual(Object.keys(rendererPkg.dependencies).sort(), ["@fontsource/orbitron", "howler", "react", "react-dom"].sort())
  assert.equal("@fontsource/playfair-display" in deps, false)
  assert.equal("@fontsource/cinzel" in deps, false)
})

// -- 14. No technical NuArcade identifier changed ----------------------------

test("window.nuarcade calls in PlayerSelect/App.jsx are untouched", () => {
  assert.match(jsx, /window\.nuarcade\?\.quit\?\.\(\)/)
  assert.match(appJsx, /window\.nuarcade\?\.getConfig\?\.\(\)/)
})

// -- 15. English and Spanish behavior/copy remain valid ----------------------

test("all playerSelect.* copy used by this screen is unchanged and present in both locales", () => {
  for (const [key, enVal, esVal] of [
    ["playerSelect.headline", "TRAVELER RECOGNITION", "RECONOCIMIENTO DEL VIAJERO"],
    ["playerSelect.sub", "Who enters Vespara?", "¿Quién entra en Vespara?"],
    ["playerSelect.addPlayer", "New Traveler", "Nuevo viajero"],
    ["playerSelect.guest", "Enter as Guest", "Entrar como invitado"],
    ["playerSelect.exit", "DEPART", "PARTIR"],
  ]) {
    assert.match(en, new RegExp(`"${key}":\\s*"${enVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`))
    assert.match(es, new RegExp(`"${key}":\\s*"${esVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`))
  }
})

test("no new i18n key was required or added for this milestone -- the gateway reuses existing home.worldName/home.sanctuary/playerSelect.* keys", () => {
  assert.match(jsx, /\{t\("home\.worldName"\)\}/)
  assert.match(jsx, /\{t\("home\.sanctuary"\)\}/)
  assert.match(jsx, /\{t\("playerSelect\.headline"\)\}/)
  assert.match(jsx, /\{t\("playerSelect\.sub"\)\}/)
})

// -- 16. Production build resolves the background asset ---------------------
// (Exercised directly by the milestone's validation run -- `npm run build`
// inside renderer/ -- rather than re-invoked here; see the milestone
// report for the confirmed build output referencing the hashed asset.)

test("the import path used in source resolves to a real file on disk (sanity check for the build-resolution claim above)", () => {
  const importMatch = jsx.match(/import gatewayBackground from '(\.\/assets\/[^']+)'/)
  assert.ok(importMatch)
  const resolved = join(HERE, importMatch[1])
  assert.ok(existsSync(resolved), `import path ${importMatch[1]} must resolve to a real file`)
})
