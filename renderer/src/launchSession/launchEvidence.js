// launchEvidence.js -------------------------------------------------------
// Pure classification of a main-process launch lifecycle result into a
// trusted outcome. No React, no storage, no side effects.
//
// Conservative policy (brief section 9): the main process's own
// launchWithReturn helper already treats an immediate (<4s) non-zero
// exit as a failure -- but an immediate (<4s) CLEAN exit (code 0)
// currently resolves as success under that helper alone. That is not
// proof of real play: a launcher that spawns and hands off instantly, or
// a silent early-exit bug, would look identical. This module does not
// trust elapsed<4s at all, regardless of exit code -- it always
// classifies that as 'uncertain', stricter than whatever outcome the
// main process itself reported.

const TRUSTED_MIN_ELAPSED_MS = 4000

/**
 * @param {object} evidence
 * @param {boolean} evidence.processStarted
 * @param {boolean} evidence.trackedToExit - false for fire-and-forget launchers (VPX, Steam, direct PC)
 * @param {number|null} [evidence.exitCode]
 * @param {number} [evidence.elapsedMs] - time between confirmed process start and exit, if known
 * @returns {{completedUnderTrustedPolicy: boolean, outcome: string}}
 *   outcome is one of: 'completed' | 'failed-before-start' | 'abnormal-exit' | 'uncertain'
 */
export function classifyLaunchEvidence(evidence) {
  const e = evidence || {}

  if (!e.processStarted) {
    return { completedUnderTrustedPolicy: false, outcome: "failed-before-start" }
  }

  if (!e.trackedToExit) {
    // Fire-and-forget path -- asked the OS to start something, no way to
    // confirm what happened after that.
    return { completedUnderTrustedPolicy: false, outcome: "uncertain" }
  }

  const elapsed = typeof e.elapsedMs === "number" ? e.elapsedMs : null
  if (elapsed === null) {
    // Tracked to exit but no timing evidence available -- can't honestly
    // apply the policy either way.
    return { completedUnderTrustedPolicy: false, outcome: "uncertain" }
  }

  if (elapsed < TRUSTED_MIN_ELAPSED_MS) {
    // The conservative policy this module exists for: too fast to trust,
    // regardless of exit code. A clean (code 0) exit at 50ms is exactly
    // the ambiguity described in the brief -- it does not become
    // 'completed' just because the code was 0.
    return { completedUnderTrustedPolicy: false, outcome: "uncertain" }
  }

  if (e.exitCode !== 0 && e.exitCode !== null && e.exitCode !== undefined) {
    // Ran long enough to trust the timing, then exited with a non-zero
    // code -- genuinely playing, then crashed or was closed abnormally.
    // Distinct from an immediate failure; may still count as eligible
    // play (brief section 22), which the caller decides.
    return { completedUnderTrustedPolicy: true, outcome: "abnormal-exit" }
  }

  return { completedUnderTrustedPolicy: true, outcome: "completed" }
}

export const _TRUSTED_MIN_ELAPSED_MS = TRUSTED_MIN_ELAPSED_MS
