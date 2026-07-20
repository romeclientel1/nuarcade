// profileReadiness.test.js -------------------------------------------
// Plain, dependency-free unit tests -- no test framework is configured
// anywhere in this repository (root or renderer package.json), so these
// run directly via `node renderer/src/selectors/profileReadiness.test.js`
// using Node's built-in assert module. If the project adopts a real test
// runner later, these translate directly (each `test(...)` block maps to
// one `it`/`test` case).

import assert from "node:assert/strict"
import {
  selectValidRecentGames,
  selectProfileHistoryStatus,
  selectInstallationReadiness,
  PROFILE_TAG_FIELD,
} from "./profileReadiness.js"

let passed = 0
function test(name, fn) {
  try {
    fn()
    passed++
    console.log("PASS - " + name)
  } catch (e) {
    console.log("FAIL - " + name)
    console.log("  " + e.message)
    process.exitCode = 1
  }
}

const gameA = { id: "gameA", title: "Game A", status: "ok" }
const gameB = { id: "gameB", title: "Game B", status: "ok" }
const gameBroken = { id: "gameBroken", title: "Broken Game", status: "not-configured" }

function tagged(profileId, game, extra = {}) {
  return { ...game, [PROFILE_TAG_FIELD]: profileId, ...extra }
}

// ---- selectValidRecentGames ----

test("selectValidRecentGames: filters to only the given profile's tagged entries", () => {
  const recent = [tagged("p1", gameA), tagged("p2", gameB)]
  const result = selectValidRecentGames("p1", recent, [gameA, gameB])
  assert.equal(result.length, 1)
  assert.equal(result[0].id, "gameA")
})

test("selectValidRecentGames: ignores entries from another profile", () => {
  const recent = [tagged("p2", gameA)]
  const result = selectValidRecentGames("p1", recent, [gameA])
  assert.equal(result.length, 0)
})

test("selectValidRecentGames: ignores untagged (legacy/pre-migration) entries", () => {
  const recent = [gameA] // no PROFILE_TAG_FIELD at all
  const result = selectValidRecentGames("p1", recent, [gameA])
  assert.equal(result.length, 0)
})

test("selectValidRecentGames: ignores entries that no longer resolve to a known game", () => {
  const recent = [tagged("p1", { id: "deletedGame", title: "Gone" })]
  const result = selectValidRecentGames("p1", recent, [gameA]) // deletedGame not in availableGames
  assert.equal(result.length, 0)
})

test("selectValidRecentGames: ignores malformed entries safely", () => {
  const recent = [null, undefined, "not an object", tagged("p1", gameA)]
  const result = selectValidRecentGames("p1", recent, [gameA])
  assert.equal(result.length, 1)
})

test("selectValidRecentGames: no profileId returns empty, does not throw", () => {
  assert.deepEqual(selectValidRecentGames(null, [tagged("p1", gameA)], [gameA]), [])
})

test("selectValidRecentGames: does not mutate its inputs", () => {
  const recent = [tagged("p1", gameA)]
  const recentCopy = JSON.parse(JSON.stringify(recent))
  const gamesCopy = JSON.parse(JSON.stringify([gameA]))
  selectValidRecentGames("p1", recent, [gameA])
  assert.deepEqual(recent, recentCopy)
  assert.deepEqual([gameA], gamesCopy)
})

// ---- selectProfileHistoryStatus ----

test("selectProfileHistoryStatus: null profile is empty", () => {
  assert.equal(selectProfileHistoryStatus(null, [tagged("p1", gameA)], [gameA]), "empty")
})

test("selectProfileHistoryStatus: profile with no tagged entries is empty", () => {
  assert.equal(selectProfileHistoryStatus({ id: "p1" }, [tagged("p2", gameA)], [gameA]), "empty")
})

test("selectProfileHistoryStatus: profile with at least one valid tagged entry is established", () => {
  assert.equal(selectProfileHistoryStatus({ id: "p1" }, [tagged("p1", gameA)], [gameA]), "established")
})

test("selectProfileHistoryStatus: does not treat installation-wide history as personal (regression guard)", () => {
  // A profile that has NEVER played anything itself, on an installation
  // where OTHER profiles have lots of history, must still be empty.
  const recent = [tagged("p2", gameA), tagged("p3", gameB), tagged("guest", gameA)]
  assert.equal(selectProfileHistoryStatus({ id: "p1" }, recent, [gameA, gameB]), "empty")
})

// ---- selectInstallationReadiness ----

test("selectInstallationReadiness: playable when at least one game has a usable status", () => {
  assert.equal(selectInstallationReadiness([gameBroken, gameA], []), "playable")
})

test("selectInstallationReadiness: unconfigured when no games and no history", () => {
  assert.equal(selectInstallationReadiness([], []), "unconfigured")
})

test("selectInstallationReadiness: unconfigured when all games broken and no history", () => {
  assert.equal(selectInstallationReadiness([gameBroken], []), "unconfigured")
})

test("selectInstallationReadiness: degraded when all games broken but installation has history", () => {
  assert.equal(selectInstallationReadiness([gameBroken], [gameA]), "degraded")
})

test("selectInstallationReadiness: path-missing counts as not-playable, same as not-configured", () => {
  const g = { id: "g", status: "path-missing" }
  assert.equal(selectInstallationReadiness([g], []), "unconfigured")
})

console.log("")
console.log(passed + " passed")
if (process.exitCode) console.log("SOME TESTS FAILED")
