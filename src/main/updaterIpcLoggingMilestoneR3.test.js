// updaterIpcLoggingMilestoneR3.test.js ----------------------------------
// Source-level regression coverage for the IPC-boundary half of the
// "Update Now flashes and resets, nothing in stdout" fix. Confirms each of
// the three updater IPC handlers in src/main/index.js now logs its own
// invocation (so "did the click even reach the main process" is answerable
// from stdout in a packaged build), while never logging the install-update
// payload's token value. Source-level rather than a live ipcMain harness:
// the existing check-update/download-update/install-update IPC tests in
// index.test.js already exercise the handlers dynamically through the full
// electron-mock scaffold; this file only needs to prove the new logging
// statements exist at the right place and never reference `payload.token`.

'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const src = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')

function handlerBlock(channel) {
  const start = src.indexOf(`ipcMain.handle('${channel}',`)
  assert.ok(start > -1, `expected an ipcMain.handle('${channel}', ...) registration`)
  const end = src.indexOf("\n})", start) + 3
  return src.slice(start, end)
}

test("check-update handler logs invocation with currentVersion", () => {
  const block = handlerBlock('check-update')
  assert.match(block, /console\.log\('\[updater-ipc\] check-update invoked', \{ currentVersion: payload\.currentVersion \}\)/)
})

test("download-update handler logs invocation with only the version, never a token or path", () => {
  const block = handlerBlock('download-update')
  assert.match(block, /console\.log\('\[updater-ipc\] download-update invoked', \{ version: payload\.version \}\)/)
  assert.doesNotMatch(block, /console\.log\([^)]*token/)
  assert.doesNotMatch(block, /console\.log\([^)]*payload\.path/)
})

test("install-update handler logs invocation but never logs payload.token", () => {
  const block = handlerBlock('install-update')
  assert.match(block, /console\.log\('\[updater-ipc\] install-update invoked'\)/)
  assert.doesNotMatch(block, /console\.log\([^)]*payload\.token/)
  assert.doesNotMatch(block, /console\.log\([^)]*token:/)
})

test("all three handlers still reject malformed payloads before any logging of a bad shape's contents", () => {
  for (const channel of ['check-update', 'download-update', 'install-update']) {
    const block = handlerBlock(channel)
    assert.match(block, /if \(!isExactRequestShape\(payload, \[/)
    const rejectIdx = block.indexOf('Invalid request')
    const logIdx = block.indexOf("console.log('[updater-ipc]")
    assert.ok(rejectIdx > -1 && (logIdx === -1 || logIdx > rejectIdx), `${channel}: the invocation log must come after the shape check, not before it`)
  }
})
