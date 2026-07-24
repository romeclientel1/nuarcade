// brandAssets.test.js -----------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// These assert on the real, committed SVG files in this directory against
// the Vespara Brand Identity Milestone 2 requirements: every asset is
// vector-only with no embedded raster data, no base64, no remote URL, and
// no external font reference; the full inventory (primary/simplified/
// micro symbols, wordmark, endorsement, primary/horizontal lockups,
// monochrome variants, icon-safe prep) exists; and each file is
// well-formed, non-trivial SVG.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))

const REQUIRED_FILES = [
  "vespara-symbol-primary.svg",
  "vespara-symbol-simplified.svg",
  "vespara-symbol-micro.svg",
  "vespara-wordmark.svg",
  "vespara-wordmark-cream.svg",
  "vespara-wordmark-mono.svg",
  "vespara-endorsement.svg",
  "vespara-endorsement-cream.svg",
  "vespara-lockup-primary.svg",
  "vespara-lockup-horizontal.svg",
  "vespara-icon-square.svg",
  "vespara-icon-dark-field.svg",
  "vespara-icon-mono-mask.svg",
]

test("every required brand asset file exists in this directory", () => {
  const files = new Set(readdirSync(HERE))
  for (const name of REQUIRED_FILES) {
    assert.ok(files.has(name), `expected ${name} to exist in renderer/src/assets/brand/`)
  }
})

test("a README documenting purpose/sizes/colors/clear-space/misuse exists", () => {
  const readme = readFileSync(join(HERE, "README.md"), "utf8")
  assert.match(readme, /## Asset inventory/)
  assert.match(readme, /## Approved colors/)
  assert.match(readme, /## Minimum clear space/)
  assert.match(readme, /## Incorrect usage to avoid/)
})

for (const name of REQUIRED_FILES) {
  test(`${name} is well-formed, vector-only SVG with a clean viewBox`, () => {
    const svg = readFileSync(join(HERE, name), "utf8")
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, "must start with a plain <svg> root")
    assert.match(svg, /viewBox="[\d.\s]+"/, "must declare a clean numeric viewBox")
  })

  test(`${name} contains no embedded raster, base64 data, remote URL, or external font reference`, () => {
    const svg = readFileSync(join(HERE, name), "utf8")
    assert.doesNotMatch(svg, /<image[\s>]/i, "must not use a raster <image> element")
    assert.doesNotMatch(svg, /data:image\/(png|jpe?g|gif|webp);base64/i, "must not embed raster data")
    assert.doesNotMatch(svg, /data:font/i, "must not embed font data")
    // The only permitted "http(s)://" text is the standard SVG/XML
    // namespace declaration -- strip it before checking for an actual
    // remote resource reference.
    const withoutNamespaceDecls = svg.replace(/xmlns(:\w+)?="https?:\/\/[^"]*"/g, "")
    assert.doesNotMatch(withoutNamespaceDecls, /https?:\/\//i, "must not reference a remote URL")
    assert.doesNotMatch(svg, /@font-face/i, "must not reference an external font")
    assert.doesNotMatch(svg, /font-family/i, "must not depend on any system/web font -- lettering is vector paths only")
  })

  test(`${name} is non-trivial (actually draws something, not an empty shell)`, () => {
    const svg = readFileSync(join(HERE, name), "utf8")
    const hasDrawing = /<path[\s>]/.test(svg) || /<circle[\s>]/.test(svg) || /<rect[\s>]/.test(svg) || /<line[\s>]/.test(svg)
    assert.ok(hasDrawing, "expected at least one path/circle/rect/line element")
  })
}

// -- Specific inventory requirements ------------------------------------

test("the primary symbol is the most detailed (three nested archways), simplified has two, micro is a single filled silhouette", () => {
  const primary = readFileSync(join(HERE, "vespara-symbol-primary.svg"), "utf8")
  const simplified = readFileSync(join(HERE, "vespara-symbol-simplified.svg"), "utf8")
  const micro = readFileSync(join(HERE, "vespara-symbol-micro.svg"), "utf8")
  assert.equal((primary.match(/<path /g) || []).length, 3, "primary should have three nested archway paths")
  assert.equal((simplified.match(/<path /g) || []).length, 2, "simplified should have two nested archway paths")
  assert.match(micro, /fill-rule="evenodd"/, "micro mark should be a single solid evenodd silhouette")
})

test("the wordmark spells VESPARA via 7 distinct letterform paths", () => {
  const svg = readFileSync(join(HERE, "vespara-wordmark.svg"), "utf8")
  const pathCount = (svg.match(/<path /g) || []).length
  assert.equal(pathCount, 7, "expected exactly 7 letterform paths for V-E-S-P-A-R-A")
})

test("the endorsement spells BY NUARCADE and is visually subordinate (reduced opacity)", () => {
  const svg = readFileSync(join(HERE, "vespara-endorsement.svg"), "utf8")
  assert.match(svg, /aria-label="by NuArcade"/)
  assert.match(svg, /opacity="0\.82"/)
})

test("both lockups combine the symbol, wordmark, and endorsement in one self-contained document", () => {
  for (const name of ["vespara-lockup-primary.svg", "vespara-lockup-horizontal.svg"]) {
    const svg = readFileSync(join(HERE, name), "utf8")
    assert.match(svg, /vesparaThresholdLight/, name + " must include the symbol's threshold-light gradient")
    assert.equal((svg.match(/<path /g) || []).length >= 9, true, name + " must include both the archway paths and the letterform paths")
  }
})

test("monochrome variants exist for gold, cream, and solid-mask use", () => {
  const wordmarkGold = readFileSync(join(HERE, "vespara-wordmark.svg"), "utf8")
  const wordmarkCream = readFileSync(join(HERE, "vespara-wordmark-cream.svg"), "utf8")
  const wordmarkMono = readFileSync(join(HERE, "vespara-wordmark-mono.svg"), "utf8")
  assert.match(wordmarkGold, /#d6b274/)
  assert.match(wordmarkCream, /#f8f0dc/)
  assert.match(wordmarkMono, /#ffffff/)
})

test("app-icon prep exists: square-safe transparent, dark-field preview, and mono mask-ready", () => {
  const square = readFileSync(join(HERE, "vespara-icon-square.svg"), "utf8")
  const darkField = readFileSync(join(HERE, "vespara-icon-dark-field.svg"), "utf8")
  const monoMask = readFileSync(join(HERE, "vespara-icon-mono-mask.svg"), "utf8")
  assert.doesNotMatch(square, /<rect[^>]*width="256"[^>]*fill/, "the transparent square variant must not paint a full-bleed background rect")
  assert.match(darkField, /<rect/, "the dark-field variant should paint a background field")
  assert.match(monoMask, /fill="#ffffff"/, "the mono mask variant should be a solid single color")
})

// -- Palette consolidation ------------------------------------------------

test("index.css declares the six named Vespara palette variables, reusing existing hex values", () => {
  const css = readFileSync(join(HERE, "../../index.css"), "utf8")
  for (const varName of [
    "--vespara-void", "--vespara-sanctuary-deep", "--vespara-threshold-gold",
    "--vespara-horizon-gold", "--vespara-starlight", "--vespara-quiet-teal",
  ]) {
    assert.match(css, new RegExp(varName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + ":\\s*#"))
  }
})
