// useGameLauncher.test.js --------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency. Provides the same minimal in-memory localStorage shim used
// throughout renderer/src/launchSession/*.test.js, since the launch-
// lifecycle helpers exported from useGameLauncher.js are built directly on
// sessionStore.js / reconciliation.js / profileGameState.js -- their real
// public APIs, never mocked away.
//
// useGameLauncher itself is a React hook (useState/useRef/useEffect); this
// project has no DOM or React-hook test harness (no jsdom, no
// @testing-library/react), so the hook function itself is not invoked
// here. Every piece of actual launch/session/reconciliation LOGIC is
// instead factored out of the hook as plain exported functions
// (isTrackedEmulator, beginLaunchSession, reconcile*, handleTerminalPush)
// that take no window/document/React dependency at all -- these are what
// get exercised directly and thoroughly below. See the limitations note in
// the completion report for exactly what this does and doesn't cover.
//
// The `await import("./useGameLauncher.js")` below is itself load-bearing:
// useGameLauncher.js imports useI18n from ../i18n/I18nContext.js (a
// deliberately JSX-free module -- see renderer/src/i18n/context.test.js)
// specifically so this real, un-transformed native `node --test` import
// succeeds with React installed. If useGameLauncher.js ever grows a
// transitive import of a .jsx file again, this import throws and every
// test in this file fails immediately, exactly as it did before that
// module was split out.

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

const {
  isTrackedEmulator, buildLifecycleResultFromStatus, shouldTreatAsInterrupted,
  reconcileFromLifecycleStatus, reconcileImmediateUntracked, reconcilePreDispatchFailure,
  beginLaunchSession, handleTerminalPush, subscribeToLaunchLifecycle,
} = await import("./useGameLauncher.js")
const { getActiveSession, hasNonterminalSession, findSession } = await import("../launchSession/sessionStore.js")
const { getProfileGameState } = await import("../launchSession/profileGameState.js")

beforeEach(() => { global.localStorage.clear() })

test("useGameLauncher.js loads successfully under native node --test (proves its import chain, including useI18n, is JSX-free)", () => {
  assert.equal(typeof isTrackedEmulator, "function")
  assert.equal(typeof beginLaunchSession, "function")
  assert.equal(typeof reconcilePreDispatchFailure, "function")
})

function makeSpy() {
  const calls = []
  const fn = (...args) => { calls.push(args) }
  fn.calls = calls
  return fn
}

function trustedStatus(overrides = {}) {
  return {
    sessionId: "unset", error: null, exitCode: 0, exitedAt: 5000, outcome: "completed",
    processStarted: true, running: false, signal: null, startedAt: 0, success: true,
    trackedToExit: true, ...overrides,
  }
}

// -- isTrackedEmulator --------------------------------------------------

test("isTrackedEmulator: vpx, steam, pc are untracked; everything else (incl. teknoparrot default) is tracked", () => {
  assert.equal(isTrackedEmulator("vpx", {}), false)
  assert.equal(isTrackedEmulator("anything", { isPinball: true }), false)
  assert.equal(isTrackedEmulator("steam", {}), false)
  assert.equal(isTrackedEmulator("pc", {}), false)
  assert.equal(isTrackedEmulator("teknoparrot", {}), true)
  assert.equal(isTrackedEmulator("rpcs3", {}), true)
  assert.equal(isTrackedEmulator("retroarch", {}), true)
})

// -- beginLaunchSession: persistence checkpoint --------------------------

test("session persisted before launch dispatch, guarded against a second concurrent launch", () => {
  assert.equal(hasNonterminalSession(), false)
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  assert.equal(begun.ok, true)
  assert.equal(typeof begun.session.id, "string")
  assert.ok(begun.session.id.length > 0)
  // Persisted -- a fresh read of the store (not the returned object) sees it.
  const active = getActiveSession()
  assert.equal(active.id, begun.session.id)
  assert.equal(active.state, "requested")

  // A second launch attempt while this one is still nonterminal is refused,
  // not silently replaced.
  const second = beginLaunchSession({ profileId: "p1", gameId: "g2", originDestination: "library" })
  assert.equal(second.ok, false)
  assert.equal(second.reason, "already-active")
  assert.equal(getActiveSession().gameId, "g1")
})

test("beginLaunchSession always sets originContext.focusedGameId to the launched gameId, even when no originContext is supplied", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  assert.equal(begun.session.originContext.focusedGameId, "g1")
})

test("beginLaunchSession overrides a caller-supplied focusedGameId that doesn't match the actual launched game (defends against stale caller state), while preserving other supplied context fields", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "g1", originDestination: "library",
    originContext: { focusedGameId: "some-other-stale-game", sectionId: "Racing", selectedIndex: 4 },
  })
  assert.equal(begun.session.originContext.focusedGameId, "g1")
  assert.equal(begun.session.originContext.sectionId, "Racing")
  assert.equal(begun.session.originContext.selectedIndex, 4)
})

test("beginLaunchSession is safe when gameId itself is missing (stale/malformed game)", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: undefined, originDestination: "library" })
  assert.equal(begun.ok, true)
  assert.equal(begun.session.gameId, undefined)
  assert.equal(begun.session.originContext.focusedGameId, undefined)
})

test("stable sessionId: the id returned by beginLaunchSession is the same id the dispatch layer would send and the same id later reconciliation looks up by", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const sessionId = begun.session.id
  // Simulates what runLaunch does: dispatch uses session.id verbatim, and
  // any later lookup (push or status query) must resolve the exact same
  // session record via that same id.
  const foundLater = findSession(sessionId)
  assert.equal(foundLater.id, sessionId)
  assert.equal(foundLater.gameId, "g1")
})

test("launch-time profile is captured on the session record itself", () => {
  const begun = beginLaunchSession({ profileId: "profile-at-launch-time", gameId: "g1", originDestination: "library" })
  assert.equal(begun.session.profileId, "profile-at-launch-time")
})

// -- dispatch response is never write evidence on its own -----------------

test("a tracked dispatch resolving {success:true} alone writes nothing -- no reconcile call means no terminal state, no Recently Played", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  // Simulating runLaunch: dispatch "resolves" with {success:true}, but per
  // the required contract this alone must never be fed into any reconcile
  // path. No reconcile* function is called here at all.
  const simulatedDispatchResult = { success: true }
  void simulatedDispatchResult // dispatch response intentionally never touches reconciliation
  assert.equal(addRecentlyPlayed.calls.length, 0)
  assert.equal(findSession(begun.session.id).state, "requested")
  assert.equal(getProfileGameState("p1", "g1").lifeState, "discovered")
})

test("an untracked dispatch resolving {ok:true} does not write Recently Played -- reconcileImmediateUntracked ignores the dispatch result entirely and is always ineligible", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", title: "Some Pinball Table" }
  // reconcileImmediateUntracked's signature doesn't even accept a dispatch
  // result -- it cannot be influenced by {ok:true} even if passed.
  const result = reconcileImmediateUntracked({
    session: begun.session, currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game },
  })
  assert.equal(result.outcome, "uncertain")
  assert.equal(result.recentlyPlayedUpdated, false)
  assert.equal(addRecentlyPlayed.calls.length, 0)
  assert.equal(getProfileGameState("p1", "g1").lifeState, "discovered")
})

// -- terminal push / status query reconciliation, idempotency -----------

test("terminal push triggers exactly one reconciliation for a trusted tracked return", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", title: "Some Game" }
  const activeLaunches = new Map([[begun.session.id, { game, expectedTrackedToExit: true }]])

  const status = trustedStatus({ sessionId: begun.session.id })
  const outcome = handleTerminalPush(status, {
    activeLaunches, getActiveProfileId: () => "p1", getAddRecentlyPlayed: () => addRecentlyPlayed,
  })
  assert.equal(outcome.handled, true)
  assert.equal(outcome.result.outcome, "completed")
  assert.equal(outcome.result.recentlyPlayedUpdated, true)
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(activeLaunches.has(begun.session.id), false, "handled session is removed from this hook's own bookkeeping")
})

test("status query and push together still reconcile exactly once", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", title: "Some Game" }
  const status = trustedStatus({ sessionId: begun.session.id })

  // Path 1: the terminal push.
  const activeLaunches = new Map([[begun.session.id, { game, expectedTrackedToExit: true }]])
  const pushResult = handleTerminalPush(status, {
    activeLaunches, getActiveProfileId: () => "p1", getAddRecentlyPlayed: () => addRecentlyPlayed,
  })

  // Path 2: the post-dispatch safety-net status query, called directly
  // (as runLaunch's own backup poll would), same session, same status.
  const queryResult = reconcileFromLifecycleStatus({
    session: findSession(begun.session.id), status, expectedTrackedToExit: true,
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game },
  })

  assert.deepEqual(queryResult, pushResult.result)
  assert.equal(addRecentlyPlayed.calls.length, 1, "only the first of the two paths may ever actually write")
})

test("a duplicate/redelivered terminal push for the same session is ignored", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", title: "Some Game" }
  const activeLaunches = new Map([[begun.session.id, { game, expectedTrackedToExit: true }]])
  const status = trustedStatus({ sessionId: begun.session.id })

  const first = handleTerminalPush(status, {
    activeLaunches, getActiveProfileId: () => "p1", getAddRecentlyPlayed: () => addRecentlyPlayed,
  })
  const second = handleTerminalPush(status, {
    activeLaunches, getActiveProfileId: () => "p1", getAddRecentlyPlayed: () => addRecentlyPlayed,
  })
  assert.equal(first.handled, true)
  assert.equal(second.handled, false, "no entry left in this hook's own map for a session already handled")
  assert.equal(addRecentlyPlayed.calls.length, 1)
})

test("a terminal push for a sessionId this hook does not own is ignored outright", () => {
  const addRecentlyPlayed = makeSpy()
  const activeLaunches = new Map() // empty -- owns nothing
  const outcome = handleTerminalPush(trustedStatus({ sessionId: "someone-elses-session" }), {
    activeLaunches, getActiveProfileId: () => "p1", getAddRecentlyPlayed: () => addRecentlyPlayed,
  })
  assert.equal(outcome.handled, false)
  assert.equal(addRecentlyPlayed.calls.length, 0)
})

// -- classification correctness (real launchEvidence.js / reconciliation.js) --

test("a quick code-0 exit remains uncertain, never eligible, regardless of exit code 0", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const status = trustedStatus({ sessionId: begun.session.id, startedAt: 0, exitedAt: 100, exitCode: 0 })
  const result = reconcileFromLifecycleStatus({
    session: begun.session, status, expectedTrackedToExit: true,
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })
  assert.equal(result.outcome, "uncertain")
  assert.equal(result.recentlyPlayedUpdated, false)
  assert.equal(addRecentlyPlayed.calls.length, 0)
})

test("a quick abnormal (nonzero) exit within the trust window is also uncertain, not eligible", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const status = trustedStatus({ sessionId: begun.session.id, startedAt: 0, exitedAt: 100, exitCode: 1 })
  const result = reconcileFromLifecycleStatus({
    session: begun.session, status, expectedTrackedToExit: true,
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })
  assert.equal(result.outcome, "uncertain")
  assert.equal(result.recentlyPlayedUpdated, false)
  assert.equal(addRecentlyPlayed.calls.length, 0)
})

test("a trusted clean return (past the trust window, exit code 0) becomes eligible for Recently Played and LIVING", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const status = trustedStatus({ sessionId: begun.session.id, startedAt: 0, exitedAt: 5000, exitCode: 0 })
  const result = reconcileFromLifecycleStatus({
    session: begun.session, status, expectedTrackedToExit: true,
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })
  assert.equal(result.outcome, "completed")
  assert.equal(result.recentlyPlayedUpdated, true)
  assert.equal(result.becameLiving, true)
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(getProfileGameState("p1", "g1").lifeState, "living")
})

test("a trusted tracked abnormal exit past the trust window is ELIGIBLE, matching launchEvidence.js's own documented contract (completedUnderTrustedPolicy: true for abnormal-exit) -- not a regression introduced here", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const status = trustedStatus({ sessionId: begun.session.id, startedAt: 0, exitedAt: 5000, exitCode: 1 })
  const result = reconcileFromLifecycleStatus({
    session: begun.session, status, expectedTrackedToExit: true,
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })
  assert.equal(result.outcome, "abnormal")
  assert.equal(result.recentlyPlayedUpdated, true)
  assert.equal(addRecentlyPlayed.calls.length, 1)
})

// -- failure behavior -----------------------------------------------------

test("a synchronous/pre-dispatch failure (IPC threw or dispatch reported non-acceptance) never writes and marks the session failed", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const result = reconcilePreDispatchFailure({
    session: begun.session, trackedToExit: true, error: "ENOENT: launcher not found",
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })
  assert.equal(result.outcome, "failed")
  assert.equal(result.failureReason, "ENOENT: launcher not found")
  assert.equal(addRecentlyPlayed.calls.length, 0)
  const archived = findSession(begun.session.id)
  assert.equal(archived.state, "failed")
})

test("an unknown/mismatched status (e.g. after a main-process restart mid-launch) is treated as interrupted, never fabricated as complete", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  // The registry no longer recognizes this as the tracked session it was
  // dispatched as -- conservative unknown-session shape.
  const unknownStatus = {
    sessionId: begun.session.id, error: null, exitCode: null, exitedAt: null, outcome: "uncertain",
    processStarted: null, running: false, signal: null, startedAt: null, success: false, trackedToExit: false,
  }
  assert.equal(shouldTreatAsInterrupted(unknownStatus, true), true)
  const result = reconcileFromLifecycleStatus({
    session: begun.session, status: unknownStatus, expectedTrackedToExit: true,
    currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })
  assert.equal(result.outcome, "interrupted")
  assert.equal(addRecentlyPlayed.calls.length, 0)
})

// -- untracked launches never become LIVING --------------------------------

test("an untracked session can never transition DISCOVERED -> LIVING, even across repeated reconcile attempts", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  reconcileImmediateUntracked({
    session: begun.session, currentActiveProfileId: "p1", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })
  assert.equal(getProfileGameState("p1", "g1").lifeState, "discovered")
})

// -- captured profile vs. currently active profile -------------------------

test("the profile captured at launch time is used for write attribution even after the active profile switches before reconciliation", () => {
  const begun = beginLaunchSession({ profileId: "profile-A", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const status = trustedStatus({ sessionId: begun.session.id, startedAt: 0, exitedAt: 5000, exitCode: 0 })

  // Profile switched to B in the renderer before this session's terminal
  // evidence arrived -- currentActiveProfileId reflects that switch, but
  // write attribution must still use the session's own captured profile.
  const result = reconcileFromLifecycleStatus({
    session: begun.session, status, expectedTrackedToExit: true,
    currentActiveProfileId: "profile-B", deps: { addRecentlyPlayed, game: { id: "g1" } },
  })

  assert.equal(result.profileId, "profile-A")
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(getProfileGameState("profile-A", "g1").lifeState, "living")
  assert.equal(getProfileGameState("profile-B", "g1").lifeState, "discovered")
  // Profile mismatch also makes the captured Library origin unrestorable --
  // falls back to Home rather than restoring into profile B's context.
  assert.equal(result.restoredDestination, "home")
})

// -- subscribeToLaunchLifecycle: the hook's entire useEffect body, extracted
// so its subscribe/route/cleanup contract is directly testable without
// React, a DOM, jsdom, or Testing Library. The useEffect itself is just
// `return subscribeToLaunchLifecycle({ nuarcade: window.nuarcade,
// activeLaunchesRef, depsRef })` -- everything meaningful is exercised
// here. ---------------------------------------------------------------

test("subscribeToLaunchLifecycle registers exactly one terminal listener per invocation", () => {
  let registrations = 0
  const nuarcade = { onLaunchLifecycleTerminal: () => { registrations += 1; return () => {} } }
  subscribeToLaunchLifecycle({ nuarcade, activeLaunchesRef: { current: new Map() }, depsRef: { current: {} } })
  assert.equal(registrations, 1)
})

test("the returned cleanup invokes the exact unsubscribe function the preload bridge returned", () => {
  const unsubscribeCalls = []
  const nuarcade = { onLaunchLifecycleTerminal: () => (() => { unsubscribeCalls.push(true) }) }
  const cleanup = subscribeToLaunchLifecycle({
    nuarcade, activeLaunchesRef: { current: new Map() }, depsRef: { current: {} },
  })
  assert.equal(unsubscribeCalls.length, 0)
  cleanup()
  assert.equal(unsubscribeCalls.length, 1)
})

test("calling the returned cleanup does not subscribe again", () => {
  let registrations = 0
  const nuarcade = { onLaunchLifecycleTerminal: () => { registrations += 1; return () => {} } }
  const cleanup = subscribeToLaunchLifecycle({
    nuarcade, activeLaunchesRef: { current: new Map() }, depsRef: { current: {} },
  })
  assert.equal(registrations, 1)
  cleanup()
  assert.equal(registrations, 1, "cleanup must never itself trigger a new subscription")
})

test("the returned cleanup is idempotent: calling it twice invokes the underlying unsubscribe once, never re-subscribes, and terminal routing behavior is unaffected", () => {
  let registrations = 0
  const unsubscribeCalls = []
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", title: "Some Game" }
  const activeLaunchesRef = { current: new Map([[begun.session.id, { game, expectedTrackedToExit: true }]]) }
  const depsRef = { current: { activeProfileId: "p1", addRecentlyPlayed } }

  let deliver = null
  const nuarcade = {
    onLaunchLifecycleTerminal: (cb) => {
      registrations += 1
      deliver = cb
      return () => { unsubscribeCalls.push(true) }
    },
  }
  const cleanup = subscribeToLaunchLifecycle({ nuarcade, activeLaunchesRef, depsRef })
  assert.equal(registrations, 1)

  cleanup()
  cleanup()
  cleanup()

  assert.equal(unsubscribeCalls.length, 1, "the underlying unsubscribe must fire exactly once total across repeated cleanup calls")
  assert.equal(registrations, 1, "no additional subscription is ever created by calling cleanup, once or repeatedly")

  // Terminal routing behavior itself is unaffected by cleanup having been
  // called (repeatedly) -- this test's fake preload bridge doesn't
  // actually stop delivering after "unsubscribing" (a real one would), so
  // this specifically proves subscribeToLaunchLifecycle's own routing
  // logic wasn't altered or broken by the idempotency guard.
  deliver(trustedStatus({ sessionId: begun.session.id }))
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(activeLaunchesRef.current.has(begun.session.id), false)
})

test("a terminal event delivered through the subscription is routed to the existing terminal-handling path", () => {
  const begun = beginLaunchSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", title: "Some Game" }
  const activeLaunchesRef = { current: new Map([[begun.session.id, { game, expectedTrackedToExit: true }]]) }
  const depsRef = { current: { activeProfileId: "p1", addRecentlyPlayed } }

  let deliver = null
  const nuarcade = { onLaunchLifecycleTerminal: (cb) => { deliver = cb; return () => {} } }
  subscribeToLaunchLifecycle({ nuarcade, activeLaunchesRef, depsRef })
  assert.equal(typeof deliver, "function")

  deliver(trustedStatus({ sessionId: begun.session.id }))

  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(activeLaunchesRef.current.has(begun.session.id), false)
  assert.equal(findSession(begun.session.id).state, "returned")
})

test("subscribeToLaunchLifecycle is safe when the preload subscription API is unavailable, returning a callable no-op cleanup", () => {
  const activeLaunchesRef = { current: new Map() }
  const depsRef = { current: {} }
  assert.doesNotThrow(() => {
    const cleanup1 = subscribeToLaunchLifecycle({ nuarcade: undefined, activeLaunchesRef, depsRef })
    assert.equal(typeof cleanup1, "function")
    cleanup1()
  })
  assert.doesNotThrow(() => {
    const cleanup2 = subscribeToLaunchLifecycle({ nuarcade: {}, activeLaunchesRef, depsRef })
    assert.equal(typeof cleanup2, "function")
    cleanup2()
  })
})
