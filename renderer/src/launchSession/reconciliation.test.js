// reconciliation.test.js ---------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency. Provides the same minimal in-memory localStorage shim used
// by sessionStore.test.js and profileGameState.test.js, since
// reconcileLaunchSession orchestrates both of those storage modules.

import { test, beforeEach } from "node:test"
import assert from "node:assert/strict"

function installLocalStorageShim() {
  const store = new Map()
  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
  }
}
installLocalStorageShim()

const { createSession, findInHistory } = await import("./sessionStore.js")
const { reconcileLaunchSession } = await import("./reconciliation.js")
const { getProfileGameState } = await import("./profileGameState.js")
const { PROFILE_TAG_FIELD } = await import("../selectors/profileReadiness.js")

beforeEach(() => { global.localStorage.clear() })

function eligibleLifecycle(exitCode = 0) {
  // startedAt/exitedAt 5000ms apart -- past the 4000ms trusted window.
  return { processStarted: true, trackedToExit: true, exitCode, startedAt: 0, exitedAt: 5000 }
}

function uncertainLifecycle() {
  // Tracked to exit, but only 100ms elapsed -- under the trusted window.
  return { processStarted: true, trackedToExit: true, exitCode: 0, startedAt: 0, exitedAt: 100 }
}

function failedBeforeStartLifecycle(error) {
  return { processStarted: false, trackedToExit: false, error }
}

function makeSpy() {
  const calls = []
  const fn = (...args) => { calls.push(args) }
  fn.calls = calls
  return fn
}

test("existing terminalResult returns idempotently with no duplicate writes", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", name: "Game One" }

  const first = reconcileLaunchSession({
    session, lifecycleResult: eligibleLifecycle(0),
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game },
  })

  // Simulate a duplicate delivery of the same terminal event -- same
  // session object, called through the exact same entry point again.
  const second = reconcileLaunchSession({
    session, lifecycleResult: eligibleLifecycle(0),
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game },
  })

  assert.deepEqual(second, first)
  assert.equal(addRecentlyPlayed.calls.length, 1, "Recently Played must not be written twice")

  // The profile-game-state transition must not fire a second time either.
  const state = getProfileGameState("p1", "g1")
  assert.equal(state.firstConfirmedPlayAt, state.lastConfirmedPlayAt)
})

test("eligible lifecycle updates profile-game state and Recently Played exactly once", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", name: "Game One" }

  const result = reconcileLaunchSession({
    session, lifecycleResult: eligibleLifecycle(0),
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game },
  })

  assert.equal(result.outcome, "completed")
  assert.equal(result.recentlyPlayedUpdated, true)
  assert.equal(result.becameLiving, true)
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(addRecentlyPlayed.calls[0][0][PROFILE_TAG_FIELD], "p1")

  const state = getProfileGameState("p1", "g1")
  assert.equal(state.lifeState, "living")
})

test("ineligible (uncertain) lifecycle updates neither profile-game state nor Recently Played", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", name: "Game One" }

  const result = reconcileLaunchSession({
    session, lifecycleResult: uncertainLifecycle(),
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game },
  })

  assert.equal(result.outcome, "uncertain")
  assert.equal(result.recentlyPlayedUpdated, false)
  assert.equal(result.becameLiving, false)
  assert.equal(addRecentlyPlayed.calls.length, 0)

  const state = getProfileGameState("p1", "g1")
  assert.equal(state.lifeState, "discovered")
})

test("ineligible (failed-before-start) lifecycle updates neither profile-game state nor Recently Played", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", name: "Game One" }

  const result = reconcileLaunchSession({
    session, lifecycleResult: failedBeforeStartLifecycle(),
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game },
  })

  assert.equal(result.outcome, "failed")
  assert.equal(result.recentlyPlayedUpdated, false)
  assert.equal(result.becameLiving, false)
  assert.equal(addRecentlyPlayed.calls.length, 0)

  const state = getProfileGameState("p1", "g1")
  assert.equal(state.lifeState, "discovered")
})

test("profile mismatch makes origin unrestorable, even though the game resolves and had a recorded focus", () => {
  const session = createSession({
    profileId: "pA", gameId: "g1", originDestination: "library",
    originContext: { focusedGameId: "g1" },
  })
  const game = { id: "g1", name: "Game One" }

  const mismatched = reconcileLaunchSession({
    session, lifecycleResult: eligibleLifecycle(0),
    currentActiveProfileId: "pB", deps: { game },
  })
  assert.equal(mismatched.restoredDestination, "home")
  assert.equal(mismatched.focusGameId, null)
})

test("matching profile restores the exact origin and focus when the game resolves", () => {
  const session = createSession({
    profileId: "pA", gameId: "g1", originDestination: "library",
    originContext: { focusedGameId: "g1" },
  })
  const game = { id: "g1", name: "Game One" }

  const matched = reconcileLaunchSession({
    session, lifecycleResult: eligibleLifecycle(0),
    currentActiveProfileId: "pA", deps: { game },
  })
  assert.equal(matched.restoredDestination, "library")
  assert.equal(matched.focusGameId, "g1")
})

test("forceInterrupted produces an interrupted outcome regardless of lifecycle data", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const addRecentlyPlayed = makeSpy()

  const result = reconcileLaunchSession({
    session, lifecycleResult: eligibleLifecycle(0), forceInterrupted: true,
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })

  assert.equal(result.outcome, "interrupted")
  assert.equal(result.becameLiving, false)
  assert.equal(result.recentlyPlayedUpdated, false)
  assert.equal(addRecentlyPlayed.calls.length, 0)
})

test("null lifecycle result produces interrupted outcome (live contract: treated the same as forceInterrupted, not classified as uncertain)", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })

  const result = reconcileLaunchSession({
    session, lifecycleResult: null,
    currentActiveProfileId: "p1", deps: {},
  })

  assert.equal(result.outcome, "interrupted")
  assert.equal(result.recentlyPlayedUpdated, false)
  assert.equal(result.becameLiving, false)
})

test("failureReason is omitted entirely when the lifecycle result carries no error", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const result = reconcileLaunchSession({
    session, lifecycleResult: failedBeforeStartLifecycle(),
    currentActiveProfileId: "p1", deps: {},
  })
  assert.equal("failureReason" in result, false)
})

test("failureReason is present when the lifecycle result supplies an error", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const result = reconcileLaunchSession({
    session, lifecycleResult: failedBeforeStartLifecycle("ENOENT: launcher not found"),
    currentActiveProfileId: "p1", deps: {},
  })
  assert.equal(result.failureReason, "ENOENT: launcher not found")
})

test("correct terminal session state mapping: eligible completion -> returned", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  reconcileLaunchSession({
    session, lifecycleResult: eligibleLifecycle(0),
    currentActiveProfileId: "p1", deps: {},
  })
  const archived = findInHistory(session.id)
  assert.equal(archived.state, "returned")
})

test("correct terminal session state mapping: failed-before-start -> failed", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  reconcileLaunchSession({
    session, lifecycleResult: failedBeforeStartLifecycle(),
    currentActiveProfileId: "p1", deps: {},
  })
  const archived = findInHistory(session.id)
  assert.equal(archived.state, "failed")
})

test("correct terminal session state mapping: forceInterrupted -> interrupted", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  reconcileLaunchSession({
    session, lifecycleResult: null, forceInterrupted: true,
    currentActiveProfileId: "p1", deps: {},
  })
  const archived = findInHistory(session.id)
  assert.equal(archived.state, "interrupted")
})

test("correct terminal session state mapping: uncertain evidence still archives as returned, not failed", () => {
  // Documents a real subtlety of the live contract: an uncertain outcome
  // is not eligible for Recently Played / LIVING, but it is not treated
  // as a hard failure either -- the session state distinguishes "genuinely
  // failed to start" from "we can't confirm what happened".
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  reconcileLaunchSession({
    session, lifecycleResult: uncertainLifecycle(),
    currentActiveProfileId: "p1", deps: {},
  })
  const archived = findInHistory(session.id)
  assert.equal(archived.state, "returned")
})

test("duplicate reconciliation returns the same stable result shape (no undefined-vs-missing key drift)", () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const first = reconcileLaunchSession({
    session, lifecycleResult: failedBeforeStartLifecycle(),
    currentActiveProfileId: "p1", deps: {},
  })
  const second = reconcileLaunchSession({
    session, lifecycleResult: failedBeforeStartLifecycle(),
    currentActiveProfileId: "p1", deps: {},
  })
  assert.deepEqual(Object.keys(first).sort(), Object.keys(second).sort())
  assert.deepEqual(second, first)
})
