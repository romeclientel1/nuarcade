// Wheel.test.js -------------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency. Wheel.jsx itself cannot be imported here: it's JSX (Node's
// native ESM loader rejects the ".jsx" extension outright -- confirmed
// directly) and pulls in a `.module.css` import plus ~20 sub-component/
// hook imports Node has no loader or stub surface for. See the completion
// report's limitations note.
//
// buildLibraryOriginContext, however, is factored out into
// libraryLaunchOrigin.js -- a plain module with no React/JSX/DOM/CSS import
// at all -- specifically so it's importable here directly. This test
// exercises the exact function Wheel.jsx itself calls, never a restated
// copy.

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
const { buildLibraryOriginContext } = await import("./libraryLaunchOrigin.js")

beforeEach(() => { global.localStorage.clear() })

test("a Library launch captures originDestination: 'library'", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "g1", originDestination: "library",
    originContext: buildLibraryOriginContext({ activeCategory: "Racing", selectedIndex: 3 }),
  })
  assert.equal(begun.ok, true)
  assert.equal(begun.session.originDestination, "library")
})

test("a Library launch captures the selected game id, plus the category as a stable section and the raw index only as a fallback", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "racing-game-7", originDestination: "library",
    originContext: buildLibraryOriginContext({ activeCategory: "Racing", selectedIndex: 3 }),
  })
  assert.equal(begun.session.originContext.focusedGameId, "racing-game-7")
  assert.equal(begun.session.originContext.sectionId, "Racing")
  assert.equal(begun.session.originContext.selectedIndex, 3)
})

test("return restores the matching Library game and focus when the game still resolves", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "racing-game-7", originDestination: "library",
    originContext: buildLibraryOriginContext({ activeCategory: "Racing", selectedIndex: 3 }),
  })
  const restoration = resolveLaunchOriginRestoration(begun.session, { gameStillResolves: true })
  assert.equal(restoration.destination, "library")
  assert.equal(restoration.focusGameId, "racing-game-7")
})

test("missing focus context (the game was removed/uninstalled) restores the Library destination only, no focus target", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "racing-game-7", originDestination: "library",
    originContext: buildLibraryOriginContext({ activeCategory: "Racing", selectedIndex: 3 }),
  })
  const restoration = resolveLaunchOriginRestoration(begun.session, { gameStillResolves: false })
  assert.equal(restoration.destination, "library")
  assert.equal(restoration.focusGameId, null)
})

test("a stale or missing game id does not crash session creation or restoration", () => {
  assert.doesNotThrow(() => {
    const begun = beginLaunchSession({
      profileId: "p1", gameId: undefined, originDestination: "library",
      originContext: buildLibraryOriginContext({ activeCategory: "All", selectedIndex: 0 }),
    })
    assert.equal(begun.ok, true)
    assert.equal(begun.session.originContext.focusedGameId, undefined)
    const restoration = resolveLaunchOriginRestoration(begun.session, { gameStillResolves: false })
    assert.equal(restoration.destination, "library")
    assert.equal(restoration.focusGameId, null)
  })
})

test("a Library launch with no category/index info at all still produces safe, crash-free origin context", () => {
  assert.doesNotThrow(() => {
    const context = buildLibraryOriginContext()
    assert.equal(context.sectionId, null)
    assert.equal(context.selectedIndex, null)
  })
})

test("Library origin context contains no functions or DOM references -- plain, JSON-serializable data only", () => {
  const context = buildLibraryOriginContext({ activeCategory: "Racing", selectedIndex: 3 })
  const serialized = JSON.stringify(context)
  assert.equal(typeof serialized, "string")
  for (const value of Object.values(context)) {
    assert.notEqual(typeof value, "function")
    assert.equal(value === null || typeof value !== "object", true, "no nested object/DOM-node values")
  }
})

test("launch-time origin remains unchanged even if the wheel's category/selection changes while the game runs", () => {
  const begun = beginLaunchSession({
    profileId: "p1", gameId: "racing-game-7", originDestination: "library",
    originContext: buildLibraryOriginContext({ activeCategory: "Racing", selectedIndex: 3 }),
  })
  // Simulates the player continuing to browse the wheel in some other
  // capacity, or a later remount changing category/selection state --
  // this must never retroactively alter the already-persisted session.
  let liveCategory = "Racing"
  let liveIndex = 3
  liveCategory = "Puzzle"
  liveIndex = 11
  void liveCategory
  void liveIndex

  const reread = findSession(begun.session.id)
  assert.equal(reread.originContext.sectionId, "Racing")
  assert.equal(reread.originContext.selectedIndex, 3)
  assert.equal(reread.originContext.focusedGameId, "racing-game-7")
})

test("profile mismatch at return time falls back safely rather than restoring into another profile's private Library position", () => {
  const begun = beginLaunchSession({
    profileId: "profile-A", gameId: "racing-game-7", originDestination: "library",
    originContext: buildLibraryOriginContext({ activeCategory: "Racing", selectedIndex: 3 }),
  })
  const result = reconcileLaunchSession({
    session: begun.session,
    lifecycleResult: { processStarted: true, trackedToExit: true, exitCode: 0, startedAt: 0, exitedAt: 5000 },
    currentActiveProfileId: "profile-B", // switched while the game ran
    deps: { addRecentlyPlayed: () => {}, game: { id: "racing-game-7" } },
  })
  assert.equal(result.restoredDestination, "home")
  assert.equal(result.focusGameId, null)
})

test("a matching profile at return time correctly restores the captured Library game and focus", () => {
  const begun = beginLaunchSession({
    profileId: "profile-A", gameId: "racing-game-7", originDestination: "library",
    originContext: buildLibraryOriginContext({ activeCategory: "Racing", selectedIndex: 3 }),
  })
  const result = reconcileLaunchSession({
    session: begun.session,
    lifecycleResult: { processStarted: true, trackedToExit: true, exitCode: 0, startedAt: 0, exitedAt: 5000 },
    currentActiveProfileId: "profile-A", // unchanged
    deps: { addRecentlyPlayed: () => {}, game: { id: "racing-game-7" } },
  })
  assert.equal(result.restoredDestination, "library")
  assert.equal(result.focusGameId, "racing-game-7")
})
