// productionResolution.test.js -----------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// PlayerSelect.jsx/.module.css cannot be imported here (JSX and CSS -- see
// entryFlowPolish.test.js's own limitations note). These tests read the
// real committed source text and the real bundled files, and assert on
// the current approved production background specifically: the supplied
// plate remains at its native 1672x941 dimensions and is bundled locally
// without conversion, base64 encoding, or a remote dependency.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = join(HERE, "assets")
const BG_ASSET_PATH = join(ASSETS_DIR, "traveler-recognition-observatory.png")

// A PNG's width/height live in the IHDR chunk, immediately after the
// 8-byte signature and the 4-byte chunk length + 4-byte "IHDR" tag --
// i.e. big-endian uint32s at byte offsets 16 and 20. No image library
// needed for a single, well-known, fixed-offset read.
function readPngDimensions(path) {
  const buf = readFileSync(path)
  assert.equal(buf.readUInt32BE(0), 0x89504e47, "must be a real PNG (signature check)")
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

// -- 1. The approved production image retains its native dimensions --------

test("the bundled gateway background retains the approved 1672x941 source dimensions", () => {
  assert.ok(existsSync(BG_ASSET_PATH))
  const { width, height } = readPngDimensions(BG_ASSET_PATH)
  assert.equal(width, 1672)
  assert.equal(height, 941)
})

test("the production plate is effectively 16:9 and suitable for the existing cover treatment", () => {
  const { width, height } = readPngDimensions(BG_ASSET_PATH)
  assert.ok(Math.abs(width / height - 16 / 9) < 0.001)
})

// -- 3. The approved source remains a full production PNG ------------------

test("the approved background is a substantial production PNG, not a placeholder", () => {
  const stat = statSync(BG_ASSET_PATH)
  assert.ok(stat.size > 1_000_000)
})

// -- 4. The lettered reference mockup was never added to the repository -----

test("the lettered gateway reference mockup (approved-visual-reference-only) was never added anywhere in the repository", () => {
  const jsx = readFileSync(join(HERE, "PlayerSelect.jsx"), "utf8")
  const css = readFileSync(join(HERE, "PlayerSelect.module.css"), "utf8")
  assert.doesNotMatch(jsx, /gateway_lettered_reference/i)
  assert.doesNotMatch(css, /gateway_lettered_reference/i)
  assert.ok(!existsSync(join(ASSETS_DIR, "gateway_lettered_reference_3840x2160.png")))
  const files = readdirSync(ASSETS_DIR)
  assert.ok(!files.some(f => /lettered/i.test(f)), "no lettered-reference file of any name may live in PlayerSelect/assets")
})

// -- 5 & 6. Remains locally bundled, not base64/remote -----------------------

test("the background remains a locally bundled ES module import, never base64 or a remote URL", () => {
  const jsx = readFileSync(join(HERE, "PlayerSelect.jsx"), "utf8")
  assert.match(jsx, /import gatewayBackground from '\.\/assets\/traveler-recognition-observatory\.png'/)
  assert.doesNotMatch(jsx, /data:image\/(png|jpe?g|gif|webp);base64/i)
  assert.doesNotMatch(jsx, /https?:\/\/[^"'\s]*\.(png|jpe?g|gif|webp)/i)
})

// -- 8. Production build resolves the image successfully --------------------
// (Exercised directly by the milestone's validation run -- `npm run build`
// inside renderer/ -- see the milestone report for the confirmed build
// output referencing the new hashed 4K asset by its larger file size.)

test("the import path used in source resolves to a real file on disk (sanity check for the build-resolution claim above)", () => {
  const jsx = readFileSync(join(HERE, "PlayerSelect.jsx"), "utf8")
  const importMatch = jsx.match(/import gatewayBackground from '(\.\/assets\/[^']+)'/)
  assert.ok(importMatch)
  assert.ok(existsSync(join(HERE, importMatch[1])))
})
