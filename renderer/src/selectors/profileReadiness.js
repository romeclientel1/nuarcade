// profileReadiness.js ----------------------------------------------------
// Pure, React-free selectors for profile history status and installation
// readiness. No side effects, no storage access -- callers pass in
// whatever data they already have (from useGameLibrary / useRecentGames /
// ProfileContext). Deterministic and independently unit-testable.
//
// KNOWN LIMITATION -- documented rather than worked around silently:
// Recently Played is not profile-scoped in the underlying storage model.
// useGameLibrary's `nuarcade_recent` key is a single global list shared
// by every profile and Guest; entries carry no profile identifier by
// default. Treating that global list as evidence of a SPECIFIC profile's
// personal history would be exactly the "installation-level history"
// conflation this feature is required to avoid.
//
// To make "established" mean something truthful per profile rather than
// per installation, callers must tag each entry with the active
// profile's id at the moment they call addRecentlyPlayed -- see the
// tagging wrapper in VesparaHome.jsx and Wheel.jsx. Entries written
// before this change, or written by any future call site that hasn't
// adopted the tagging convention, carry no tag and are correctly treated
// as unattributable: they never count toward ANY profile's established
// status. This keeps profile isolation truthful at the cost of
// "forgetting" pre-existing history until new tagged plays accumulate.
// A dedicated profile-game relationship store would remove this
// limitation entirely -- see the completion report's deferred-follow-up
// section.

// The field name used to tag a recentlyPlayed entry with the profile
// that was active when it was recorded. Exported so the two call sites
// that need to WRITE it (VesparaHome.jsx, Wheel.jsx) use the exact same
// key the selectors read.
export const PROFILE_TAG_FIELD = "_lastPlayedByProfileId"

function gameIdOf(game) {
  return (game && (game.id || game.profile)) || null
}

/**
 * Filters a raw, unscoped recentlyPlayed list down to the entries that
 * (a) were tagged with this specific profile's id at write time, and
 * (b) still resolve to a game the current library actually knows about.
 * Does NOT filter on current launchability -- a known-but-unavailable
 * game is still a truthful history record, just not an actionable one;
 * see selectInitialHomeFocus for that distinction. Never mutates its
 * inputs.
 *
 * @param {string|null} profileId
 * @param {Array<object>} recentGames - raw recentlyPlayed entries
 * @param {Array<object>} availableGames - the current games array
 * @returns {Array<object>} resolved game objects, most recent first
 */
export function selectValidRecentGames(profileId, recentGames, availableGames) {
  if (!profileId || !Array.isArray(recentGames)) return []
  const byId = new Map()
  for (const g of (availableGames || [])) {
    const id = gameIdOf(g)
    if (id) byId.set(id, g)
  }
  const seen = new Set()
  const out = []
  for (const entry of recentGames) {
    if (!entry || typeof entry !== "object") continue
    if (entry[PROFILE_TAG_FIELD] !== profileId) continue
    const entryId = gameIdOf(entry)
    if (!entryId || seen.has(entryId)) continue
    const resolved = byId.get(entryId)
    if (!resolved) continue // stale: no longer a known game -- ignored, not deleted
    seen.add(entryId)
    out.push(resolved)
  }
  return out
}

/**
 * Classifies the selected profile as having no confirmed personal play
 * history ('empty') or trustworthy personal history ('established').
 * Never infers establishment from installation-wide signals -- see the
 * module-level limitation note.
 *
 * @param {object|null} profile - must have an `id`; null/undefined -> empty
 * @param {Array<object>} recentGames - raw recentlyPlayed entries
 * @param {Array<object>} availableGames - the current games array
 * @returns {'empty'|'established'}
 */
export function selectProfileHistoryStatus(profile, recentGames, availableGames) {
  if (!profile || !profile.id) return "empty"
  const valid = selectValidRecentGames(profile.id, recentGames, availableGames)
  return valid.length > 0 ? "established" : "empty"
}

/**
 * Classifies the installation itself (not any specific profile).
 * 'playable' if at least one game currently resolves to a valid,
 * configured launch source -- reusing the exact `status` field
 * useGameLauncher already treats as authoritative for pre-flight
 * validation ('not-configured' / 'path-missing'), not a new signal.
 *
 * When no game is currently playable, distinguishes 'unconfigured' (no
 * evidence anything has ever worked here) from 'degraded' (the
 * installation has played games before, but nothing currently resolves)
 * using the raw, installation-wide recentlyPlayed list as the only
 * signal available for that distinction today. This is intentionally
 * NOT profile-scoped -- it answers "has this machine ever worked",
 * not "has this player played here" -- and is never used to establish
 * a specific profile.
 *
 * @param {Array<object>} games - the full games array
 * @param {Array<object>} recentGamesGlobal - the raw, unscoped
 *   recentlyPlayed list (installation-wide, not profile-filtered)
 * @returns {'playable'|'unconfigured'|'degraded'}
 */
export function selectInstallationReadiness(games, recentGamesGlobal) {
  const list = Array.isArray(games) ? games : []
  const hasPlayable = list.some(g => g && g.status !== "not-configured" && g.status !== "path-missing")
  if (hasPlayable) return "playable"
  const hasAnyHistory = Array.isArray(recentGamesGlobal) && recentGamesGlobal.length > 0
  return hasAnyHistory ? "degraded" : "unconfigured"
}
