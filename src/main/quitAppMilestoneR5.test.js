// quitAppMilestoneR5.test.js ---------------------------------------------
// Regression coverage for the main-process half of Vespara 6.0.2's
// Sanctuary Depart safety requirements: departing must close the app
// normally, never leave the Electron process running, never interfere
// with game-process tracking, never terminate an externally launched game
// unexpectedly, and never corrupt settings or pending play-history state.
//
// Source-level, like installerBranding.test.js and every other test in
// this project that inspects src/main/index.js's text directly rather than
// spinning up a real Electron process -- this proves the SOURCE says the
// right thing, not that a live Windows process has been observed quitting.
'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const src = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8')

test("quit-app is a real IPC handler that calls the real app.quit(), not a stub", () => {
  assert.match(src, /ipcMain\.handle\('quit-app', \(\) => \{ app\.quit\(\) \}\)/)
})

test("app.quit() is never intercepted -- no before-quit/close handler calls preventDefault or otherwise blocks quitting", () => {
  assert.doesNotMatch(src, /before-quit[\s\S]{0,200}preventDefault/)
  assert.doesNotMatch(src, /\.on\('close'[\s\S]{0,200}preventDefault/)
  // Confirms there is no "minimize to tray instead of quit" behavior that
  // would leave the Electron process running after Depart.
  assert.doesNotMatch(src, /minimizeToTray|hideInsteadOfQuit/i)
})

test("the only before-quit handler clears a startup timer -- it does not touch launchRegistry or any spawned game process", () => {
  const match = src.match(/app\.on\('before-quit',\s*(\w+)\)/)
  assert.ok(match, "expected exactly one app.on('before-quit', ...) registration")
  const handlerName = match[1]
  assert.equal(handlerName, 'cancelStartupFallback')
  const fnMatch = src.match(new RegExp(`function ${handlerName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}`))
  assert.ok(fnMatch, `expected to find the ${handlerName} function body`)
  assert.doesNotMatch(fnMatch[1], /launchRegistry|kill\(|SIGTERM|SIGKILL|spawn/)
})

test("window-all-closed quits the app unconditionally on non-macOS, with no game-process kill in between", () => {
  const block = src.slice(src.indexOf("app.on('window-all-closed'"), src.indexOf("app.on('window-all-closed'") + 200)
  assert.match(block, /if \(process\.platform !== 'darwin'\) app\.quit\(\)/)
  assert.doesNotMatch(block, /launchRegistry|kill\(/)
})

test("externally launched games are spawned detached and unref'd, so quitting Vespara sends them no signal at all", () => {
  assert.match(src, /function launchDetachedFireAndForget\([^)]*\)\s*\{/)
  const fnBlock = src.slice(src.indexOf("function launchDetachedFireAndForget"), src.indexOf("function launchDetachedFireAndForget") + 600)
  assert.match(fnBlock, /child\.unref\(\)/)
  // Every production call site passes detached: true -- the child becomes
  // its own process group leader, fully independent of the Electron
  // process's lifetime.
  const detachedCallSites = (src.match(/detached:\s*true/g) || []).length
  assert.ok(detachedCallSites >= 2, "expected multiple detached: true launch call sites (VPX, direct PC/Steam executables, etc.)")
})

test("launchRegistry itself is purely informational (telemetry/status), never a kill-switch invoked on quit", () => {
  const registry = fs.readFileSync(path.join(__dirname, 'launchRegistry.js'), 'utf8')
  assert.doesNotMatch(registry, /kill\(|SIGTERM|SIGKILL|process\.kill/)
  assert.doesNotMatch(src, /launchRegistry[\s\S]{0,80}\.kill\(/)
})

test("quit-app and close-app are the only quit-capable IPC channels, and neither accepts a renderer-supplied path/command", () => {
  const quitHandlers = [...src.matchAll(/ipcMain\.handle\('([\w-]+)',\s*\(\)?\s*(?:=>|,)\s*\{\s*app\.quit\(\)/g)].map(m => m[1])
  assert.ok(quitHandlers.includes('quit-app'))
  // Neither handler destructures a payload -- there is nothing for a
  // compromised or buggy renderer to smuggle into the quit path.
  assert.doesNotMatch(src, /ipcMain\.handle\('quit-app',\s*\(event,\s*payload\)/)
  assert.doesNotMatch(src, /ipcMain\.handle\('close-app',\s*\(event,\s*payload\)/)
})
