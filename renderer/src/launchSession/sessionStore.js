// sessionStore.js -----------------------------------------------------
// Durable, framework-free persistence for launch sessions. No React, no
// side effects beyond localStorage. This is the single source of truth
// for "is a launch currently in flight" -- independent of any component's
// lifetime, so it survives a renderer reload or a full app restart alike
// (Electron's renderer localStorage is backed by disk, not held only in
// an in-memory tab -- both scenarios recover from the same storage).
//
// Storage shape:
//   nuarcade_active_launch_session -- at most one record: the current
//     nonterminal session, if any. Removed once a session reaches a
//     terminal state and has been archived.
//   nuarcade_launch_sessions -- a bounded array (most recent first) of
//     terminal session records, capped at TERMINAL_HISTORY_LIMIT. Not an
//     unlimited history -- old entries fall off as new ones archive.

const ACTIVE_KEY = "nuarcade_active_launch_session"
const HISTORY_KEY = "nuarcade_launch_sessions"
const TERMINAL_HISTORY_LIMIT = 20

export const NONTERMINAL_STATES = [
  "requested", "validating", "starting", "active", "exit-detected", "reconciling",
]
export const TERMINAL_STATES = ["returned", "failed", "uncertain", "interrupted"]

export function isTerminalState(state) {
  return TERMINAL_STATES.includes(state)
}

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json)
    return v === null || v === undefined ? fallback : v
  } catch { return fallback }
}

function readActive() {
  if (typeof localStorage === "undefined") return null
  return safeParse(localStorage.getItem(ACTIVE_KEY), null)
}

function writeActive(session) {
  if (typeof localStorage === "undefined") return
  try {
    if (session) localStorage.setItem(ACTIVE_KEY, JSON.stringify(session))
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {}
}

function readHistory() {
  if (typeof localStorage === "undefined") return []
  return safeParse(localStorage.getItem(HISTORY_KEY), [])
}

function writeHistory(list) {
  if (typeof localStorage === "undefined") return
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, TERMINAL_HISTORY_LIMIT))) } catch {}
}

/**
 * Collision-resistant session id. Prefers crypto.randomUUID (available in
 * modern Electron/Node renderers); falls back to a timestamp+random
 * string combination if unavailable -- never timestamp alone.
 */
export function generateSessionId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return "ls_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10)
}

/**
 * @returns {object|null} the current nonterminal session, or null if none
 */
export function getActiveSession() {
  const s = readActive()
  if (s && !isTerminalState(s.state)) return s
  return null
}

/**
 * @returns {boolean} true if a nonterminal session currently exists.
 *   The launch guard (brief section 5) checks this before allowing a
 *   new launch to begin.
 */
export function hasNonterminalSession() {
  return getActiveSession() !== null
}

/**
 * Creates and persists a new session in the 'requested' state.
 *
 * Throws if a nonterminal session already exists, rather than silently
 * replacing it (brief section 5: "do not silently replace the first
 * session"). This is a defensive backstop -- the primary guard check is
 * hasNonterminalSession(), which callers (useGameLauncher) check first
 * and react to deterministically before ever reaching this call.
 *
 * @param {object} input
 * @param {string} input.profileId
 * @param {string} input.gameId
 * @param {'home'|'library'} input.originDestination
 * @param {{focusedGameId?: string}} [input.originContext]
 * @returns {object} the new session record
 */
export function createSession({ profileId, gameId, originDestination, originContext }) {
  if (hasNonterminalSession()) {
    throw new Error("Cannot create a new launch session while one is already active")
  }
  const session = {
    id: generateSessionId(),
    profileId: profileId ?? null,
    gameId,
    originDestination,
    originContext: originContext || undefined,
    state: "requested",
    requestedAt: Date.now(),
    version: 1,
  }
  writeActive(session)
  return session
}

/**
 * Applies a partial update to a session by id, bumping its version.
 *
 * Returns null (without throwing) if the id doesn't match the current
 * active session -- e.g. a stale or duplicate callback referencing a
 * session that's already been superseded, terminated, or archived. This
 * is the primary mechanism preventing duplicate callbacks and replayed
 * terminal events from mutating state twice.
 *
 * @param {string} sessionId
 * @param {object} patch - fields to merge in; state transitions go through here too
 * @returns {object|null}
 */
export function updateSession(sessionId, patch) {
  const current = readActive()
  if (!current || current.id !== sessionId) return null
  const next = { ...current, ...patch, version: (current.version || 1) + 1 }
  writeActive(next)
  return next
}

/**
 * Moves a terminal session from the active slot into bounded history.
 *
 * No-ops (returns false) if the given id isn't the current active
 * session, or if that session hasn't reached a terminal state yet --
 * callers must reach a terminal state via updateSession first.
 *
 * @param {string} sessionId
 * @returns {boolean}
 */
export function archiveSession(sessionId) {
  const current = readActive()
  if (!current || current.id !== sessionId) return false
  if (!isTerminalState(current.state)) return false
  const history = readHistory()
  writeHistory([current, ...history])
  writeActive(null)
  return true
}

/**
 * @param {string} sessionId
 * @returns {object|null} a terminal session from bounded history, if present
 */
export function findInHistory(sessionId) {
  return readHistory().find(s => s.id === sessionId) || null
}

/**
 * Looks up a session by id in either the active slot or archived
 * history -- the idempotency check reconciliation uses to answer "has
 * this session already been reconciled?" regardless of where it
 * currently lives.
 *
 * @param {string} sessionId
 * @returns {object|null}
 */
export function findSession(sessionId) {
  const active = readActive()
  if (active && active.id === sessionId) return active
  return findInHistory(sessionId)
}

// Exposed for tests only -- not part of the contract other modules
// should rely on.
export const _internal = { ACTIVE_KEY, HISTORY_KEY, TERMINAL_HISTORY_LIMIT }
