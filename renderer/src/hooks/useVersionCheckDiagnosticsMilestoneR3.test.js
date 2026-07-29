// useVersionCheckDiagnosticsMilestoneR3.test.js ---------------------------
// Regression coverage for the "Update Now flashes and resets, no files, no
// errors" investigation. Root cause (confirmed from source): a failed
// downloadUpdate/installUpdate call already set `installError` inside this
// hook, but nothing rendered it (Settings.jsx never destructured it) and
// nothing in the main-process updater ever logged the real caught error --
// every failure path returned a generic string with zero console output.
// The combination made every real failure indistinguishable from the next
// and invisible in packaged-build stdout.
//
// This file proves: (1) the click itself is now logged, so "did the button
// even fire" is answerable from stdout; (2) both failure branches log the
// real reason via console.error before/alongside setting installError;
// (3) nothing logged anywhere in this hook ever references the install
// token value itself (only success/failure booleans and human-readable
// reason strings) -- diagnostic logging must never leak the token.
//
// Source-level, not a runtime import: useVersionCheck.js uses React hooks
// and cannot be imported directly under Node's native ESM loader, matching
// every other test in this file's sibling, useVersionCheck.test.js.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(HERE, "useVersionCheck.js"), "utf8").replace(/\r\n/g, "\n")

test("clicking Update Now is logged with the remote version, before any IPC call", () => {
  const clickIdx = src.indexOf("const handleUpdateNow = async () => {")
  assert.ok(clickIdx > -1)
  const logIdx = src.indexOf("console.log('[useVersionCheck] Update Now clicked'", clickIdx)
  const downloadCallIdx = src.indexOf("window.nuarcade.downloadUpdate({ version: remoteVersion })", clickIdx)
  assert.ok(logIdx > clickIdx && logIdx < downloadCallIdx, "the click log must appear before the downloadUpdate call")
  assert.match(src.slice(logIdx, logIdx + 80), /remoteVersion/)
})

test("a failed downloadUpdate logs the real reason via console.error before installError is set", () => {
  const block = src.slice(src.indexOf("const dl = await window.nuarcade.downloadUpdate"), src.indexOf("console.log('[useVersionCheck] downloadUpdate succeeded"))
  assert.match(block, /const reason = \(dl && dl\.error\) \|\| 'Download failed'/)
  const errorLogIdx = block.indexOf("console.error('[useVersionCheck] downloadUpdate failed:', reason)")
  const setErrorIdx = block.indexOf("setInstallError(reason)")
  assert.ok(errorLogIdx > -1 && setErrorIdx > errorLogIdx, "the failure reason must be logged before (or alongside) setInstallError")
})

test("a failed installUpdate logs the real reason via console.error before installError is set", () => {
  const block = src.slice(src.indexOf("const inst = await window.nuarcade.installUpdate"), src.indexOf("} catch (e) {"))
  assert.match(block, /const reason = \(inst && inst\.error\) \|\| 'Install failed'/)
  const errorLogIdx = block.indexOf("console.error('[useVersionCheck] installUpdate failed:', reason)")
  const setErrorIdx = block.indexOf("setInstallError(reason)")
  assert.ok(errorLogIdx > -1 && setErrorIdx > errorLogIdx, "the failure reason must be logged before (or alongside) setInstallError")
})

test("an unexpected throw is logged via console.error with only the error message, before installError is set", () => {
  const catchBlock = src.slice(src.indexOf("} catch (e) {\n      console.error"), src.indexOf("  }\n\n  return {"))
  assert.match(catchBlock, /console\.error\('\[useVersionCheck\] Update Now threw an unexpected error:', e && e\.message\)/)
  const errorLogIdx = catchBlock.indexOf("console.error(")
  const setErrorIdx = catchBlock.indexOf("setInstallError(e.message)")
  assert.ok(errorLogIdx > -1 && setErrorIdx > errorLogIdx)
})

test("no console.log/console.error call in this hook ever references the install token value itself", () => {
  const logCalls = src.match(/console\.(log|error)\([^)]*\)/g) || []
  assert.ok(logCalls.length >= 4, "expected the new diagnostic log calls to be present")
  for (const call of logCalls) {
    assert.doesNotMatch(call, /\bdl\.token\b/, `token must never be logged: ${call}`)
    assert.doesNotMatch(call, /\btoken\b/, `token must never be logged: ${call}`)
  }
})

test("installError is still exposed from the hook's return value for Settings.jsx to render", () => {
  assert.match(src, /return \{[\s\S]*installError,?[\s\S]*\}/)
})
