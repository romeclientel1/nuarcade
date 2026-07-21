// launchEvidence.test.js --------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency. classifyLaunchEvidence is pure -- no storage, no shim needed.

import { test } from "node:test"
import assert from "node:assert/strict"

const { classifyLaunchEvidence, _TRUSTED_MIN_ELAPSED_MS } = await import("./launchEvidence.js")

test("_TRUSTED_MIN_ELAPSED_MS is 4000ms", () => {
  assert.equal(_TRUSTED_MIN_ELAPSED_MS, 4000)
})

test("process not started -> failed-before-start, regardless of other fields", () => {
  const result = classifyLaunchEvidence({
    processStarted: false, trackedToExit: true, exitCode: 0, elapsedMs: 9999,
  })
  assert.equal(result.outcome, "failed-before-start")
  assert.equal(result.completedUnderTrustedPolicy, false)
})

test("untracked lifecycle (fire-and-forget) -> uncertain", () => {
  const result = classifyLaunchEvidence({ processStarted: true, trackedToExit: false })
  assert.equal(result.outcome, "uncertain")
  assert.equal(result.completedUnderTrustedPolicy, false)
})

test("tracked to exit but missing elapsed time -> uncertain", () => {
  const result = classifyLaunchEvidence({ processStarted: true, trackedToExit: true, exitCode: 0 })
  assert.equal(result.outcome, "uncertain")
  assert.equal(result.completedUnderTrustedPolicy, false)
})

test("every exit under 4000ms -> uncertain, including a clean code 0 exit", () => {
  const fastElapsedValues = [0, 1, 50, 3999]
  for (const elapsedMs of fastElapsedValues) {
    const clean = classifyLaunchEvidence({
      processStarted: true, trackedToExit: true, exitCode: 0, elapsedMs,
    })
    assert.equal(clean.outcome, "uncertain", `expected uncertain at elapsedMs=${elapsedMs} code=0`)
    assert.equal(clean.completedUnderTrustedPolicy, false)

    const nonZero = classifyLaunchEvidence({
      processStarted: true, trackedToExit: true, exitCode: 1, elapsedMs,
    })
    assert.equal(nonZero.outcome, "uncertain", `expected uncertain at elapsedMs=${elapsedMs} code=1`)
    assert.equal(nonZero.completedUnderTrustedPolicy, false)
  }
})

test("code 0 after the trusted window -> completed", () => {
  const atBoundary = classifyLaunchEvidence({
    processStarted: true, trackedToExit: true, exitCode: 0, elapsedMs: 4000,
  })
  assert.equal(atBoundary.outcome, "completed")
  assert.equal(atBoundary.completedUnderTrustedPolicy, true)

  const wellPast = classifyLaunchEvidence({
    processStarted: true, trackedToExit: true, exitCode: 0, elapsedMs: 60000,
  })
  assert.equal(wellPast.outcome, "completed")
  assert.equal(wellPast.completedUnderTrustedPolicy, true)
})

test("nonzero code after the trusted window -> abnormal-exit", () => {
  const result = classifyLaunchEvidence({
    processStarted: true, trackedToExit: true, exitCode: 1, elapsedMs: 4000,
  })
  assert.equal(result.outcome, "abnormal-exit")
  assert.equal(result.completedUnderTrustedPolicy, true)
})

test("a trusted abnormal exit still sets completedUnderTrustedPolicy: true", () => {
  // Distinct assertion from the case above: an abnormal exit is not a
  // failure to trust the timing evidence -- it's a genuinely-played
  // session that happened to crash or be closed abnormally. Eligibility
  // for e.g. Recently Played is a separate decision the caller makes.
  const result = classifyLaunchEvidence({
    processStarted: true, trackedToExit: true, exitCode: 137, elapsedMs: 10000,
  })
  assert.equal(result.completedUnderTrustedPolicy, true)
  assert.equal(result.outcome, "abnormal-exit")
})
