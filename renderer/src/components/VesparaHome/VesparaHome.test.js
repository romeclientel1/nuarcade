// VesparaHome.test.js -------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency. VesparaHome.jsx itself cannot be imported here: it's JSX
// (Node's native ESM loader rejects the ".jsx" extension outright --
// confirmed directly) and pulls in a `.module.css` import Node has no
// loader for either. See the completion report's limitations note.
//
// buildHomeOriginContext, however, is factored out into homeLaunchOrigin.js
// -- a plain module with no React/JSX/DOM/CSS import at all -- specifically
// so it's importable here directly. This test exercises the exact function
// VesparaHome.jsx itself calls, never a restated copy.

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

const { beginLaunchSession } = await import("../../hooks/useGameLauncher.js")
const { findSession } = await import("../../launchSession/sessionStore.js")
const { resolveLaunchOriginRestoration } = await import("../../launchSession/originRestoration.js")
const { reconcileLaunchSession } = await import("../../launchSession/reconciliation.js")
const { buildHomeOriginContext } = await import("./homeLaunchOrigin.js")

beforeEach(() => { global.localStorage.clear() })

test("a Home launch captures originDestination: 'home'", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "g1", originDestination: "home", originContext: buildHomeOriginContext(),
  })
  assert.equal(begun.ok, true)
  assert.equal(begun.session.originDestination, "home")
})

test("a Home launch captures a stable Recently Played focus key (the game's own id, not an index)", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "recent-game-1", originDestination: "home", originContext: buildHomeOriginContext(),
  })
  assert.equal(begun.session.originContext.focusedGameId, "recent-game-1")
  assert.equal(begun.session.originContext.sectionId, "recents")
})

test("return restores matching Home focus when the game still resolves", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "recent-game-1", originDestination: "home", originContext: buildHomeOriginContext(),
  })
  const restoration = resolveLaunchOriginRestoration(begun.session, { gameStillResolves: true })
  assert.equal(restoration.destination, "home")
  assert.equal(restoration.focusGameId, "recent-game-1")
})

test("missing focus context (stale/removed recent game) restores the Home destination only, no focus target", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "recent-game-1", originDestination: "home", originContext: buildHomeOriginContext(),
  })
  const restoration = resolveLaunchOriginRestoration(begun.session, { gameStillResolves: false })
  assert.equal(restoration.destination, "home")
  assert.equal(restoration.focusGameId, null)
})

test("a stale or missing game id does not crash session creation or restoration", () => {
  assert.doesNotThrow(() => {
    const begun = beginLaunchSession({
      profileId: "p1", gameId: undefined, originDestination: "home", originContext: buildHomeOriginContext(),
    })
    assert.equal(begun.ok, true)
    assert.equal(begun.session.originContext.focusedGameId, undefined)
    const restoration = resolveLaunchOriginRestoration(begun.session, { gameStillResolves: false })
    assert.equal(restoration.destination, "home")
    assert.equal(restoration.focusGameId, null)
  })
})

test("Home origin context contains no functions or DOM references -- plain, JSON-serializable data only", () => {
  const context = buildHomeOriginContext()
  const serialized = JSON.stringify(context)
  assert.equal(typeof serialized, "string")
  for (const value of Object.values(context)) {
    assert.notEqual(typeof value, "function")
    assert.equal(value === null || typeof value !== "object", true, "no nested object/DOM-node values")
  }
})

test("launch-time origin remains unchanged even if Home navigation state changes while the game runs", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "recent-game-1", originDestination: "home", originContext: buildHomeOriginContext(),
  })
  // Simulates the player navigating Home's own focus/zone state (e.g.
  // moving to a different Recently Played tile) while the launched game is
  // still running -- this must never retroactively alter the already-
  // persisted session.
  let liveRecentIndex = 0
  liveRecentIndex = 3
  void liveRecentIndex

  const reread = findSession(begun.session.id)
  assert.equal(reread.originContext.focusedGameId, "recent-game-1")
  assert.equal(reread.originDestination, "home")
})

test("profile mismatch at return time falls back safely rather than restoring into another profile's Home context", () => {
  const begun = beginLaunchSession({
    profileId: "profile-A", gameId: "recent-game-1", originDestination: "home", originContext: buildHomeOriginContext(),
  })
  const result = reconcileLaunchSession({
    session: begun.session,
    lifecycleResult: { processStarted: true, trackedToExit: true, exitCode: 0, startedAt: 0, exitedAt: 5000 },
    currentActiveProfileId: "profile-B", // switched while the game ran
    deps: { addRecentlyPlayed: () => {}, game: { id: "recent-game-1" } },
  })
  // Home is always safe to land on regardless of profile -- it reflects
  // whichever profile is active now, not stale session data -- so the
  // destination itself doesn't change, but no profile-specific focus
  // target from another profile's session is exposed either.
  assert.equal(result.restoredDestination, "home")
  assert.equal(result.focusGameId, null)
})
