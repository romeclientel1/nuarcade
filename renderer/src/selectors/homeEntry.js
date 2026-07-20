// homeEntry.js ------------------------------------------------------------
// Pure selector for Vespara Home's initial focus. No React, no side
// effects, no storage access. Independently unit-testable.
//
// Contract: `recentGames` here is expected to already be
// profile-filtered and resolved -- i.e. the output of
// selectValidRecentGames(profileId, rawRecentGames, availableGames), not
// the raw global list. This keeps each selector single-purpose: one
// scopes-and-validates, this one only decides focus from already-clean
// inputs.

/**
 * @param {object} input
 * @param {'empty'|'established'} input.profileHistoryStatus
 * @param {'playable'|'unconfigured'|'degraded'} input.installationReadiness
 * @param {Array<object>} input.recentGames - already profile-scoped and
 *   resolved (see selectValidRecentGames), most recent first
 * @param {Array<object>} input.availableGames - the current games array,
 *   used to double-check current launchability of the top recent game
 * @returns {{type: string, gameId?: string}}
 *   type is one of: 'setup-connection' | 'first-game' | 'recent-game' |
 *   'library' | 'none'
 */
export function selectInitialHomeFocus({ profileHistoryStatus, installationReadiness, recentGames, availableGames }) {
  if (installationReadiness === "unconfigured") {
    return { type: "setup-connection" }
  }

  if (profileHistoryStatus === "empty") {
    // 'first-game' is a valid, documented focus type, but Home has no
    // "suggested first game" affordance today -- there's no browsing or
    // recommendation surface outside the Recent row, which is
    // necessarily empty for a brand-new profile. Deliberately not
    // produced by this selector until that UI exists; Library is the
    // truthful, actionable destination in the meantime. installationReadiness
    // is 'playable' or 'degraded' here (never 'unconfigured', handled above).
    return { type: "library" }
  }

  // established from here on
  const list = Array.isArray(recentGames) ? recentGames : []
  const availableById = new Map()
  for (const g of (availableGames || [])) {
    const id = g && (g.id || g.profile)
    if (id) availableById.set(id, g)
  }

  for (const entry of list) {
    const id = entry && (entry.id || entry.profile)
    const current = id ? availableById.get(id) : null
    // Re-check launchability against the CURRENT games array, not
    // whatever status the entry itself carried when it was recorded --
    // a game's configuration can change between plays.
    if (current && current.status !== "not-configured" && current.status !== "path-missing") {
      return { type: "recent-game", gameId: id }
    }
    // Known but currently unavailable: do not present it as launchable.
    // Keep checking the rest of the (short) history before giving up,
    // rather than falling straight to Library on the first miss.
  }

  // Established but nothing in their valid history currently resolves to
  // a launchable game -- covers both "no recent games at all" and "the
  // installation is degraded and their history is now unavailable".
  // Preferring Library over a broken or fabricated focus target either way.
  return { type: "library" }
}
