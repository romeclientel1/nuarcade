// reconciliation.js -------------------------------------------------------
// The single place a launch session's terminal outcome becomes product
// truth. Orchestrates sessionStore, launchEvidence, profileGameState,
// and originRestoration into one declarative GameReturnResult -- and
// calls the existing, untouched addRecentlyPlayed exactly once when (and
// only when) eligible. No React; callers (useGameLauncher, and startup
// recovery in App.jsx) invoke this with plain data and get a plain
// result back.
//
// Idempotency is the central concern here: reconciling the same
// terminal event twice -- duplicate push delivery, a status-poll after
// the push already landed, a renderer reload mid-reconciliation -- must
// produce the exact same final state and result, never a second write.
// The mechanism: the terminal result is persisted ONTO the session
// record itself (terminalResult) before the session is archived, so a
// crash between "wrote terminalResult" and "archived" can still answer
// "was this already reconciled, and with what result" on restart,
// without redoing any of steps 1-8.

import { updateSession, archiveSession, findSession, isTerminalState } from "./sessionStore.js"
import { classifyLaunchEvidence } from "./launchEvidence.js"
import { applyEligibleReturn } from "./profileGameState.js"
import { resolveLaunchOriginRestoration } from "./originRestoration.js"
import { PROFILE_TAG_FIELD } from "../selectors/profileReadiness.js"

function generateEventId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return "ev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10)
}

function mapOutcomeForResult(evidenceOutcome) {
  switch (evidenceOutcome) {
    case "completed": return "completed"
    case "abnormal-exit": return "abnormal"
    case "failed-before-start": return "failed"
    case "interrupted": return "interrupted"
    default: return "uncertain"
  }
}

/**
 * @param {object} input
 * @param {object} input.session - the LaunchSession this lifecycle result belongs to
 * @param {object|null} input.lifecycleResult - the normalized main-process
 *   result (processStarted, trackedToExit, exitCode, startedAt, exitedAt,
 *   error, ...). Pass null/undefined only for the forced-interrupted
 *   recovery path, where no authoritative lifecycle record exists at all.
 * @param {string|null} input.currentActiveProfileId - the profile active
 *   in the renderer right now, used only for the "never restore into
 *   another profile's context" check -- never for write attribution,
 *   which always uses session.profileId.
 * @param {object} [input.deps]
 * @param {(game: object) => void} [input.deps.addRecentlyPlayed] - the
 *   existing, untouched useGameLibrary function. Receives the game
 *   object already tagged with PROFILE_TAG_FIELD bound to the session's
 *   launch-time profile -- never the currently active one.
 * @param {object} [input.deps.game] - resolved game object matching
 *   session.gameId, if the game still resolves right now. Absence is
 *   handled safely (no Recently Played write, no LIVING transition, and
 *   origin restoration falls back to no specific focus target).
 * @param {boolean} [input.forceInterrupted] - true only when called from
 *   startup recovery with no lifecycle result reachable at all (no
 *   authoritative main-process record, e.g. after a full app restart).
 * @returns {object} GameReturnResult
 */
export function reconcileLaunchSession({ session, lifecycleResult, currentActiveProfileId, deps, forceInterrupted }) {
  const d = deps || {}
  if (!session || !session.id) {
    throw new Error("reconcileLaunchSession requires a session with an id")
  }

  // Idempotency guard: already reconciled (active-but-terminal, or
  // already archived) -- return the stored result rather than redoing
  // any writes. This is what makes duplicate push delivery, a status
  // poll after the push already landed, and a resumed-after-crash
  // reconciliation all safe to call through this same function.
  const existing = findSession(session.id)
  if (existing && isTerminalState(existing.state) && existing.terminalResult) {
    return existing.terminalResult
  }

  const sessionProfileId = session.profileId
  const sessionGameId = session.gameId

  // Step 1: mark exit-detected.
  updateSession(session.id, { state: "exit-detected", exitDetectedAt: Date.now() })

  // Step 2: validate stored profile and game -- both come from the
  // session itself (captured at launch time, never re-derived from
  // whatever's currently active). Nothing to "look up" here; the
  // validation that matters is the profile-isolation check in step 4-5.

  // Step 3: classify trusted outcome.
  let evidence
  if (forceInterrupted || !lifecycleResult) {
    evidence = { completedUnderTrustedPolicy: false, outcome: "interrupted" }
  } else {
    evidence = classifyLaunchEvidence({
      processStarted: lifecycleResult.processStarted,
      trackedToExit: lifecycleResult.trackedToExit,
      exitCode: lifecycleResult.exitCode,
      elapsedMs: (lifecycleResult.startedAt != null && lifecycleResult.exitedAt != null)
        ? lifecycleResult.exitedAt - lifecycleResult.startedAt
        : null,
    })
  }
  updateSession(session.id, { state: "reconciling" })

  // Steps 4-5: restore application focus + origin destination. Never
  // restore into another profile's context: if the profile active right
  // now doesn't match who this session was launched for, the origin
  // destination itself is treated as unrestorable (falls back to Home,
  // which is always safe since it reflects whichever profile is
  // currently active, not stale session data -- see originRestoration.js).
  const profileMatches = currentActiveProfileId != null && currentActiveProfileId === sessionProfileId
  const restoration = resolveLaunchOriginRestoration(session, {
    gameStillResolves: !!d.game,
    destinationRestorable: profileMatches,
    homeRestorable: true,
  })

  // Steps 6-7: persist ProfileGameState and Recently Played -- only for
  // genuinely eligible outcomes. Uncertain, failed-before-start, and
  // interrupted never write either, regardless of how the game "felt"
  // like it went.
  const eligible = evidence.completedUnderTrustedPolicy === true
  let becameLiving = false
  let recentlyPlayedUpdated = false

  if (eligible) {
    const { becameLivingJustNow } = applyEligibleReturn({
      profileId: sessionProfileId,
      gameId: sessionGameId,
      launchSessionId: session.id,
    })
    becameLiving = becameLivingJustNow
    if (typeof d.addRecentlyPlayed === "function" && d.game) {
      d.addRecentlyPlayed({ ...d.game, [PROFILE_TAG_FIELD]: sessionProfileId })
      recentlyPlayedUpdated = true
    }
  }

  // Step 8: the one declarative return result. Consumers react to this;
  // they must not derive outcome independently (brief section 17).
  // failureReason is omitted entirely rather than set to undefined --
  // localStorage round-trips through JSON, which drops undefined-valued
  // keys, so a freshly-computed result and the same result read back
  // after persistence (e.g. on a duplicate/replayed reconciliation)
  // would otherwise differ in shape even though nothing meaningful
  // changed.
  const eventId = generateEventId()
  const result = {
    eventId,
    launchSessionId: session.id,
    profileId: sessionProfileId,
    gameId: sessionGameId,
    originDestination: session.originDestination,
    outcome: mapOutcomeForResult(evidence.outcome),
    safeReturnCompleted: true,
    recentlyPlayedUpdated,
    becameLiving,
    restoredDestination: restoration.destination,
    focusGameId: restoration.focusGameId,
  }
  if (!eligible && lifecycleResult && lifecycleResult.error) {
    result.failureReason = lifecycleResult.error
  }

  // Step 9: mark session returned/reconciled -- terminalResult lives on
  // the session record itself so idempotency survives a crash between
  // this write and archiving (step 10).
  const terminalState = evidence.outcome === "interrupted" ? "interrupted"
    : (eligible || evidence.outcome === "uncertain") ? "returned"
    : "failed"
  updateSession(session.id, {
    state: terminalState,
    reconciledAt: Date.now(),
    terminalEventId: eventId,
    terminalResult: result,
  })

  // Step 10: clear the active checkpoint by archiving the now-terminal session.
  archiveSession(session.id)

  // Step 11: emit presentation event -- callers do this simply by using
  // the returned result; this function stays a pure, synchronous,
  // easily-testable call with no event bus of its own.
  return result
}
