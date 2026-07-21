// sessionStore.test.js ----------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency. Provides a minimal in-memory localStorage since plain Node
// (no DOM) doesn't have one -- this is a test-only shim, never shipped.

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
  createSession, updateSession, archiveSession,
  getActiveSession, hasNonterminalSession,
  findSession, findInHistory, generateSessionId,
  isTerminalState, _internal,
} = await import("./sessionStore.js")

beforeEach(() => { global.localStorage.clear() })

test("generateSessionId produces unique, non-empty ids", () => {
  const a = generateSessionId()
  const b = generateSessionId()
  assert.ok(a && a.length > 0)
  assert.ok(b && b.length > 0)
  assert.notEqual(a, b)
})

test("createSession persists a new session in 'requested' state", () => {
  const s = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  assert.equal(s.state, "requested")
  assert.equal(s.profileId, "p1")
  assert.equal(s.gameId, "g1")
  assert.equal(s.originDestination, "home")
  assert.equal(typeof s.id, "string")
  assert.ok(s.id.length > 0)
  assert.equal(s.version, 1)
})

test("getActiveSession returns the nonterminal session that was just created", () => {
  const s = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const active = getActiveSession()
  assert.equal(active.id, s.id)
})

test("session identity persists across a simulated remount (fresh read of the same storage)", () => {
  const s = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  // Simulate a remount: nothing in this module holds React/component
  // state, so a totally fresh call sequence must see the same session.
  const activeAfterRemount = getActiveSession()
  assert.equal(activeAfterRemount.id, s.id)
})

test("hasNonterminalSession is false with no session, true once one is created", () => {
  assert.equal(hasNonterminalSession(), false)
  createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  assert.equal(hasNonterminalSession(), true)
})

test("launch guard: createSession throws while a nonterminal session already exists, does not replace it", () => {
  const first = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  assert.throws(() => createSession({ profileId: "p1", gameId: "g2", originDestination: "home" }))
  // The original session must be untouched -- not silently replaced.
  const stillActive = getActiveSession()
  assert.equal(stillActive.id, first.id)
  assert.equal(stillActive.gameId, "g1")
})

test("a new launch cannot reuse an old session id -- ids are unique per createSession call", () => {
  const s1 = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  updateSession(s1.id, { state: "returned" })
  archiveSession(s1.id)
  const s2 = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  assert.notEqual(s1.id, s2.id)
})

test("updateSession applies a patch and bumps version", () => {
  const s = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const updated = updateSession(s.id, { state: "active", processStartedAt: 12345 })
  assert.equal(updated.state, "active")
  assert.equal(updated.processStartedAt, 12345)
  assert.equal(updated.version, 2)
})

test("duplicate/stale callback: updateSession with a mismatched id returns null, does not mutate", () => {
  const s = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const result = updateSession("some-other-stale-id", { state: "returned" })
  assert.equal(result, null)
  // The real active session must be untouched.
  const stillActive = getActiveSession()
  assert.equal(stillActive.state, "requested")
  assert.equal(stillActive.version, 1)
})

test("archiveSession moves a terminal session out of the active slot and into history", () => {
  const s = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  updateSession(s.id, { state: "returned" })
  const archived = archiveSession(s.id)
  assert.equal(archived, true)
  assert.equal(getActiveSession(), null)
  const inHistory = findInHistory(s.id)
  assert.ok(inHistory)
  assert.equal(inHistory.state, "returned")
})

test("archiveSession refuses to archive a nonterminal session", () => {
  const s = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  const archived = archiveSession(s.id)
  assert.equal(archived, false)
  // Still active, not archived.
  assert.ok(getActiveSession())
})

test("findSession locates a session whether it's active or already archived", () => {
  const s = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  assert.equal(findSession(s.id).id, s.id)
  updateSession(s.id, { state: "failed" })
  assert.equal(findSession(s.id).state, "failed")
  archiveSession(s.id)
  assert.equal(findSession(s.id).state, "failed")
})

test("after archiving, a new launch can proceed (guard clears correctly)", () => {
  const s1 = createSession({ profileId: "p1", gameId: "g1", originDestination: "home" })
  updateSession(s1.id, { state: "returned" })
  archiveSession(s1.id)
  assert.equal(hasNonterminalSession(), false)
  const s2 = createSession({ profileId: "p1", gameId: "g2", originDestination: "home" })
  assert.equal(s2.state, "requested")
})

test("terminal history is bounded, does not grow without limit", () => {
  for (let i = 0; i < _internal.TERMINAL_HISTORY_LIMIT + 10; i++) {
    const s = createSession({ profileId: "p1", gameId: "g" + i, originDestination: "home" })
    updateSession(s.id, { state: "returned" })
    archiveSession(s.id)
  }
  const raw = JSON.parse(global.localStorage.getItem(_internal.HISTORY_KEY))
  assert.ok(raw.length <= _internal.TERMINAL_HISTORY_LIMIT)
})

test("isTerminalState correctly classifies all known states", () => {
  assert.equal(isTerminalState("returned"), true)
  assert.equal(isTerminalState("failed"), true)
  assert.equal(isTerminalState("uncertain"), true)
  assert.equal(isTerminalState("interrupted"), true)
  assert.equal(isTerminalState("requested"), false)
  assert.equal(isTerminalState("active"), false)
  assert.equal(isTerminalState("exit-detected"), false)
  assert.equal(isTerminalState("reconciling"), false)
})

test("originContext round-trips through persistence intact", () => {
  const s = createSession({
    profileId: "p1", gameId: "g1", originDestination: "library",
    originContext: { focusedGameId: "g1" },
  })
  const reread = getActiveSession()
  assert.deepEqual(reread.originContext, { focusedGameId: "g1" })
})
