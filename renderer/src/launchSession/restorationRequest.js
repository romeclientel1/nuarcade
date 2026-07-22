// restorationRequest.js ----------------------------------------------------
// Builds and tracks the serializable "put the player back where they
// launched from" request that App.jsx hands to whichever surface (Wheel or
// VesparaHome) owns the destination. Pure data + a module-level
// consumed-id registry -- no React, no DOM, no callbacks inside the
// request itself.
//
// Lifecycle of a request:
//   1. Startup recovery leaves App holding a pendingRestoration
//      ({ profileId, originDestination, originContext }) -- immutable
//      facts captured at launch time.
//   2. Once Player Select resolves a REAL profile, App calls
//      buildRestorationForProfile. Unresolved profile -> null (stay
//      pending); resolved profile -> a full request (profile match) or a
//      safe Home-fallback request (mismatch/deleted profile) -- never
//      another player's Library position.
//   3. The owning surface consumes it exactly once via
//      consumeRestorationRequest -- a module-level Set keyed by
//      restorationId, so React remounts, StrictMode double-effects, and
//      both surfaces mounting in sequence can never apply it twice.
//   4. Any newer intentional navigation invalidates it
//      (invalidateRestorationRequest) -- a stale restoration can never
//      drag the player away from somewhere they deliberately went. No
//      timeouts involved anywhere.

import { resolvePendingRestoration } from "./startupRecovery.js"

// Bounded consumed/invalidated-id registry. Restoration is rare (at most
// one per recovered launch session), so this effectively never fills in
// practice -- the cap is a defensive backstop so a long-running cabinet
// session can never grow it without limit. Insertion-ordered (Set iterates
// in insertion order), so when the cap is hit the OLDEST id is evicted:
// an id old enough to be evicted belongs to a restoration from hundreds of
// recoveries ago, which no live request object can still reference.
const CONSUMED_IDS_LIMIT = 100
const consumedIds = new Set()

function markConsumed(id) {
  consumedIds.add(id)
  while (consumedIds.size > CONSUMED_IDS_LIMIT) {
    consumedIds.delete(consumedIds.values().next().value)
  }
}

// The restoration identity IS the recovered launch session's identity --
// deterministic, never random. Rebuilding the same logical restoration
// (profile-resolution retries, React remounts re-running App's effect,
// match vs. safe-fallback resolution) always yields the same id, so the
// consumed/invalidation registry genuinely covers all of them. Distinct
// launch sessions get distinct ids because session ids themselves are
// unique (sessionStore.generateSessionId).
function restorationIdFor(pendingRestoration) {
  const sid = pendingRestoration && pendingRestoration.launchSessionId
  return (typeof sid === "string" && sid) ? "launch:" + sid : null
}

// Same convention resolvePendingRestoration applies internally: a captured
// profile is restorable only if it's the one actually selected AND still
// exists ("guest" is always considered existing, per the established guest
// convention -- it's a synthetic profile, never in the profiles list).
export function capturedProfileMatches(pendingRestoration, { selectedProfileId, profiles } = {}) {
  if (!pendingRestoration) return false
  const list = Array.isArray(profiles) ? profiles : []
  const stillExists = pendingRestoration.profileId === "guest"
    || list.some(p => p && p.id === pendingRestoration.profileId)
  return !!selectedProfileId && selectedProfileId === pendingRestoration.profileId && stillExists
}

/**
 * @param {object|null} pendingRestoration - from startup recovery
 * @param {object} input
 * @param {string|null} [input.selectedProfileId] - the profile the player
 *   actually chose this session. null/undefined means Player Select hasn't
 *   resolved yet -- the request stays PENDING (returns null), it is NOT a
 *   mismatch.
 * @param {Array<{id: string}>} [input.profiles]
 * @returns {object|null} a serializable restoration request:
 *   { restorationId, profileId, destination, focusGameId, sectionId,
 *     selectedIndex } -- or null when nothing can be decided yet.
 */
export function buildRestorationForProfile(pendingRestoration, { selectedProfileId, profiles } = {}) {
  if (!pendingRestoration) return null
  if (!selectedProfileId) return null // unresolved Player Select: pending, not mismatched

  const restorationId = restorationIdFor(pendingRestoration)
  if (!restorationId) return null // malformed recovery data: never mint a render-time identity
  const launchSessionId = pendingRestoration.launchSessionId

  const matches = capturedProfileMatches(pendingRestoration, { selectedProfileId, profiles })
  const { destination } = resolvePendingRestoration(pendingRestoration, { selectedProfileId, profiles })
  // There is no separate recovery surface in the Home/Library model --
  // Home is the safe landing for both "home" and "recovery".
  const safeDestination = destination === "library" ? "library" : "home"

  if (!matches || safeDestination !== destination) {
    return {
      restorationId,
      launchSessionId,
      profileId: pendingRestoration.profileId ?? null,
      destination: "home",
      focusGameId: null,
      sectionId: null,
      selectedIndex: null,
    }
  }

  const ctx = pendingRestoration.originContext || {}
  return {
    restorationId,
    launchSessionId,
    profileId: pendingRestoration.profileId,
    destination: safeDestination,
    focusGameId: typeof ctx.focusedGameId === "string" ? ctx.focusedGameId : null,
    sectionId: typeof ctx.sectionId === "string" ? ctx.sectionId : null,
    selectedIndex: typeof ctx.selectedIndex === "number" ? ctx.selectedIndex : null,
  }
}

/**
 * Exactly-once gate. First call for a given restorationId returns true;
 * every later call (duplicate effect, remount, the other surface) returns
 * false. Malformed requests are never consumable.
 */
export function consumeRestorationRequest(request) {
  if (!request || typeof request.restorationId !== "string" || !request.restorationId) return false
  if (consumedIds.has(request.restorationId)) return false
  markConsumed(request.restorationId)
  return true
}

/**
 * Marks a request dead without applying it -- called by App whenever the
 * player performs newer intentional navigation, so a stale restoration
 * can never override where they deliberately went.
 */
export function invalidateRestorationRequest(request) {
  if (request && typeof request.restorationId === "string" && request.restorationId) {
    markConsumed(request.restorationId)
  }
}

// Exposed for tests only.
export const _internal = {
  CONSUMED_IDS_LIMIT,
  _reset: () => consumedIds.clear(),
  _isConsumed: (id) => consumedIds.has(id),
  _size: () => consumedIds.size,
}
