// launchRegistry.js --------------------------------------------------------
// Main-process, in-memory ledger of launch sessions. Records only what the
// OS / child_process actually reported -- register on launch attempt, then
// recordProcessStarted / recordSpawnFailure / recordExit as real lifecycle
// events arrive. No profile, Recently Played, destination, or
// DISCOVERED/LIVING logic belongs here -- that's the renderer-side
// launchSession/* modules' job, built on top of the normalized status this
// module exposes.
//
// Two vocabularies, kept deliberately distinct (never derived from one
// another):
//   success -- did the launch OPERATION itself complete without a
//     transport/spawn failure, under this registry's contract alone.
//   outcome -- what the process's LIFECYCLE actually meant: 'completed',
//     'abnormal-exit', 'failed-before-start', or 'uncertain'. A process
//     that started fine and later crashed is success: true,
//     outcome: 'abnormal-exit' -- the launch worked; the session just
//     didn't end cleanly. A process that never even spawned is
//     success: false, outcome: 'failed-before-start'.
//
// Conservative by construction, not just by computation:
//   - trackedToExit: false (fire-and-forget launchers -- VPX, Steam,
//     direct PC) sessions are never marked `running`, and recordExit is a
//     no-op for them -- they stay 'uncertain' for the life of the session
//     no matter what a caller mistakenly reports.
//   - Any session with no record (never registered, or already evicted by
//     retention bounding) normalizes to the same conservative "we know
//     nothing" shape: outcome 'uncertain', success false, everything else
//     null/false. Never a stale definite claim.
//   - Every mutator no-ops once a session has reached a terminal state
//     (exitedAt set) -- terminal never regresses back to running, and a
//     duplicate/delayed lifecycle event never overwrites the first
//     recorded truth.

const MAX_SESSIONS = 200

const registry = new Map()

function computeOutcome(record) {
  if (record.processStarted === false) return "failed-before-start"
  if (record.trackedToExit !== true) return "uncertain"
  if (record.exitedAt == null) return "uncertain"
  if (record.exitCode === 0 && !record.signal) return "completed"
  return "abnormal-exit"
}

function computeSuccess(record) {
  return record.processStarted === true && !record.error
}

function conservativeUnknownStatus(sessionId) {
  return {
    error: null,
    exitCode: null,
    exitedAt: null,
    outcome: "uncertain",
    processStarted: null,
    running: false,
    sessionId,
    signal: null,
    startedAt: null,
    success: false,
    trackedToExit: false,
  }
}

function enforceRetention() {
  if (registry.size <= MAX_SESSIONS) return
  for (const [id, record] of registry) {
    if (registry.size <= MAX_SESSIONS) break
    // Only terminal sessions are ever evicted -- a session still in
    // flight must never be silently dropped just to make room.
    if (record.exitedAt != null) registry.delete(id)
  }
}

/**
 * @param {string} sessionId
 * @returns {object} the normalized status -- always exactly these 11 keys
 *   (error, exitCode, exitedAt, outcome, processStarted, running,
 *   sessionId, signal, startedAt, success, trackedToExit), whether the
 *   session is known, still in flight, terminal, was never registered, or
 *   was already evicted by retention bounding. trackedToExit is exposed
 *   here (not just kept as internal state) so preload, renderer recovery,
 *   and reconciliation can distinguish a tracked launch from a
 *   fire-and-forget one explicitly, without inferring it from outcome or
 *   running.
 */
function getStatus(sessionId) {
  const record = registry.get(sessionId)
  if (!record) return conservativeUnknownStatus(sessionId)
  return {
    error: record.error,
    exitCode: record.exitCode,
    exitedAt: record.exitedAt,
    outcome: computeOutcome(record),
    processStarted: record.processStarted,
    running: record.running,
    sessionId: record.sessionId,
    signal: record.signal,
    startedAt: record.startedAt,
    success: computeSuccess(record),
    trackedToExit: record.trackedToExit,
  }
}

/**
 * Registers a new launch session. Idempotent: calling this again for a
 * sessionId that's already registered is a no-op -- returns the existing
 * status untouched rather than letting a duplicate/replayed registration
 * call clobber already-recorded truth with new arguments.
 *
 * @param {object} input
 * @param {string} input.sessionId
 * @param {boolean} input.trackedToExit -- false for fire-and-forget
 *   launchers (VPX, Steam, direct PC); these can never report an exit, so
 *   they stay 'uncertain' for the life of the session by construction.
 * @param {boolean} [input.processStarted] -- pass true only when the
 *   caller already has synchronous confirmation the process started (e.g.
 *   a live child_process handle with no immediate spawn error). Omit when
 *   start confirmation is still pending; call recordProcessStarted once
 *   it arrives.
 * @param {number} [input.startedAt] -- only meaningful alongside
 *   processStarted: true; defaults to Date.now() if omitted in that case.
 * @returns {object} normalized status
 */
function registerLaunch({ sessionId, trackedToExit, processStarted, startedAt }) {
  if (!sessionId) throw new Error("registerLaunch requires a sessionId")
  if (registry.has(sessionId)) return getStatus(sessionId)

  const started = processStarted === true
  registry.set(sessionId, {
    sessionId,
    processStarted: started ? true : (processStarted === false ? false : null),
    trackedToExit: trackedToExit === true,
    running: started && trackedToExit === true,
    startedAt: started ? (startedAt ?? Date.now()) : null,
    exitedAt: null,
    exitCode: null,
    signal: null,
    error: null,
  })
  enforceRetention()
  return getStatus(sessionId)
}

/**
 * Confirms the process actually started -- e.g. child_process's 'spawn'
 * event. No-ops (returns the current status unchanged) for an unknown
 * session, an already-terminal session (terminal must never regress back
 * to running), or a session whose start was already confirmed (first
 * confirmation wins).
 */
function recordProcessStarted(sessionId, { startedAt } = {}) {
  const record = registry.get(sessionId)
  if (!record) return conservativeUnknownStatus(sessionId)
  if (record.exitedAt != null) return getStatus(sessionId)
  if (record.processStarted === true) return getStatus(sessionId)

  record.processStarted = true
  record.startedAt = startedAt ?? Date.now()
  record.running = record.trackedToExit === true
  return getStatus(sessionId)
}

/**
 * Records a spawn/transport failure -- e.g. child_process's 'error' event
 * before any 'spawn' confirmation. No-ops for an unknown session, a
 * session already terminal, or one whose start was already confirmed
 * (a runtime error after a confirmed start is not a spawn failure and is
 * out of scope for this method).
 */
function recordSpawnFailure(sessionId, { error, exitedAt } = {}) {
  const record = registry.get(sessionId)
  if (!record) return conservativeUnknownStatus(sessionId)
  if (record.exitedAt != null) return getStatus(sessionId)
  if (record.processStarted === true) return getStatus(sessionId)

  record.processStarted = false
  record.running = false
  record.error = error != null ? error : "spawn failed"
  record.exitedAt = exitedAt ?? Date.now()
  return getStatus(sessionId)
}

/**
 * Records the process's exit -- e.g. child_process's 'exit' event.
 * No-ops for an unknown session, a session already terminal (first exit
 * wins; duplicate/delayed exit events never overwrite), or an untracked
 * (trackedToExit: false) session -- fire-and-forget launchers cannot
 * report an exit under this contract, so a stray exit call for one is
 * ignored rather than allowed to fabricate a completed/abnormal result.
 */
function recordExit(sessionId, { exitCode = null, signal = null, exitedAt } = {}) {
  const record = registry.get(sessionId)
  if (!record) return conservativeUnknownStatus(sessionId)
  if (record.exitedAt != null) return getStatus(sessionId)
  if (record.trackedToExit !== true) return getStatus(sessionId)

  // An exit is itself proof the process started, even if an explicit
  // start confirmation was missed.
  record.processStarted = true
  record.running = false
  record.exitCode = exitCode
  record.signal = signal
  record.exitedAt = exitedAt ?? Date.now()
  return getStatus(sessionId)
}

module.exports = {
  registerLaunch,
  recordProcessStarted,
  recordSpawnFailure,
  recordExit,
  getStatus,
  _internal: {
    MAX_SESSIONS,
    _size: () => registry.size,
    _has: (sessionId) => registry.has(sessionId),
    _clear: () => registry.clear(),
  },
}
