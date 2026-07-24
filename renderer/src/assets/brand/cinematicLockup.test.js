// cinematicLockup.test.js -----------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// vespara-lockup-cinematic.svg is new production brand art added at
// Vespara Traveler Recognition Milestone 1.2 (Production Resolution and
// Cinematic Identity), for IntroVideo's lower-left corner mark only --
// see brandAssets.test.js for the Brand Identity Milestone 2 inventory
// this file intentionally does not join (it's not a general-purpose
// asset). These tests assert this specific file is vector-only, contains
// the doorway/beacon symbol, the VESPARA wordmark, and the world-facing
// "THE SANCTUARY" line. The symbol/wordmark reuse the same production
// geometry as vespara-lockup-horizontal.svg; the subordinate line uses
// matching path-built letterforms rather than an external font.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(HERE, "vespara-lockup-cinematic.svg"), "utf8")
const horizontal = readFileSync(join(HERE, "vespara-lockup-horizontal.svg"), "utf8")

test("is well-formed, vector-only SVG with a clean viewBox", () => {
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(svg, /viewBox="[\d.\s]+"/)
})

test("contains no embedded raster, base64 data, remote URL, or external font reference", () => {
  assert.doesNotMatch(svg, /<image[\s>]/i)
  assert.doesNotMatch(svg, /data:image\/(png|jpe?g|gif|webp);base64/i)
  assert.doesNotMatch(svg, /data:font/i)
  const withoutNamespaceDecls = svg.replace(/xmlns(:\w+)?="https?:\/\/[^"]*"/g, "")
  assert.doesNotMatch(withoutNamespaceDecls, /https?:\/\//i)
  assert.doesNotMatch(svg, /@font-face/i)
  assert.doesNotMatch(svg, /font-family/i)
})

test("contains the recognizable nested doorway/beacon symbol (the same two-archway + threshold-light geometry as the simplified symbol)", () => {
  assert.match(svg, /vesparaThresholdLight/, "must include the symbol's threshold-light gradient")
  assert.match(svg, /M36,240 L36,96 L100,18 L164,96 L164,240/, "must include the outer archway path")
  assert.match(svg, /M68,240 L68,118 L100,66 L132,118 L132,240/, "must include the inner archway path")
})

test("spells VESPARA via 7 distinct letterform paths, and THE SANCTUARY via 12 subordinate paths", () => {
  assert.match(svg, /aria-label="Vespara — The Sanctuary"/)
  assert.doesNotMatch(svg, /by NuArcade/i)
  // 2 archway paths + 7 VESPARA letterform paths + 12 world-identity
  // letterform paths (T-H-E-S-A-N-C-T-U-A-R-Y) = 21 total paths.
  const pathCount = (svg.match(/<path /g) || []).length
  assert.equal(pathCount, 21)
})

test("is visually subordinate for the endorsement, but slightly less so than the utility lockup -- deliberately tuned for large-scale legibility, still restrained", () => {
  const opacityMatch = svg.match(/scale\(0\.331589[\d]*\)" opacity="([\d.]+)"/)
  assert.ok(opacityMatch, "expected the endorsement group's opacity attribute")
  const opacity = Number(opacityMatch[1])
  assert.ok(opacity > 0.82, "must read stronger than the 0.82 utility-lockup endorsement at cinematic scale")
  assert.ok(opacity < 1, "must remain visually subordinate to the wordmark, never full-strength")
})

test("uses a subtle drop-shadow filter for contrast, not a glowing box or bloom", () => {
  assert.match(svg, /<feDropShadow[^>]*flood-opacity="0\.[0-9]+"/)
  assert.doesNotMatch(svg, /feGaussianBlur[^>]*stdDeviation="(1[0-9]|[2-9][0-9])/, "blur radius must stay subtle, not a bloom")
  assert.doesNotMatch(svg, /<rect[^>]*fill="url\(/i, "must not paint a filled/gradient backing rect inside the SVG itself (any backing lives in CSS as a page-level treatment)")
})

test("reuses vespara-lockup-horizontal.svg's exact archway and VESPARA wordmark geometry -- not a redrawn/disconnected primary mark", () => {
  // \s before d=" so id="..." attributes (e.g. the gradient/filter ids)
  // are never mistaken for a path's d attribute.
  const extractPaths = (source) => [...source.matchAll(/\sd="([^"]+)"/g)].map(m => m[1])
  const cinematicPaths = extractPaths(svg)
  const horizontalPaths = extractPaths(horizontal)
  assert.ok(cinematicPaths.length > horizontalPaths.length)
  // The first two paths are the archway; the next seven spell VESPARA.
  for (let i = 0; i < 9; i++) {
    assert.equal(cinematicPaths[i], horizontalPaths[i], `path #${i} geometry must be byte-identical to the existing production lockup`)
  }
})

test("is non-trivial (actually draws something, not an empty shell)", () => {
  const hasDrawing = /<path[\s>]/.test(svg) || /<circle[\s>]/.test(svg)
  assert.ok(hasDrawing)
})
