// profileGameState.js ---------------------------------------------------
// Durable, profile-scoped DISCOVERED/LIVING game state. Stored separately
// from the shared game catalog and from Recently Played -- the same game
// can be 'living' for one profile and 'discovered' (or entirely
// unrecorded) for another on the same installation. No React, no side
// effects beyond localStorage.
//
// Storage shape: nuarcade_profile_game_state -- a flat object keyed by
// "<profileId>:<gameId>" -> record. Flat and keyed rather than nested
// per-profile so a single record can be read or written without
// touching the rest of a profile's state.
//
// Default/migration behavior (brief section 13): a game's presence in
// the catalog, or in ANY profile's history, never implies 'living' for a
// profile with no existing record here -- the absence of a record IS
// 'discovered', by construction. This module never invents a 'living'
// record on its own; only applyEligibleReturn (the one valid transition,
// brief section 14) can create one, and only reconciliation calls it,
// only after a trusted, exit-confirmed, successfully-persisted return.

const KEY = "nuarcade_profile_game_state"

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json)
    return v === null || v === undefined ? fallback : v
  } catch { return fallback }
}

function readAll() {
  if (typeof localStorage === "undefined") return {}
  return safeParse(localStorage.getItem(KEY), {})
}

function writeAll(map) {
  if (typeof localStorage === "undefined") return
  try { localStorage.setItem(KEY, JSON.stringify(map)) } catch {}
}

function recordKey(profileId, gameId) {
  return String(profileId) + ":" + String(gameId)
}

/**
 * @param {string} profileId
 * @param {string} gameId
 * @returns {object} always returns a record -- a missing one is
 *   synthesized as 'discovered' with no timestamps, matching the
 *   default/migration rule. Never writes to storage.
 */
export function getProfileGameState(profileId, gameId) {
  const all = readAll()
  const existing = all[recordKey(profileId, gameId)]
  if (existing) return existing
  return { profileId, gameId, lifeState: "discovered" }
}

/**
 * The one valid DISCOVERED -> LIVING transition (brief section 14).
 *
 * Idempotent: calling this again for a profile+game that's already
 * living updates lastConfirmedPlayAt/lastSafeReturnAt/lastLaunchSessionId
 * but never resets firstConfirmedPlayAt or firstLivingLaunchSessionId,
 * and can never move a game back to 'discovered'. Reconciliation's own
 * terminal-event idempotency guard is what actually prevents this from
 * being called twice for the same return in practice -- this function
 * does not depend on the caller getting that right to stay correct
 * itself.
 *
 * @param {object} input
 * @param {string} input.profileId
 * @param {string} input.gameId
 * @param {string} input.launchSessionId
 * @param {number} [input.at] - defaults to Date.now()
 * @returns {{record: object, becameLivingJustNow: boolean}}
 *   becameLivingJustNow is true only on the actual transition moment --
 *   false on every subsequent confirmed return for an already-living
 *   game. This is what GameReturnResult.becameLiving should reflect;
 *   presentation should react once, not on every replay.
 */
export function applyEligibleReturn({ profileId, gameId, launchSessionId, at }) {
  const timestamp = at ?? Date.now()
  const all = readAll()
  const key = recordKey(profileId, gameId)
  const existing = all[key]
  const wasLiving = existing && existing.lifeState === "living"
  const next = {
    profileId,
    gameId,
    lifeState: "living",
    firstConfirmedPlayAt: wasLiving ? existing.firstConfirmedPlayAt : timestamp,
    lastConfirmedPlayAt: timestamp,
    lastSafeReturnAt: timestamp,
    firstLivingLaunchSessionId: wasLiving ? existing.firstLivingLaunchSessionId : launchSessionId,
    lastLaunchSessionId: launchSessionId,
  }
  all[key] = next
  writeAll(all)
  return { record: next, becameLivingJustNow: !wasLiving }
}

export const _internal = { KEY, recordKey }
