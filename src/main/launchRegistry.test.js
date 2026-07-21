// launchRegistry.test.js ---------------------------------------------------
// Committed regression tests, run via `node --test`. CommonJS, matching
// the rest of src/main -- root package.json has no "type": "module".

const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")

const {
  registerLaunch, recordProcessStarted, recordSpawnFailure, recordExit,
  getStatus, _internal,
} = require("./launchRegistry.js")

const NORMALIZED_KEYS = [
  "error", "exitCode", "exitedAt", "outcome", "processStarted",
  "running", "sessionId", "signal", "startedAt", "success", "trackedToExit",
].sort()

beforeEach(() => { _internal._clear() })

test("register tracked process", () => {
  const status = registerLaunch({ sessionId: "s1", trackedToExit: true, processStarted: true, startedAt: 1000 })
  assert.equal(status.sessionId, "s1")
  assert.equal(status.processStarted, true)
  assert.equal(status.running, true)
  assert.equal(status.startedAt, 1000)
  assert.equal(status.exitedAt, null)
  assert.equal(status.outcome, "uncertain")
  assert.equal(status.success, true)
  assert.equal(status.trackedToExit, true)
})

test("register untracked process", () => {
  const status = registerLaunch({ sessionId: "s1", trackedToExit: false, processStarted: true, startedAt: 1000 })
  assert.equal(status.processStarted, true)
  // Untracked launchers are never marked running -- there is no way to
  // confirm ongoing liveness for a fire-and-forget launcher.
  assert.equal(status.running, false)
  assert.equal(status.outcome, "uncertain")
  assert.equal(status.success, true)
  assert.equal(status.trackedToExit, false)
})

test("normalize running tracked state", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: true })
  const status = recordProcessStarted("s1", { startedAt: 2000 })
  assert.equal(status.processStarted, true)
  assert.equal(status.running, true)
  assert.equal(status.startedAt, 2000)
  assert.equal(status.exitedAt, null)
  assert.equal(status.outcome, "uncertain")
  assert.equal(status.success, true)
})

test("normalize terminal clean exit", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: true, processStarted: true, startedAt: 0 })
  const status = recordExit("s1", { exitCode: 0, exitedAt: 5000 })
  assert.equal(status.running, false)
  assert.equal(status.exitCode, 0)
  assert.equal(status.signal, null)
  assert.equal(status.exitedAt, 5000)
  assert.equal(status.outcome, "completed")
  assert.equal(status.success, true)
  assert.equal(status.trackedToExit, true)
})

test("normalize terminal abnormal exit", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: true, processStarted: true, startedAt: 0 })
  const byCode = recordExit("s1", { exitCode: 1, exitedAt: 5000 })
  assert.equal(byCode.outcome, "abnormal-exit")
  assert.equal(byCode.success, true)
  assert.equal(byCode.trackedToExit, true)

  registerLaunch({ sessionId: "s2", trackedToExit: true, processStarted: true, startedAt: 0 })
  const bySignal = recordExit("s2", { exitCode: null, signal: "SIGKILL", exitedAt: 5000 })
  assert.equal(bySignal.outcome, "abnormal-exit")
  assert.equal(bySignal.success, true)
  assert.equal(bySignal.trackedToExit, true)
})

test("normalize spawn failure", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: true })
  const status = recordSpawnFailure("s1", { error: "ENOENT: launcher not found", exitedAt: 500 })
  assert.equal(status.processStarted, false)
  assert.equal(status.running, false)
  assert.equal(status.error, "ENOENT: launcher not found")
  assert.equal(status.exitedAt, 500)
  assert.equal(status.outcome, "failed-before-start")
  assert.equal(status.success, false)
  assert.equal(status.trackedToExit, true)
})

test("spawn failure preserves the original trackedToExit value for an untracked registration", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: false })
  const status = recordSpawnFailure("s1", { error: "ENOENT" })
  assert.equal(status.trackedToExit, false)
  assert.equal(status.outcome, "failed-before-start")
})

test("normalize unknown session conservatively", () => {
  const status = getStatus("never-registered")
  assert.deepEqual(status, {
    error: null,
    exitCode: null,
    exitedAt: null,
    outcome: "uncertain",
    processStarted: null,
    running: false,
    sessionId: "never-registered",
    signal: null,
    startedAt: null,
    success: false,
    trackedToExit: false,
  })
})

test("duplicate exit is idempotent", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: true, processStarted: true, startedAt: 0 })
  const first = recordExit("s1", { exitCode: 0, exitedAt: 5000 })
  const second = recordExit("s1", { exitCode: 137, signal: "SIGKILL", exitedAt: 9999 })
  assert.deepEqual(second, first)
  assert.equal(second.exitCode, 0)
  assert.equal(second.exitedAt, 5000)
  assert.equal(second.signal, null)
  assert.equal(second.trackedToExit, true)
})

test("terminal state cannot regress back to running", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: true, processStarted: true, startedAt: 0 })
  const terminal = recordExit("s1", { exitCode: 0, exitedAt: 5000 })
  const afterDelayedStart = recordProcessStarted("s1", { startedAt: 9999 })
  assert.deepEqual(afterDelayedStart, terminal)
  assert.equal(afterDelayedStart.running, false)
  assert.equal(afterDelayedStart.startedAt, 0)
})

test("repeated status reads return the same stable shape", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: true, processStarted: true, startedAt: 0 })
  const a = getStatus("s1")
  const b = getStatus("s1")
  const c = getStatus("s1")
  assert.deepEqual(a, b)
  assert.deepEqual(b, c)
  assert.deepEqual(Object.keys(a).sort(), NORMALIZED_KEYS)
  assert.deepEqual(Object.keys(c).sort(), NORMALIZED_KEYS)
})

test("success remains distinct from outcome", () => {
  // Abnormal exit: the launch operation succeeded (spawn worked), but the
  // lifecycle outcome is not a clean completion.
  registerLaunch({ sessionId: "abnormal", trackedToExit: true, processStarted: true, startedAt: 0 })
  const abnormal = recordExit("abnormal", { exitCode: 1, exitedAt: 5000 })
  assert.equal(abnormal.success, true)
  assert.equal(abnormal.outcome, "abnormal-exit")

  // Spawn failure: both success and outcome are negative, but for
  // different reasons -- they are computed independently, not derived
  // from one another.
  registerLaunch({ sessionId: "failed", trackedToExit: true })
  const failed = recordSpawnFailure("failed", { error: "boom" })
  assert.equal(failed.success, false)
  assert.equal(failed.outcome, "failed-before-start")

  // Still running: success is already true (spawn worked), outcome is
  // still 'uncertain' because nothing terminal has happened yet.
  registerLaunch({ sessionId: "running", trackedToExit: true, processStarted: true, startedAt: 0 })
  const running = getStatus("running")
  assert.equal(running.success, true)
  assert.equal(running.outcome, "uncertain")
})

test("untracked launch remains uncertain, including against a stray exit report", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: false, processStarted: true, startedAt: 0 })
  assert.equal(getStatus("s1").outcome, "uncertain")

  // A misbehaving caller reporting an exit for an untracked launcher must
  // not be allowed to fabricate a completed/abnormal outcome.
  const afterStrayExit = recordExit("s1", { exitCode: 0, exitedAt: 5000 })
  assert.equal(afterStrayExit.outcome, "uncertain")
  assert.equal(afterStrayExit.exitedAt, null)
})

test("registry retention is bounded", () => {
  for (let i = 0; i < _internal.MAX_SESSIONS + 10; i++) {
    const id = "session-" + i
    registerLaunch({ sessionId: id, trackedToExit: true, processStarted: true, startedAt: 0 })
    recordExit(id, { exitCode: 0, exitedAt: 1 })
  }
  assert.ok(_internal._size() <= _internal.MAX_SESSIONS)
})

test("registry retention never evicts a still-active session to make room", () => {
  registerLaunch({ sessionId: "still-active", trackedToExit: true, processStarted: true, startedAt: 0 })
  for (let i = 0; i < _internal.MAX_SESSIONS + 10; i++) {
    const id = "filler-" + i
    registerLaunch({ sessionId: id, trackedToExit: true, processStarted: true, startedAt: 0 })
    recordExit(id, { exitCode: 0, exitedAt: 1 })
  }
  assert.ok(_internal._has("still-active"))
  assert.equal(getStatus("still-active").running, true)
})

test("duplicate registration behavior is deterministic", () => {
  const first = registerLaunch({ sessionId: "s1", trackedToExit: true, processStarted: true, startedAt: 1000 })
  // A conflicting second registration for the same id must be ignored
  // entirely -- not merged, not overwritten, including trackedToExit.
  const second = registerLaunch({ sessionId: "s1", trackedToExit: false, processStarted: false, startedAt: 9999 })
  assert.deepEqual(second, first)
  assert.equal(second.processStarted, true)
  assert.equal(second.startedAt, 1000)
  assert.equal(second.running, true)
  assert.equal(second.trackedToExit, true)
})

test("normalized status object has exactly eleven keys", () => {
  registerLaunch({ sessionId: "s1", trackedToExit: true, processStarted: true, startedAt: 0 })
  const running = getStatus("s1")
  assert.equal(Object.keys(running).length, 11)
  assert.deepEqual(Object.keys(running).sort(), NORMALIZED_KEYS)

  const exited = recordExit("s1", { exitCode: 0, exitedAt: 100 })
  assert.equal(Object.keys(exited).length, 11)
  assert.deepEqual(Object.keys(exited).sort(), NORMALIZED_KEYS)

  const unknown = getStatus("never-registered")
  assert.equal(Object.keys(unknown).length, 11)
  assert.deepEqual(Object.keys(unknown).sort(), NORMALIZED_KEYS)
})
