// originRestoration.js ----------------------------------------------------
// Decides where the app should land after a launch session ends, and
// what game (if any) should be focused there. Pure decision logic only
// -- no React, no direct DOM/focus manipulation, no destination APIs
// called directly. The caller (reconciliation.js) owns actually invoking
// navigation; this module only decides what it should be called with.
//
// Fallback chain, matching brief section 7:
//   origin destination, focused game (if it still resolves)
//   -> origin destination, no focus (game no longer resolves)
//   -> home, no focus (origin destination itself can't restore --
//      e.g. a profile mismatch, see reconciliation.js)
//   -> recovery (even home can't restore, or there's no usable
//      checkpoint at all)

/**
 * @param {object|null} checkpoint
 * @param {'home'|'library'} checkpoint.originDestination
 * @param {{focusedGameId?: string}} [checkpoint.originContext]
 * @param {object} availability
 * @param {boolean} [availability.gameStillResolves] - does the recorded
 *   focusedGameId still resolve to a known game right now?
 * @param {boolean} [availability.destinationRestorable] - can the origin
 *   destination itself be safely restored right now? Defaults to true.
 *   Callers set this false for e.g. a profile mismatch -- home is always
 *   safe to fall back to since it reflects whichever profile is
 *   currently active, not stale session data, but the specific origin
 *   (particularly Library, which could expose another profile's recent
 *   context) is not.
 * @param {boolean} [availability.homeRestorable] - can Home itself be
 *   reached? Defaults to true; false is an extreme, defensive case.
 * @returns {{destination: 'home'|'library'|'recovery', focusGameId: string|null}}
 */
export function resolveLaunchOriginRestoration(checkpoint, availability) {
  const a = availability || {}
  const destinationRestorable = a.destinationRestorable !== false
  const homeRestorable = a.homeRestorable !== false
  const gameStillResolves = !!a.gameStillResolves

  if (!checkpoint || (checkpoint.originDestination !== "home" && checkpoint.originDestination !== "library")) {
    return { destination: "recovery", focusGameId: null }
  }

  if (destinationRestorable) {
    const focusedGameId = (checkpoint.originContext && checkpoint.originContext.focusedGameId) || null
    return {
      destination: checkpoint.originDestination,
      focusGameId: (focusedGameId && gameStillResolves) ? focusedGameId : null,
    }
  }

  if (homeRestorable) {
    return { destination: "home", focusGameId: null }
  }

  return { destination: "recovery", focusGameId: null }
}
