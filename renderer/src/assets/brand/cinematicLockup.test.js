// Cinematic corner-identity regression tests. The startup lockup combines
// the approved doorway/beacon SVG with live serif text; it intentionally
// does not use a path-built wordmark asset.

import { test } from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const introJsx = readFileSync(join(HERE, "../../components/Wheel/IntroVideo.jsx"), "utf8")
const introCss = readFileSync(join(HERE, "../../components/Wheel/IntroVideo.module.css"), "utf8")
const symbol = readFileSync(join(HERE, "vespara-symbol-simplified.svg"), "utf8")

test("IntroVideo uses the approved simplified doorway/beacon symbol", () => {
  assert.match(introJsx, /import vesparaSymbol from "\.\.\/\.\.\/assets\/brand\/vespara-symbol-simplified\.svg"/)
  assert.match(introJsx, /<img src=\{vesparaSymbol\} alt="" className=\{styles\.brandSymbol\} \/>/)
  assert.match(symbol, /M36,240 L36,96 L100,18 L164,96 L164,240/)
  assert.match(symbol, /M68,240 L68,118 L100,66 L132,118 L132,240/)
})

test("the cinematic identity is live VESPARA / THE SANCTUARY text", () => {
  assert.match(introJsx, /<div className=\{styles\.brandName\}>VESPARA<\/div>/)
  assert.match(introJsx, /<div className=\{styles\.brandSubtitle\}>THE SANCTUARY<\/div>/)
})

test("the complete live-type lockup is decorative and aria-hidden", () => {
  assert.match(introJsx, /<div className=\{styles\.brandLockup\} aria-hidden="true">/)
  assert.match(introJsx, /<img src=\{vesparaSymbol\} alt=""/)
})

test("the cinematic lockup uses no old techno or hand-built alphabet asset", () => {
  assert.doesNotMatch(introJsx, /vespara-(?:lockup|wordmark)/)
  assert.equal(existsSync(join(HERE, "vespara-lockup-cinematic.svg")), false)
  assert.equal((symbol.match(/<path /g) || []).length, 2, "the active SVG contains only the approved doorway paths")
  assert.doesNotMatch(symbol, /<text[\s>]/i)
})

test("the live identity uses the Traveler Recognition classical serif stack", () => {
  const rule = introCss.match(/\.brandText\s*\{([^}]*)\}/)
  assert.ok(rule)
  assert.match(rule[1], /font-family:\s*"Times New Roman", Georgia, "Liberation Serif", serif/)
})

test("the lockup adds no remote font, embedded font, base64, or font package", () => {
  const symbolWithoutNamespace = symbol.replace(/xmlns(:\w+)?="https?:\/\/[^"]*"/g, "")
  const activeSources = introJsx + "\n" + introCss + "\n" + symbolWithoutNamespace
  assert.doesNotMatch(activeSources, /@font-face|data:font|base64|https?:\/\//i)
  const rendererPkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))
  assert.deepEqual(Object.keys(rendererPkg.dependencies).sort(), ["@fontsource/orbitron", "howler", "react", "react-dom"].sort())
})

test("the production lockup dimensions and restrained hierarchy stay in range", () => {
  const lockup = introCss.match(/\.brandLockup\s*\{([^}]*)\}/)
  const symbolRule = introCss.match(/\.brandSymbol\s*\{([^}]*)\}/)
  const name = introCss.match(/\.brandName\s*\{([^}]*)\}/)
  const subtitle = introCss.match(/\.brandSubtitle\s*\{([^}]*)\}/)
  assert.match(lockup[1], /width:\s*276px/)
  assert.match(symbolRule[1], /height:\s*52px/)
  assert.match(name[1], /font-size:\s*30px/)
  assert.match(name[1], /letter-spacing:\s*0\.15em/)
  assert.match(subtitle[1], /font-size:\s*11px/)
  assert.match(subtitle[1], /letter-spacing:\s*0\.24em/)
  assert.doesNotMatch(name[1] + subtitle[1], /-webkit-text-stroke|filter:\s*blur|box-shadow/)
})

test("lower-left safe-area placement and the existing soft backing remain", () => {
  const lockup = introCss.match(/\.brandLockup\s*\{([^}]*)\}/)
  const backing = introCss.match(/\.brandMarkBacking\s*\{([^}]*)\}/)
  assert.match(lockup[1], /bottom:\s*24px/)
  assert.match(lockup[1], /left:\s*32px/)
  assert.match(lockup[1], /pointer-events:\s*none/)
  assert.match(backing[1], /radial-gradient/)
  assert.match(backing[1], /pointer-events:\s*none/)
  assert.doesNotMatch(backing[1], /box-shadow/)
})
