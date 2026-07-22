// restorationRequest.test.js -----------------------------------------------
// Committed regression tests, run via `node --test`. Tests the real
// production helpers -- no duplicated logic. buildRestorationForProfile
// routes through the real, unmodified resolvePendingRestoration for its
// destination decision, so profile-safety behavior here is the production
// path end to end.

import { test, beforeEach } from "node:test"
import assert from "node:assert/strict"

const {
  buildRestorationForProfile, capturedProfileMatches,
  consumeRestorationRequest, invalidateRestorationRequest, _internal,
} = await import("./restorationRequest.js")

beforeEach(() => { _internal._reset() })

function libraryPending(profileId = "profile-A", launchSessionId = "session-1") {
  return {
    launchSessionId,
    profileId,
    originDestination: "library",
    originContext: { focusedGameId: "g1", sectionId: "Racing", selectedIndex: 3 },
  }
}

function homePending(profileId = "profile-A", launchSessionId = "session-1") {
  return {
    launchSessionId,
    profileId,
    originDestination: "home",
    originContext: { focusedGameId: "g1", sectionId: "recents" },
  }
}

// -- building --------------------------------------------------------------

test("matching profile + library origin builds a full library request with focus, section, and fallback index", () => {
  const request = buildRestorationForProfile(libraryPending(), {
    selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }],
  })
  assert.equal(request.destination, "library")
  assert.equal(request.profileId, "profile-A")
  assert.equal(request.focusGameId, "g1")
  assert.equal(request.sectionId, "Racing")
  assert.equal(request.selectedIndex, 3)
  assert.equal(request.launchSessionId, "session-1")
  assert.equal(request.restorationId, "launch:session-1")
})

test("matching profile + home origin builds a home request with the focus game id", () => {
  const request = buildRestorationForProfile(homePending(), {
    selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }],
  })
  assert.equal(request.destination, "home")
  assert.equal(request.focusGameId, "g1")
  assert.equal(request.sectionId, "recents")
})

test("unresolved Player Select (no selectedProfileId) keeps restoration pending -- returns null, not a mismatch fallback", () => {
  const request = buildRestorationForProfile(libraryPending(), {
    selectedProfileId: null, profiles: [{ id: "profile-A" }],
  })
  assert.equal(request, null)
})

test("a different selected profile consumes through the safe Home fallback with no focus fields", () => {
  const request = buildRestorationForProfile(libraryPending(), {
    selectedProfileId: "profile-B", profiles: [{ id: "profile-A" }, { id: "profile-B" }],
  })
  assert.equal(request.destination, "home")
  assert.equal(request.focusGameId, null)
  assert.equal(request.sectionId, null)
  assert.equal(request.selectedIndex, null)
})

test("a deleted captured profile falls back to Home even when its id is somehow re-selected", () => {
  const request = buildRestorationForProfile(libraryPending(), {
    selectedProfileId: "profile-A", profiles: [], // profile-A no longer exists
  })
  assert.equal(request.destination, "home")
  assert.equal(request.focusGameId, null)
})

test("guest restoration is valid under the established guest convention (guest never appears in the profiles list)", () => {
  const request = buildRestorationForProfile(libraryPending("guest"), {
    selectedProfileId: "guest", profiles: [],
  })
  assert.equal(request.destination, "library")
  assert.equal(request.focusGameId, "g1")
  assert.equal(capturedProfileMatches(libraryPending("guest"), { selectedProfileId: "guest", profiles: [] }), true)
})

test("an invalid captured originDestination resolves through the recovery path to the safe Home landing", () => {
  const request = buildRestorationForProfile(
    { launchSessionId: "session-invalid-origin", profileId: "profile-A", originDestination: "not-a-real-place", originContext: { focusedGameId: "g1" } },
    { selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }] },
  )
  assert.equal(request.destination, "home")
  assert.equal(request.focusGameId, null)
})

test("missing originContext fields degrade to nulls rather than failing", () => {
  const request = buildRestorationForProfile(
    { launchSessionId: "session-no-context", profileId: "profile-A", originDestination: "library" }, // no originContext at all
    { selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }] },
  )
  assert.equal(request.destination, "library")
  assert.equal(request.focusGameId, null)
  assert.equal(request.sectionId, null)
  assert.equal(request.selectedIndex, null)
})

test("the request is fully serializable -- JSON round-trips deep-equal, no functions or object references inside", () => {
  const request = buildRestorationForProfile(libraryPending(), {
    selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }],
  })
  assert.deepEqual(JSON.parse(JSON.stringify(request)), request)
  for (const value of Object.values(request)) {
    assert.notEqual(typeof value, "function")
    assert.equal(value === null || typeof value !== "object", true)
  }
})

test("building twice from the same recovered launch session preserves the same deterministic restorationId", () => {
  const args = { selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }] }
  const a = buildRestorationForProfile(libraryPending(), args)
  const b = buildRestorationForProfile(libraryPending(), args)
  assert.equal(a.restorationId, "launch:session-1")
  assert.equal(b.restorationId, a.restorationId)
})

test("unresolved profile then matching profile preserves the launch-session-derived identity", () => {
  const pending = libraryPending("profile-A", "session-match")
  assert.equal(buildRestorationForProfile(pending, {
    selectedProfileId: null, profiles: [{ id: "profile-A" }],
  }), null)
  const resolved = buildRestorationForProfile(pending, {
    selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }],
  })
  assert.equal(resolved.restorationId, "launch:session-match")
})

test("unresolved profile then mismatch Home fallback preserves the launch-session-derived identity", () => {
  const pending = libraryPending("profile-A", "session-mismatch")
  assert.equal(buildRestorationForProfile(pending, {
    selectedProfileId: null, profiles: [{ id: "profile-A" }, { id: "profile-B" }],
  }), null)
  const fallback = buildRestorationForProfile(pending, {
    selectedProfileId: "profile-B", profiles: [{ id: "profile-A" }, { id: "profile-B" }],
  })
  assert.equal(fallback.destination, "home")
  assert.equal(fallback.restorationId, "launch:session-mismatch")
})

test("different recovered launch sessions produce distinct restoration identities", () => {
  const args = { selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }] }
  const a = buildRestorationForProfile(libraryPending("profile-A", "session-A"), args)
  const b = buildRestorationForProfile(libraryPending("profile-A", "session-B"), args)
  assert.notEqual(a.restorationId, b.restorationId)
})

test("missing launchSessionId is malformed recovery data and never mints a random identity", () => {
  const request = buildRestorationForProfile(
    { profileId: "profile-A", originDestination: "library", originContext: {} },
    { selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }] },
  )
  assert.equal(request, null)
})

// -- consumption -----------------------------------------------------------

test("consumption is exactly-once: first consume true, duplicate consume false", () => {
  const request = buildRestorationForProfile(libraryPending(), {
    selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }],
  })
  assert.equal(consumeRestorationRequest(request), true)
  assert.equal(consumeRestorationRequest(request), false)
})

test("React-style repeated invocation (StrictMode double-effects, remounts) applies once across many attempts", () => {
  const request = buildRestorationForProfile(libraryPending(), {
    selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }],
  })
  let applied = 0
  for (let i = 0; i < 6; i++) {
    if (consumeRestorationRequest(request)) applied += 1
  }
  assert.equal(applied, 1)
})

test("a remount-style rebuild from the same launch session cannot reapply an already-consumed restoration", () => {
  const pending = libraryPending("profile-A", "session-remount")
  const args = { selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }] }
  const first = buildRestorationForProfile(pending, args)
  assert.equal(consumeRestorationRequest(first), true)
  const rebuilt = buildRestorationForProfile(pending, args)
  assert.equal(rebuilt.restorationId, first.restorationId)
  assert.equal(consumeRestorationRequest(rebuilt), false)
})

test("consumed and invalidated restoration retention is bounded and evicts oldest ids deterministically", () => {
  const limit = _internal.CONSUMED_IDS_LIMIT
  for (let i = 0; i < limit + 2; i++) {
    assert.equal(consumeRestorationRequest({ restorationId: `launch:bounded-${i}` }), true)
  }
  assert.equal(_internal._size(), limit)
  assert.equal(_internal._isConsumed("launch:bounded-0"), false)
  assert.equal(_internal._isConsumed("launch:bounded-1"), false)
  assert.equal(_internal._isConsumed("launch:bounded-2"), true)
  assert.equal(_internal._isConsumed(`launch:bounded-${limit + 1}`), true)
})

test("newer intentional navigation invalidates a stale pending restoration -- it can never be consumed afterwards", () => {
  const request = buildRestorationForProfile(libraryPending(), {
    selectedProfileId: "profile-A", profiles: [{ id: "profile-A" }],
  })
  invalidateRestorationRequest(request)
  assert.equal(consumeRestorationRequest(request), false)
  assert.equal(_internal._isConsumed(request.restorationId), true)
})

test("malformed requests are never consumable and never crash", () => {
  assert.equal(consumeRestorationRequest(null), false)
  assert.equal(consumeRestorationRequest({}), false)
  assert.equal(consumeRestorationRequest({ restorationId: "" }), false)
  assert.doesNotThrow(() => invalidateRestorationRequest(null))
  assert.doesNotThrow(() => invalidateRestorationRequest({}))
})
