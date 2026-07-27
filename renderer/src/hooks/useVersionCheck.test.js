// useVersionCheck.test.js ------------------------------------------------
// Committed regression test, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// useVersionCheck.js imports React (useState/useEffect), so it cannot be
// imported directly here -- same limitation documented throughout this
// project's other hook tests. This is a source-level structural
// assertion proving the one fact that actually matters: CURRENT_VERSION
// (displayed on the Intro/Attract-mode screens and used to decide
// whether an "update available" banner shows) matches the real
// application release version in package.json -- not a hardcoded
// literal that can silently drift stale across future version bumps,
// which is exactly what happened before this correction (CURRENT_VERSION
// was still "5.0.48" several releases after the app had moved on).

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(HERE, "useVersionCheck.js"), "utf8").replace(/\r\n/g, "\n")
const pkg = JSON.parse(readFileSync(join(HERE, "../../../package.json"), "utf8"))

test("CURRENT_VERSION matches the authoritative application release version in package.json", () => {
  const escapedVersion = pkg.version.replace(/\./g, "\\.")
  const pattern = new RegExp(`CURRENT_VERSION = "${escapedVersion}"`)
  assert.match(src, pattern, `expected CURRENT_VERSION to equal package.json's version (${pkg.version}), but it did not`)
})

// -- R0 Commit 5 (amended): the availability check itself is main-owned ----
// The hook must no longer fetch GitHub, parse release JSON, or construct
// any GitHub release/API URL itself -- it only asks the main process
// whether anything is newer than its own current version, and displays
// exactly what comes back.

test("the availability check calls window.nuarcade.checkForUpdate with only { currentVersion }, not a raw GitHub fetch", () => {
  assert.match(src, /window\.nuarcade\.checkForUpdate\(\{ currentVersion: CURRENT_VERSION \}\)/)
  assert.doesNotMatch(src, /fetch\(/)
})

test("the hook contains no GitHub release-API or asset-authority URLs or fields", () => {
  assert.doesNotMatch(src, /api\.github\.com/)
  assert.doesNotMatch(src, /releases\/latest/)
  assert.doesNotMatch(src, /releases\/tags/)
  assert.doesNotMatch(src, /browser_download_url/)
  assert.doesNotMatch(src, /downloadUrl/)
  assert.doesNotMatch(src, /installerPath/)
})

test("updateAvailable/remoteVersion are set only from the main process's own validated result fields", () => {
  assert.match(src, /result\.success && result\.updateAvailable && result\.version/)
  assert.match(src, /setRemoteVersion\(result\.version\)/)
})

test("downloadUpdate is called with only a version, never a downloadUrl or other asset-selection field", () => {
  assert.match(src, /window\.nuarcade\.downloadUpdate\(\{ version: remoteVersion \}\)/)
})

test("installUpdate is called with only the token returned by downloadUpdate, never an installerPath", () => {
  assert.match(src, /window\.nuarcade\.installUpdate\(\{ token: dl\.token \}\)/)
})

test("the hook never selects a release asset itself (no .exe/.setup asset-matching logic remains)", () => {
  assert.doesNotMatch(src, /\.assets\s*\|\|/)
  assert.doesNotMatch(src, /toLowerCase\(\)\.endsWith\('\.exe'\)/)
})

test("the manual 'view releases' fallback link is a plain repository URL, not a releases/API path", () => {
  const match = src.match(/window\.open\('([^']+)', '_blank'\)/)
  assert.ok(match, "expected to find the manual-download window.open call")
  assert.equal(match[1], 'https://github.com/romeclientel1/nuarcade')
})
