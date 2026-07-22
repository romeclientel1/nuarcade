// startupRecovery.js -------------------------------------------------------
// Reconciles any persisted, nonterminal launch session left over from a
// previous run -- a renderer reload, a full app restart, or a crash while
// a game was in flight. Runs once, early, on App.jsx mount. Pure
// coordination only: no React, no DOM. Every lifecycle decision is made by
// feeding the main-process launch registry's normalized status through the
// existing, unmodified launchEvidence.js/reconciliation.js pipeline (via
// reconcileLaunchSession) -- this module invents no new eligibility rule
// of its own.
//
// Two concerns are deliberately kept separate:
//
//   1. Lifecycle reconciliation (outcome, DISCOVERED->LIVING, Recently
//      Played eligibility) -- runs immediately, at startup, using the
//      session's own captured profileId. It NEVER passes a real
//      currentActiveProfileId into reconcileLaunchSession (always null),
//      because at the moment recovery runs, no profile has necessarily
//      been selected yet this session -- activeProfileId: null is an
//      unresolved state, not evidence the session belongs to someone else.
//      Whatever destination reconcileLaunchSession's own terminalResult
//      bakes in under that null profile is intentionally NOT what gets
//      applied to the UI (see 2).
//
//   2. Destination/focus restoration -- deferred. recoverLaunchSession
//      returns a `pendingRestoration` descriptor (the session's own
//      captured profileId/originDestination/originContext -- immutable
//      facts, independent of whatever profile is active right now).
//      resolvePendingRestoration() is called SEPARATELY, once a real
//      profile has actually been selected, to decide the correct
//      destination against that real profile -- restoring the origin only
//      if the selected profile matches the captured one (and the captured
//      profile still exists), falling back to Home otherwise.
//
// Decision table (see recoverLaunchSession):
//   no nonterminal session                    -> nothing to do
//   registry: tracked, still running           -> preserved; a one-shot
//                                                 listener reconciles it
//                                                 whenever it does exit
//   registry: exitedAt already set             -> reconciled now, through
//                                                 the normal lifecycleResult
//                                                 path (quick-exit/abnormal-
//                                                 exit policy unchanged)
//   registry: unknown/conservative status      -> forceInterrupted
//   status query throws, or is unavailable     -> forceInterrupted
//     (this is exactly reconciliation.js's own documented forceInterrupted
//     case: "no lifecycle result reachable at all")
//
// Idempotency is inherited, not reimplemented: reconcileLaunchSession
// already no-ops (returns the stored result) once a session has a
// terminalResult, and archiveSession removes a reconciled session from the
// "active" slot -- so a repeat call simply finds no active session at all
// (getActiveSession() -> null) and does nothing. The one-shot listener adds
// its own `handled` guard on top, purely as defense in depth against a
// redelivered push. resolvePendingRestoration is a pure computation with
// no side effects, so calling it (or applying its result) more than once
// is inherently safe.
//
// Recently Played credit for a recovered session (see the report for the
// investigation behind this): App.jsx does not own the game catalog --
// that lives in Wheel/Home's own useGameLibrary() instance, and
// instantiating a second one here would trigger a full, expensive rescan
// on every startup purely to service crash recovery. DISCOVERED->LIVING
// does not need this dependency at all (applyEligibleReturn only needs
// profileId/gameId/launchSessionId, all already on the session record --
// see profileGameState.js), so it is applied unconditionally whenever
// eligible, exactly as reconciliation.js already does. Only the Recently
// Played WRITE itself needs {game, addRecentlyPlayed}; when those aren't
// available, this module records an explicit, durable pending-credit
// entry rather than silently losing it. applyPendingRecentlyPlayedCredit
// is the one plain coordinator both Wheel.jsx and VesparaHome.jsx call
// once their own real catalog is ready -- it resolves each pending entry
// strictly by its exact persisted gameId and completes it via
// completePendingRecentlyPlayedCredit, exactly once, regardless of which
// surface's effect gets there first.

import { getActiveSession } from "./sessionStore.js"
import { reconcileLaunchSession } from "./reconciliation.js"
import { resolveLaunchOriginRestoration } from "./originRestoration.js"
import { PROFILE_TAG_FIELD } from "../selectors/profileReadiness.js"

const PENDING_CREDIT_KEY = "nuarcade_pending_recently_played_credit"

function isGenuinelyStillRunning(status) {
  return !!status && status.trackedToExit === true && status.exitedAt == null
}

function buildLifecycleResultFromStatus(status) {
  return {
    processStarted: status.processStarted,
    trackedToExit: status.trackedToExit,
    exitCode: status.exitCode,
    startedAt: status.startedAt,
    exitedAt: status.exitedAt,
    error: status.error || undefined,
  }
}

function isEligibleOutcome(outcome) {
  return outcome === "completed" || outcome === "abnormal"
}

function readPendingCredits() {
  if (typeof localStorage === "undefined") return []
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_CREDIT_KEY) || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writePendingCredits(list) {
  if (typeof localStorage === "undefined") return
  try { localStorage.setItem(PENDING_CREDIT_KEY, JSON.stringify(list)) } catch {}
}

// Records that this session's return was eligible but couldn't be credited
// (deps unavailable) -- never called for an ineligible/interrupted outcome,
// since isEligibleOutcome() gates it. Idempotent: a session already present
// in the pending queue is never duplicated.
function recordPendingCreditIfNeeded(session, result) {
  if (!result || !isEligibleOutcome(result.outcome) || result.recentlyPlayedUpdated) return
  const pending = readPendingCredits()
  if (pending.some(p => p.launchSessionId === session.id)) return
  pending.push({
    launchSessionId: session.id,
    profileId: session.profileId,
    gameId: session.gameId,
    eventId: result.eventId,
  })
  writePendingCredits(pending)
}

/**
 * @returns {Array<{launchSessionId: string, profileId: string, gameId: string, eventId: string}>}
 */
export function listPendingRecentlyPlayedCredits() {
  return readPendingCredits()
}

/**
 * Completes exactly one pending Recently Played credit, once the real game
 * and the real addRecentlyPlayed callback are available (e.g. once
 * Wheel/Home has loaded its catalog). Never attributes to any profile
 * other than the one the credit was originally recorded for. No-ops
 * (returns {applied:false}) if there's no matching pending entry, or if
 * game/addRecentlyPlayed still aren't available -- never marks credit as
 * applied when it wasn't, and never fabricates a game object.
 *
 * @param {string} gameId
 * @param {object} input
 * @param {object} [input.game] - the real, resolved game object
 * @param {(game: object) => void} [input.addRecentlyPlayed] - the real,
 *   profile-scoped callback (the one useGameLibrary() itself owns)
 * @returns {{applied: boolean, profileId?: string, error?: unknown}}
 */
export function completePendingRecentlyPlayedCredit(gameId, { game, addRecentlyPlayed } = {}) {
  const pending = readPendingCredits()
  const entry = pending.find(p => p.gameId === gameId)
  if (!entry) return { applied: false }
  if (typeof addRecentlyPlayed !== "function" || !game) return { applied: false }
  // If the real callback throws, the write did not actually happen -- the
  // entry must stay pending (never removed) rather than being marked
  // applied, and the exception must not propagate into the caller's
  // render/effect and crash the surface that was just trying to help.
  try {
    addRecentlyPlayed({ ...game, [PROFILE_TAG_FIELD]: entry.profileId })
  } catch (error) {
    return { applied: false, error }
  }
  writePendingCredits(pending.filter(p => p.launchSessionId !== entry.launchSessionId))
  return { applied: true, profileId: entry.profileId }
}

function resolveGameId(game) {
  return (game && (game.id || game.profile)) || null
}

/**
 * The one plain coordinator both Wheel.jsx and VesparaHome.jsx call once
 * their own real game catalog is ready. Resolves each pending credit
 * strictly by its exact persisted gameId against the supplied catalog --
 * never fabricates a partial game object, never guesses. A credit whose
 * game isn't in the catalog yet is left pending untouched (retried
 * automatically the next time this is called, e.g. after a rescan).
 * Idempotent by construction: completePendingRecentlyPlayedCredit removes
 * an entry the instant it succeeds, so calling this repeatedly (both
 * surfaces mounting in turn, a React remount, an effect re-firing with the
 * same catalog) can only ever write a given credit once -- the second call
 * simply finds nothing left to do for it.
 *
 * @param {object} input
 * @param {Array<object>} [input.games] - the real, resolved game catalog
 * @param {(game: object) => void} [input.addRecentlyPlayed] - the real
 *   callback (useGameLibrary()'s own, unmodified)
 * @returns {Array<{gameId: string, profileId: string}>} credits actually applied this call
 */
export function applyPendingRecentlyPlayedCredit({ games, addRecentlyPlayed } = {}) {
  const pending = readPendingCredits()
  if (pending.length === 0) return []

  // Malformed entries (no usable gameId) can never be matched or
  // completed -- discard them outright rather than retrying forever.
  const wellFormed = pending.filter(entry => entry && typeof entry.gameId === "string" && entry.gameId)
  if (wellFormed.length !== pending.length) writePendingCredits(wellFormed)

  const catalog = Array.isArray(games) ? games : []
  const applied = []
  for (const entry of wellFormed) {
    const game = catalog.find(g => resolveGameId(g) === entry.gameId)
    if (!game) continue // not yet in the catalog -- leave pending, retry later
    const result = completePendingRecentlyPlayedCredit(entry.gameId, { game, addRecentlyPlayed })
    if (result.applied) applied.push({ gameId: entry.gameId, profileId: result.profileId })
  }
  return applied
}

// Registers a listener that reconciles this ONE session the moment (and
// only the moment) its eventual terminal push arrives -- scoped to a
// single sessionId, unlike useGameLauncher's own persistent, multi-session
// subscription (which only ever acts on sessions that hook instance itself
// dispatched; a recovered session was dispatched by a previous renderer
// instance and is invisible to it). Self-unsubscribes once handled. Safe
// to call with no onLaunchLifecycleTerminal available -- returns null.
function subscribeUntilTerminal(session, { onLaunchLifecycleTerminal, deps }) {
  if (typeof onLaunchLifecycleTerminal !== "function") return null
  let handled = false
  const unsubscribe = onLaunchLifecycleTerminal((status) => {
    if (handled) return
    if (!status || status.sessionId !== session.id) return
    if (status.exitedAt == null) return // still not actually terminal yet
    handled = true
    const result = reconcileLaunchSession({
      session,
      lifecycleResult: buildLifecycleResultFromStatus(status),
      currentActiveProfileId: null,
      deps: deps || {},
    })
    recordPendingCreditIfNeeded(session, result)
    if (typeof unsubscribe === "function") unsubscribe()
  })
  return unsubscribe
}

/**
 * The immutable facts needed to decide restoration later, once a real
 * profile is known -- deliberately NOT reconciliation's own
 * terminalResult.restoredDestination, which was computed under a null
 * (unresolved) profile and would always be the safe-fallback answer.
 */
export function buildPendingRestoration(session) {
  return {
    profileId: session.profileId,
    originDestination: session.originDestination,
    originContext: session.originContext,
  }
}

/**
 * Resolves a pending restoration once Player Select has actually run this
 * session. Restores the captured origin only if the selected profile
 * matches the one the session was captured for, AND that profile still
 * exists; otherwise falls back to the existing, unmodified
 * originRestoration.js policy (Home, or recovery if even Home can't be
 * trusted). Never exposes another profile's Library position. Pure -- safe
 * to call as many times as needed with the same inputs.
 *
 * @param {object|null} pendingRestoration - from buildPendingRestoration()
 * @param {object} input
 * @param {string|null} [input.selectedProfileId] - the profile the player
 *   actually chose this session (activeProfile?.id, or "guest")
 * @param {Array<{id: string}>} [input.profiles] - the current profiles
 *   list, used only to confirm the captured profile still exists
 * @param {boolean} [input.gameStillResolves] - optional; App.jsx does not
 *   own the game catalog, so this defaults to false (focus is never
 *   restored through this path today -- only the destination is; see the
 *   report's limitations).
 * @returns {{destination: 'home'|'library'|'recovery', focusGameId: string|null}}
 */
export function resolvePendingRestoration(pendingRestoration, { selectedProfileId, profiles, gameStillResolves } = {}) {
  if (!pendingRestoration) return { destination: "home", focusGameId: null }
  const profileList = Array.isArray(profiles) ? profiles : []
  const capturedProfileStillExists = pendingRestoration.profileId === "guest"
    || profileList.some(p => p && p.id === pendingRestoration.profileId)
  const profileMatches = !!selectedProfileId
    && selectedProfileId === pendingRestoration.profileId
    && capturedProfileStillExists
  return resolveLaunchOriginRestoration(
    { originDestination: pendingRestoration.originDestination, originContext: pendingRestoration.originContext },
    { gameStillResolves: !!gameStillResolves, destinationRestorable: profileMatches, homeRestorable: true },
  )
}

/**
 * @param {object} [input]
 * @param {object} [input.deps] - forwarded to reconcileLaunchSession as-is
 *   ({ addRecentlyPlayed, game }). Typically {} from App.jsx (see the
 *   module header) -- reconciliation already handles a missing game/
 *   addRecentlyPlayed safely for the write itself; DISCOVERED->LIVING is
 *   unaffected either way.
 * @param {(sessionId: string) => Promise<object>} [input.getLaunchLifecycleStatus] -
 *   the preload bridge call (window.nuarcade.getLaunchLifecycleStatus).
 *   Its absence, or a rejected call, is treated identically: no
 *   authoritative lifecycle result reachable at all.
 * @param {(cb: (status: object) => void) => (() => void)} [input.onLaunchLifecycleTerminal] -
 *   the preload bridge subscription, used only for the "preserved" (still
 *   running) case, to reconcile once this specific session eventually
 *   does terminate.
 * @param {() => object|null} [input.getActiveSessionImpl] - test-only
 *   override for sessionStore.getActiveSession; production callers never
 *   pass this.
 * @returns {Promise<{action: 'none'|'preserved'|'reconciled'|'interrupted', session?: object, result?: object, pendingRestoration?: object, unsubscribe?: (() => void)|null, error?: unknown}>}
 */
export async function recoverLaunchSession({
  deps,
  getLaunchLifecycleStatus,
  onLaunchLifecycleTerminal,
  getActiveSessionImpl,
} = {}) {
  const readActiveSession = getActiveSessionImpl || getActiveSession
  const session = readActiveSession()
  if (!session || !session.id) {
    return { action: "none" }
  }

  const resolveInterrupted = () => {
    const result = reconcileLaunchSession({
      session,
      lifecycleResult: null,
      forceInterrupted: true,
      currentActiveProfileId: null,
      deps: deps || {},
    })
    recordPendingCreditIfNeeded(session, result)
    return result
  }

  if (typeof getLaunchLifecycleStatus !== "function") {
    return {
      action: "interrupted",
      result: resolveInterrupted(),
      pendingRestoration: buildPendingRestoration(session),
      unsubscribe: null,
    }
  }

  let status
  try {
    status = await getLaunchLifecycleStatus(session.id)
  } catch (error) {
    return {
      action: "interrupted",
      result: resolveInterrupted(),
      pendingRestoration: buildPendingRestoration(session),
      error,
      unsubscribe: null,
    }
  }

  if (status && status.exitedAt != null) {
    const result = reconcileLaunchSession({
      session,
      lifecycleResult: buildLifecycleResultFromStatus(status),
      currentActiveProfileId: null,
      deps: deps || {},
    })
    recordPendingCreditIfNeeded(session, result)
    return {
      action: "reconciled",
      result,
      pendingRestoration: buildPendingRestoration(session),
      unsubscribe: null,
    }
  }

  if (isGenuinelyStillRunning(status)) {
    const unsubscribe = subscribeUntilTerminal(session, { onLaunchLifecycleTerminal, deps })
    return { action: "preserved", session, unsubscribe }
  }

  return {
    action: "interrupted",
    result: resolveInterrupted(),
    pendingRestoration: buildPendingRestoration(session),
    unsubscribe: null,
  }
}
