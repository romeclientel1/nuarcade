// restorationResolution.js -------------------------------------------------
// Pure resolution of a restoration request against the REAL catalog the
// owning surface has right now. No React, no DOM, no storage -- the
// surface supplies plain arrays it computed with its own existing
// filtering (Wheel's getFilteredGames, Home's displayedRecentGames), so no
// category/filter logic is duplicated here.
//
// Restoration priority (the game ID always outranks a stale saved index):
//   stable game ID in the saved section  -> that section, game's real index
//   stable game ID anywhere ("All")      -> "All", game's real index
//   no resolvable game, section valid    -> that section, clamped saved index
//   nothing usable                       -> "All", index 0 (destination-only)
//
// Catalog turbulence -- game removed, category renamed/removed, game moved
// between categories, order changed, empty catalog -- degrades through
// those same steps rather than crashing or forcing an invalid selection.

function gameIdOf(game) {
  return (game && (game.id || game.profile)) || null
}

/**
 * Gate the surfaces check before consuming: a request only becomes
 * consumable once the catalog is genuinely ready. While loading, the
 * request stays pending -- consuming against a half-loaded catalog would
 * burn the one shot on a lookup that was guaranteed to miss.
 */
export function shouldConsumeRestoration(request, { catalogReady } = {}) {
  if (!request || typeof request.restorationId !== "string" || !request.restorationId) return false
  return catalogReady === true
}

export function clampIndex(index, length) {
  if (!(length > 0)) return 0
  const n = (typeof index === "number" && Number.isFinite(index)) ? Math.trunc(index) : 0
  return Math.min(Math.max(n, 0), length - 1)
}

/**
 * Home: focus the Recently Played entry with the exact saved game id.
 * @returns {{recentIndex: number}|null} null = no valid focus (restore
 *   Home without one; never fabricate an entry to satisfy the request).
 */
export function resolveHomeFocus(request, { recentGames } = {}) {
  const list = Array.isArray(recentGames) ? recentGames : []
  const id = request && request.focusGameId
  if (!id) return null
  const idx = list.findIndex(g => gameIdOf(g) === id)
  return idx >= 0 ? { recentIndex: idx } : null
}

/**
 * Library: decide category + index per the priority above.
 *
 * @param {object} request - { focusGameId, sectionId, selectedIndex }
 * @param {object} catalogView - computed by Wheel with its own real filtering:
 * @param {boolean} [catalogView.sectionExists] - is request.sectionId still
 *   a live category/collection right now?
 * @param {Array<object>} [catalogView.sectionGames] - the section's current
 *   filtered+sorted list (empty/omitted when the section is gone)
 * @param {Array<object>} [catalogView.allGames] - the "All" list
 * @returns {{category: string, index: number, resolvedGame: boolean}}
 */
export function resolveLibraryRestoration(request, { sectionExists, sectionGames, allGames } = {}) {
  const section = Array.isArray(sectionGames) ? sectionGames : []
  const all = Array.isArray(allGames) ? allGames : []
  const sectionOk = sectionExists === true && !!(request && typeof request.sectionId === "string" && request.sectionId)
  const id = request && request.focusGameId

  if (id) {
    if (sectionOk) {
      const idx = section.findIndex(g => gameIdOf(g) === id)
      if (idx >= 0) return { category: request.sectionId, index: idx, resolvedGame: true }
    }
    const idxAll = all.findIndex(g => gameIdOf(g) === id)
    if (idxAll >= 0) return { category: "All", index: idxAll, resolvedGame: true }
  }

  if (sectionOk) {
    return { category: request.sectionId, index: clampIndex(request.selectedIndex, section.length), resolvedGame: false }
  }
  return { category: "All", index: 0, resolvedGame: false }
}
