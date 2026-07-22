// startupRecovery.test.js --------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency. Same in-memory localStorage shim used throughout
// launchSession/*.test.js. Tests against the real sessionStore.js/
// reconciliation.js/profileGameState.js/originRestoration.js public APIs
// -- never mocked.

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
  recoverLaunchSession, buildPendingRestoration, resolvePendingRestoration,
  listPendingRecentlyPlayedCredits, completePendingRecentlyPlayedCredit,
  applyPendingRecentlyPlayedCredit,
} = await import("./startupRecovery.js")
const { createSession, getActiveSession, findInHistory } = await import("./sessionStore.js")
const { getProfileGameState } = await import("./profileGameState.js")
const { PROFILE_TAG_FIELD } = await import("../selectors/profileReadiness.js")

beforeEach(() => { global.localStorage.clear() })

function makeSpy() {
  const calls = []
  const fn = (...args) => { calls.push(args) }
  fn.calls = calls
  return fn
}

function stillRunningStatus(sessionId) {
  return {
    sessionId, error: null, exitCode: null, exitedAt: null, outcome: "uncertain",
    processStarted: true, running: true, signal: null, startedAt: 0, success: true, trackedToExit: true,
  }
}

function trustedTerminalStatus(sessionId, exitCode) {
  return {
    sessionId, error: null, exitCode, exitedAt: 5000, outcome: exitCode === 0 ? "completed" : "abnormal-exit",
    processStarted: true, running: false, signal: null, startedAt: 0, success: true, trackedToExit: true,
  }
}

function quickExitStatus(sessionId, exitCode) {
  return {
    sessionId, error: null, exitCode, exitedAt: 100, outcome: "uncertain",
    processStarted: true, running: false, signal: null, startedAt: 0, success: true, trackedToExit: true,
  }
}

function unknownStatus(sessionId) {
  return {
    sessionId, error: null, exitCode: null, exitedAt: null, outcome: "uncertain",
    processStarted: null, running: false, signal: null, startedAt: null, success: false, trackedToExit: false,
  }
}

// -- basic decision table --------------------------------------------------

test("no active session: recovery does nothing", async () => {
  const outcome = await recoverLaunchSession({})
  assert.equal(outcome.action, "none")
})

test("tracked, still-running session: preserved, not reconciled, no write", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const outcome = await recoverLaunchSession({
    deps: { addRecentlyPlayed, game: { id: "g1" } },
    getLaunchLifecycleStatus: async () => stillRunningStatus(session.id),
  })
  assert.equal(outcome.action, "preserved")
  assert.equal(addRecentlyPlayed.calls.length, 0)
  assert.ok(getActiveSession(), "session must remain nonterminal/active")
  assert.equal(getProfileGameState("p1", "g1").lifeState, "discovered")
})

test("trusted terminal clean return reconciles through the existing pipeline", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const outcome = await recoverLaunchSession({
    deps: { addRecentlyPlayed, game: { id: "g1" } },
    getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0),
  })
  assert.equal(outcome.action, "reconciled")
  assert.equal(outcome.result.outcome, "completed")
  assert.equal(outcome.result.recentlyPlayedUpdated, true)
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(getActiveSession(), null, "reconciled session must be archived, not left active")
  assert.equal(getProfileGameState("p1", "g1").lifeState, "living")
})

test("quick clean exit remains uncertain -- the existing quick-exit policy is preserved", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const outcome = await recoverLaunchSession({
    deps: { addRecentlyPlayed, game: { id: "g1" } },
    getLaunchLifecycleStatus: async () => quickExitStatus(session.id, 0),
  })
  assert.equal(outcome.result.outcome, "uncertain")
  assert.equal(outcome.result.recentlyPlayedUpdated, false)
  assert.equal(addRecentlyPlayed.calls.length, 0)
})

test("trusted abnormal exit past the trust window preserves the existing eligibility policy (still eligible)", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const outcome = await recoverLaunchSession({
    deps: { addRecentlyPlayed, game: { id: "g1" } },
    getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 1),
  })
  assert.equal(outcome.result.outcome, "abnormal")
  assert.equal(outcome.result.recentlyPlayedUpdated, true)
  assert.equal(addRecentlyPlayed.calls.length, 1)
})

test("unknown/conservative main-process status becomes interrupted, never completed, and never needs pending credit", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const outcome = await recoverLaunchSession({
    getLaunchLifecycleStatus: async () => unknownStatus(session.id),
  })
  assert.equal(outcome.action, "interrupted")
  assert.equal(outcome.result.outcome, "interrupted")
  assert.notEqual(outcome.result.outcome, "completed")
  assert.deepEqual(listPendingRecentlyPlayedCredits(), [])
})

test("unknown status never writes Recently Played or transitions to LIVING", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  await recoverLaunchSession({
    deps: { addRecentlyPlayed, game: { id: "g1" } },
    getLaunchLifecycleStatus: async () => unknownStatus(session.id),
  })
  assert.equal(addRecentlyPlayed.calls.length, 0)
  assert.equal(getProfileGameState("p1", "g1").lifeState, "discovered")
})

test("status query throwing does not crash startup -- resolves to a defined interrupted result instead", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await assert.doesNotReject(async () => {
    const outcome = await recoverLaunchSession({
      getLaunchLifecycleStatus: async () => { throw new Error("IPC unavailable") },
    })
    assert.equal(outcome.action, "interrupted")
    assert.equal(outcome.result.outcome, "interrupted")
    assert.ok(outcome.error instanceof Error)
  })
  assert.equal(getActiveSession(), null)
  void session
})

test("missing getLaunchLifecycleStatus entirely (no preload API) also resolves conservatively, not fatally", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const outcome = await recoverLaunchSession({})
  assert.equal(outcome.action, "interrupted")
  assert.equal(outcome.result.outcome, "interrupted")
  void session
})

test("a malformed persisted session (no id) is handled conservatively, no crash", async () => {
  await assert.doesNotReject(async () => {
    const outcome = await recoverLaunchSession({
      getActiveSessionImpl: () => ({ profileId: "p1", gameId: "g1" /* no id */ }),
      getLaunchLifecycleStatus: async () => { throw new Error("should never be called") },
    })
    assert.equal(outcome.action, "none")
  })
})

test("a completed/archived session is not recovered again on a later call", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const first = await recoverLaunchSession({
    getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0),
  })
  assert.equal(first.action, "reconciled")
  assert.ok(findInHistory(session.id))
  assert.equal(findInHistory(session.id).state, "returned")

  const second = await recoverLaunchSession({
    getLaunchLifecycleStatus: async () => { throw new Error("should never be called -- nothing active") },
  })
  assert.equal(second.action, "none")
})

// -- pending restoration: profile-null is not mismatch ---------------------

test("activeProfileId being null/unresolved at recovery time does not force Home -- pendingRestoration keeps the real captured destination", async () => {
  const session = createSession({
    profileId: "profile-A", gameId: "g1", originDestination: "library",
    originContext: { focusedGameId: "g1", sectionId: "Racing" },
  })
  const outcome = await recoverLaunchSession({
    getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0),
  })
  assert.equal(outcome.pendingRestoration.originDestination, "library")
  assert.equal(outcome.pendingRestoration.profileId, "profile-A")
  // The raw reconciliation result was computed under a null (unresolved)
  // profile, so IT falls back to "home" -- but pendingRestoration is built
  // from the session's own immutable captured fields, not from that
  // profile-blind result, so it still correctly says "library".
  assert.equal(outcome.result.restoredDestination, "home")
  assert.equal(outcome.pendingRestoration.originDestination, "library")
})

test("selecting the captured profile restores the original destination", () => {
  const pending = buildPendingRestoration({
    profileId: "profile-A", originDestination: "library", originContext: { focusedGameId: "g1" },
  })
  const restoration = resolvePendingRestoration(pending, {
    selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }],
  })
  assert.equal(restoration.destination, "library")
})

test("selecting a different profile falls back to Home", () => {
  const pending = buildPendingRestoration({
    profileId: "profile-A", originDestination: "library", originContext: { focusedGameId: "g1" },
  })
  const restoration = resolvePendingRestoration(pending, {
    selectedProfileId: "profile-B", profiles: [{ id: "profile-A" }, { id: "profile-B" }],
  })
  assert.equal(restoration.destination, "home")
  assert.equal(restoration.focusGameId, null)
})

test("a captured profile that no longer exists falls back to Home even if somehow re-selected", () => {
  const pending = buildPendingRestoration({
    profileId: "profile-A", originDestination: "library", originContext: { focusedGameId: "g1" },
  })
  const restoration = resolvePendingRestoration(pending, {
    selectedProfileId: "profile-A", profiles: [], // profile-A no longer exists
  })
  assert.equal(restoration.destination, "home")
  assert.equal(restoration.focusGameId, null)
})

test("guest sessions are treated as always-existing for restoration purposes", () => {
  const pending = buildPendingRestoration({
    profileId: "guest", originDestination: "library", originContext: { focusedGameId: "g1" },
  })
  const restoration = resolvePendingRestoration(pending, { selectedProfileId: "guest", profiles: [] })
  assert.equal(restoration.destination, "library")
})

test("no pendingRestoration at all resolves to the safe Home fallback", () => {
  const restoration = resolvePendingRestoration(null, { selectedProfileId: "profile-A", profiles: [] })
  assert.equal(restoration.destination, "home")
  assert.equal(restoration.focusGameId, null)
})

// -- pending Recently Played credit -----------------------------------------

test("eligible recovered return receives Recently Played credit exactly once when dependencies are available", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const outcome = await recoverLaunchSession({
    deps: { addRecentlyPlayed, game: { id: "g1", title: "Some Game" } },
    getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0),
  })
  assert.equal(outcome.result.recentlyPlayedUpdated, true)
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.deepEqual(listPendingRecentlyPlayedCredits(), [], "no pending entry when credit was applied directly")
})

test("an eligible return is not silently dropped when dependencies are unavailable -- session is finalized and a pending credit is recorded instead", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const outcome = await recoverLaunchSession({
    // no deps at all -- App.jsx's real production shape
    getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0),
  })
  assert.equal(outcome.action, "reconciled")
  assert.equal(outcome.result.outcome, "completed")
  assert.equal(outcome.result.recentlyPlayedUpdated, false)
  // Session lifecycle is still finalized -- it must not be left dangling
  // nonterminal forever, blocking future launches.
  assert.equal(getActiveSession(), null)
  assert.equal(findInHistory(session.id).state, "returned")
  // DISCOVERED -> LIVING is unaffected by the missing deps.
  assert.equal(getProfileGameState("p1", "g1").lifeState, "living")
  // Recently Played credit itself is preserved, not dropped.
  const pending = listPendingRecentlyPlayedCredits()
  assert.equal(pending.length, 1)
  assert.equal(pending[0].profileId, "p1")
  assert.equal(pending[0].gameId, "g1")
  assert.equal(pending[0].launchSessionId, session.id)
})

test("later dependency resolution completes pending credit exactly once, attributed to the originally captured profile", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  assert.equal(listPendingRecentlyPlayedCredits().length, 1)

  const addRecentlyPlayed = makeSpy()
  const game = { id: "g1", title: "Some Game" }

  const applied = completePendingRecentlyPlayedCredit("g1", { game, addRecentlyPlayed })
  assert.equal(applied.applied, true)
  assert.equal(applied.profileId, "p1")
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(addRecentlyPlayed.calls[0][0].id, "g1")
  assert.equal(listPendingRecentlyPlayedCredits().length, 0, "credit is removed from the pending queue once applied")

  // Calling again for the same gameId is a safe no-op -- already applied.
  const second = completePendingRecentlyPlayedCredit("g1", { game, addRecentlyPlayed })
  assert.equal(second.applied, false)
  assert.equal(addRecentlyPlayed.calls.length, 1, "credit is never applied twice")
})

test("completePendingRecentlyPlayedCredit never attributes to the currently active profile, only the captured one", async () => {
  const session = createSession({ profileId: "profile-A", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  const addRecentlyPlayed = makeSpy()
  // Nothing here ever mentions "profile-B" (a hypothetical currently-active
  // profile) -- confirm the tag applied is the originally captured one.
  completePendingRecentlyPlayedCredit("g1", { game: { id: "g1" }, addRecentlyPlayed })
  assert.equal(addRecentlyPlayed.calls[0][0][PROFILE_TAG_FIELD], "profile-A")
  assert.equal(listPendingRecentlyPlayedCredits().length, 0)
})

test("completePendingRecentlyPlayedCredit does not fabricate a game or mark credit applied when game/addRecentlyPlayed are still missing", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })

  const resultNoGame = completePendingRecentlyPlayedCredit("g1", { addRecentlyPlayed: makeSpy() })
  assert.equal(resultNoGame.applied, false)
  assert.equal(listPendingRecentlyPlayedCredits().length, 1, "still pending -- nothing was silently marked applied")

  const resultNoCallback = completePendingRecentlyPlayedCredit("g1", { game: { id: "g1" } })
  assert.equal(resultNoCallback.applied, false)
  assert.equal(listPendingRecentlyPlayedCredits().length, 1)
})

// -- applyPendingRecentlyPlayedCredit: the coordinator Wheel/Home call -----
// Mirrors the module's own private storage key so a genuinely malformed
// entry can be injected directly, the same way corrupted/partial
// localStorage data could arrive in practice.
const PENDING_CREDIT_KEY = "nuarcade_pending_recently_played_credit"

test("applyPendingRecentlyPlayedCredit resolves a pending credit by its exact persisted gameId against the real catalog", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  const addRecentlyPlayed = makeSpy()
  const games = [{ id: "g0", title: "Not This One" }, { id: "g1", title: "The Real Game" }]

  const applied = applyPendingRecentlyPlayedCredit({ games, addRecentlyPlayed })
  assert.equal(applied.length, 1)
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(addRecentlyPlayed.calls[0][0].id, "g1")
  assert.equal(addRecentlyPlayed.calls[0][0].title, "The Real Game")
})

test("applyPendingRecentlyPlayedCredit attributes the credit to the captured profile, not any active-profile concept it never receives", async () => {
  const session = createSession({ profileId: "profile-A", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  const addRecentlyPlayed = makeSpy()
  // applyPendingRecentlyPlayedCredit's signature has no "current profile"
  // parameter at all -- there is structurally no way for it to redirect
  // credit to anything other than the profile captured on the session.
  applyPendingRecentlyPlayedCredit({ games: [{ id: "g1" }], addRecentlyPlayed })
  assert.equal(addRecentlyPlayed.calls[0][0][PROFILE_TAG_FIELD], "profile-A")
})

test("a game missing from the catalog leaves its credit pending, untouched", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  const addRecentlyPlayed = makeSpy()

  const applied = applyPendingRecentlyPlayedCredit({ games: [{ id: "some-other-game" }], addRecentlyPlayed })
  assert.equal(applied.length, 0)
  assert.equal(addRecentlyPlayed.calls.length, 0)
  assert.equal(listPendingRecentlyPlayedCredits().length, 1, "still pending -- not discarded just because it wasn't resolvable yet")
})

test("a successful write clears the credit; retrying later once the catalog is available completes it", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  const addRecentlyPlayed = makeSpy()

  // First attempt: catalog doesn't have the game yet (e.g. still scanning).
  applyPendingRecentlyPlayedCredit({ games: [], addRecentlyPlayed })
  assert.equal(addRecentlyPlayed.calls.length, 0)
  assert.equal(listPendingRecentlyPlayedCredits().length, 1)

  // Later retry: the catalog has now loaded the game.
  applyPendingRecentlyPlayedCredit({ games: [{ id: "g1" }], addRecentlyPlayed })
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(listPendingRecentlyPlayedCredits().length, 0)
})

test("a throwing addRecentlyPlayed leaves the credit pending rather than crashing or losing it", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  const throwingAddRecentlyPlayed = () => { throw new Error("storage quota exceeded") }

  assert.doesNotThrow(() => {
    const applied = applyPendingRecentlyPlayedCredit({ games: [{ id: "g1" }], addRecentlyPlayed: throwingAddRecentlyPlayed })
    assert.equal(applied.length, 0)
  })
  assert.equal(listPendingRecentlyPlayedCredits().length, 1, "credit remains pending -- the write never actually succeeded")
})

test("Home and Wheel both attempting the same pending credit results in exactly one write", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  const addRecentlyPlayed = makeSpy()
  const games = [{ id: "g1" }]

  // Simulates Home's effect firing, then Wheel's effect also firing (or
  // vice versa) against the same now-loaded catalog.
  applyPendingRecentlyPlayedCredit({ games, addRecentlyPlayed })
  applyPendingRecentlyPlayedCredit({ games, addRecentlyPlayed })

  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(listPendingRecentlyPlayedCredits().length, 0)
})

test("a React-style repeated effect invocation with an unchanged catalog writes only once", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  const addRecentlyPlayed = makeSpy()
  const games = [{ id: "g1" }]

  for (let i = 0; i < 5; i++) {
    applyPendingRecentlyPlayedCredit({ games, addRecentlyPlayed })
  }
  assert.equal(addRecentlyPlayed.calls.length, 1)
})

test("malformed pending-credit data is discarded conservatively without crashing, and doesn't block well-formed entries", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  await recoverLaunchSession({ getLaunchLifecycleStatus: async () => trustedTerminalStatus(session.id, 0) })
  assert.equal(listPendingRecentlyPlayedCredits().length, 1)

  // Directly inject a corrupted entry alongside the legitimate one --
  // simulates a partially-written or hand-edited localStorage value.
  const current = listPendingRecentlyPlayedCredits()
  const withMalformed = [...current, { profileId: "p2" /* no gameId */ }, null, "not-even-an-object"]
  global.localStorage.setItem(PENDING_CREDIT_KEY, JSON.stringify(withMalformed))

  const addRecentlyPlayed = makeSpy()
  assert.doesNotThrow(() => {
    const applied = applyPendingRecentlyPlayedCredit({ games: [{ id: "g1" }], addRecentlyPlayed })
    assert.equal(applied.length, 1)
  })
  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(listPendingRecentlyPlayedCredits().length, 0, "malformed entries were discarded, not left lingering")
})

test("no pending credit at all is a safe no-op", () => {
  const addRecentlyPlayed = makeSpy()
  const applied = applyPendingRecentlyPlayedCredit({ games: [{ id: "g1" }], addRecentlyPlayed })
  assert.deepEqual(applied, [])
  assert.equal(addRecentlyPlayed.calls.length, 0)
})

// -- idempotency across remount / duplicate invocation ----------------------

test("React remount or duplicate recovery invocation cannot duplicate credit or navigation", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  const getLaunchLifecycleStatus = async () => trustedTerminalStatus(session.id, 0)

  const first = await recoverLaunchSession({ deps: { addRecentlyPlayed, game: { id: "g1" } }, getLaunchLifecycleStatus })
  const second = await recoverLaunchSession({ deps: { addRecentlyPlayed, game: { id: "g1" } }, getLaunchLifecycleStatus })

  assert.equal(first.action, "reconciled")
  assert.equal(second.action, "none", "already archived by the first call")
  assert.equal(addRecentlyPlayed.calls.length, 1)

  // The pendingRestoration/resolvePendingRestoration path is pure -- applying
  // it (i.e. computing a destination) twice is inherently side-effect-free.
  const pending = first.pendingRestoration
  const r1 = resolvePendingRestoration(pending, { selectedProfileId: "p1", profiles: [{ id: "p1" }] })
  const r2 = resolvePendingRestoration(pending, { selectedProfileId: "p1", profiles: [{ id: "p1" }] })
  assert.deepEqual(r1, r2)
})

test("a later terminal push for a preserved session cannot double-apply, even if redelivered", async () => {
  const session = createSession({ profileId: "p1", gameId: "g1", originDestination: "library" })
  const addRecentlyPlayed = makeSpy()
  let deliver = null
  const onLaunchLifecycleTerminal = (cb) => { deliver = cb; return () => {} }

  const outcome = await recoverLaunchSession({
    deps: { addRecentlyPlayed, game: { id: "g1" } },
    getLaunchLifecycleStatus: async () => stillRunningStatus(session.id),
    onLaunchLifecycleTerminal,
  })
  assert.equal(outcome.action, "preserved")
  assert.equal(typeof deliver, "function")

  const terminal = trustedTerminalStatus(session.id, 0)
  deliver(terminal)
  deliver(terminal) // redelivered/duplicate push

  assert.equal(addRecentlyPlayed.calls.length, 1)
  assert.equal(getActiveSession(), null)
  assert.equal(getProfileGameState("p1", "g1").lifeState, "living")
})
