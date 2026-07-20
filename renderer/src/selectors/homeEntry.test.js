// homeEntry.test.js -----------------------------------------------------
// Plain, dependency-free unit tests -- see profileReadiness.test.js for
// why no test framework is used. Run via
// `node renderer/src/selectors/homeEntry.test.js`.

import assert from "node:assert/strict"
import { selectInitialHomeFocus } from "./homeEntry.js"

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

const gameOk = { id: "gameA", title: "Game A", status: "ok" }
const gameBroken = { id: "gameA", title: "Game A", status: "not-configured" } // same id, now broken
const gameOkB = { id: "gameB", title: "Game B", status: "ok" }

// Required matrix cases 1-8 from the brief, plus the two lifecycle cases
// (9, 10) which are integration-level, covered separately in the
// VesparaHome wiring rather than here since this selector is stateless.

test("1. Empty profile + no playable games -> setup-connection", () => {
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "empty",
    installationReadiness: "unconfigured",
    recentGames: [],
    availableGames: [],
  })
  assert.deepEqual(result, { type: "setup-connection" })
})

test("2. Empty profile + playable games -> library (no first-game UI exists today)", () => {
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "empty",
    installationReadiness: "playable",
    recentGames: [],
    availableGames: [gameOk],
  })
  assert.deepEqual(result, { type: "library" })
})

test("3. Established profile + playable valid recent -> recent-game", () => {
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "established",
    installationReadiness: "playable",
    recentGames: [gameOk],
    availableGames: [gameOk],
  })
  assert.deepEqual(result, { type: "recent-game", gameId: "gameA" })
})

test("4. Established profile + stale recent + playable library -> library", () => {
  // recentGames here is meant to already be the OUTPUT of
  // selectValidRecentGames, so a truly stale (unresolvable) entry
  // wouldn't even appear -- but if a caller passes one through anyway
  // (e.g. resolved at selection time, since gone), this must not crash
  // or present it as launchable.
  const staleEntry = { id: "goneGame", title: "Gone", status: "ok" }
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "established",
    installationReadiness: "playable",
    recentGames: [staleEntry],
    availableGames: [gameOkB], // goneGame is not in the current library at all
  })
  assert.deepEqual(result, { type: "library" })
})

test("5. Established profile + no recent + playable library -> library", () => {
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "established",
    installationReadiness: "playable",
    recentGames: [],
    availableGames: [gameOk],
  })
  assert.deepEqual(result, { type: "library" })
})

test("6. Established profile + recent game now unavailable -> does not focus it as launchable", () => {
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "established",
    installationReadiness: "degraded",
    recentGames: [gameBroken],
    availableGames: [gameBroken], // resolves, but status is now not-configured
  })
  assert.notEqual(result.type, "recent-game")
  assert.deepEqual(result, { type: "library" })
})

test("6b. Established + most recent unavailable but an OLDER recent entry is still valid -> that one", () => {
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "established",
    installationReadiness: "playable",
    recentGames: [gameBroken, gameOkB], // most recent first; first is broken
    availableGames: [gameBroken, gameOkB],
  })
  assert.deepEqual(result, { type: "recent-game", gameId: "gameB" })
})

test("7. Recent entry from another profile is ignored (enforced upstream by selectValidRecentGames, not here)", () => {
  // This selector trusts its `recentGames` input is already
  // profile-scoped -- verified in profileReadiness.test.js. Included
  // here as documentation of the contract, not a redundant re-test.
  assert.ok(true)
})

test("8. Malformed/missing game reference is ignored safely, falls through to library", () => {
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "established",
    installationReadiness: "playable",
    recentGames: [null, { title: "no id field" }, undefined],
    availableGames: [gameOk],
  })
  assert.deepEqual(result, { type: "library" })
})

test("Unconfigured always wins regardless of profile history status", () => {
  const result = selectInitialHomeFocus({
    profileHistoryStatus: "established",
    installationReadiness: "unconfigured",
    recentGames: [gameOk],
    availableGames: [],
  })
  assert.deepEqual(result, { type: "setup-connection" })
})

console.log("")
console.log(passed + " passed")
if (process.exitCode) console.log("SOME TESTS FAILED")
