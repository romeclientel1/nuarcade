// updateFailureBannerMilestoneR3.test.js -----------------------------------
// Regression coverage for the "Update Now flashes and resets" bug: a failed
// downloadUpdate/installUpdate call already produced `installError` inside
// useVersionCheck.js, but Settings.jsx never destructured or rendered it --
// so `installing` flipped true -> false with no visible trace of what went
// wrong (a "flash and reset"). This proves the fix: installError is read
// from the hook and rendered as a stable, independent banner with a retry
// action, rather than merely toggling `installing` (see
// useVersionCheckDiagnosticsMilestoneR3.test.js for the hook-side logging
// half of this fix).
//
// Source-level, not a runtime render: Settings.jsx imports a .module.css
// file and isn't a plain-JS module, matching every other *.test.js in this
// directory (see soundSettings.test.js's own note on the same constraint).

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
// Normalized to LF up front so no downstream check can accidentally depend
// on the checkout's line-ending style (a CRLF checkout, e.g. a Windows CI
// runner with core.autocrlf enabled, previously broke every check in this
// file that searched for a literal "\n"-joined multi-line fragment).
const jsx = readFileSync(join(HERE, "Settings.jsx"), "utf8").replace(/\r\n/g, "\n")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")

test("Settings destructures installError from useVersionCheck", () => {
  assert.match(jsx, /const \{ updateAvailable, remoteVersion, handleUpdateNow, installing, progress, installError \} = useVersionCheck\(\)/)
})

// Finds the end of a `{cond && (<div>...</div>)}` block starting at
// `fromIdx`, tolerant of indentation width and line-ending style. The
// banner's own JSX contains a `})}"` substring (from the t(...) call's
// object argument) that a naive search for the literal ")}" would match
// too early, truncating the block before the retry button -- so this
// anchors on the block's actual `</div>` closing tag instead, which is
// unambiguous here (each conditional in this file renders exactly one
// top-level <div>...</div>). Matching on `<\/div>\s*\)\}` (rather than a
// literal "\n" + a fixed number of spaces) means neither the indentation
// depth nor CRLF vs LF checkouts can break this.
function findConditionalBlockEnd(fromIdx) {
  const CLOSE = /<\/div>\s*\)\}/
  const rest = jsx.slice(fromIdx)
  const m = CLOSE.exec(rest)
  assert.ok(m, `expected to find a </div> ... )} close after index ${fromIdx}`)
  return fromIdx + m.index + m[0].length
}

// The banner's JSX contains its own "})}" (from the t(...) call) which a
// naive search for the literal ")}" would match too early, truncating the
// block before the retry button -- see findConditionalBlockEnd above.
function failureBannerBlock() {
  const idx = jsx.indexOf("{!installing && installError && (")
  assert.ok(idx > -1, "expected a standalone installError banner condition")
  const closeIdx = findConditionalBlockEnd(idx)
  return { idx, block: jsx.slice(idx, closeIdx) }
}

test("the failure banner is rendered independently of updateAvailable, so it survives a cleared remote-version state", () => {
  const { idx } = failureBannerBlock()
  // Must not be nested inside the `updateAvailable &&` block above it.
  const updateAvailableIdx = jsx.indexOf("{updateAvailable && (")
  assert.ok(updateAvailableIdx > -1, "expected the updateAvailable banner condition")
  const updateAvailableBlockEnd = findConditionalBlockEnd(updateAvailableIdx)
  assert.ok(idx > updateAvailableBlockEnd, "the failure banner must be a sibling, not nested inside the updateAvailable banner")
})

test("the failure banner shows the real reason text and offers a retry that reuses handleUpdateNow", () => {
  const { block } = failureBannerBlock()
  assert.match(block, /t\("settings\.updateFailed", \{ reason: installError \}\)/)
  assert.match(block, /onClick=\{handleUpdateNow\}/)
  assert.match(block, /t\("settings\.updateRetry"\)/)
})

test("the failure banner does not gate on `installing`, so it cannot be dismissed merely by the flash-reset toggle", () => {
  const { block } = failureBannerBlock()
  // The retry button itself must not disable on `installing` the way the
  // original Update Now button does -- a stuck installError state must
  // always remain actionable.
  assert.doesNotMatch(block, /disabled=\{installing\}/)
})

test("settings.updateFailed and settings.updateRetry exist in both locales", () => {
  for (const src of [en, es]) {
    assert.match(src, /"settings\.updateFailed":\s*"[^"]*\{reason\}[^"]*"/)
    assert.match(src, /"settings\.updateRetry":\s*"[^"]+"/)
  }
})
