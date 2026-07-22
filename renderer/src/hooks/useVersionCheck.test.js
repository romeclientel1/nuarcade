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

test("CURRENT_VERSION is compared directly against the fetched release tag (already stripped of a leading \"v\") -- no separate normalization needed here", () => {
  assert.match(src, /const tag\s*=\s*\(data\.tag_name \|\| ''\)\.replace\(\/\^v\/, ''\)/)
  assert.match(src, /if \(tag && tag !== CURRENT_VERSION\)/)
})
