// launchErrorSoundGuard.js -- plain, framework-free decision logic for
// whether a launch-error sound should play. No React import, so it's
// directly testable under native `node --test` and shared identically by
// VesparaHome.jsx and Wheel.jsx instead of each duplicating the same
// inline if/else.
//
// Locale-safe by construction: the decision is keyed entirely off
// launchErrorSeq -- a monotonic occurrence counter useGameLauncher
// increments exactly once per showLaunchError() call -- never off
// launchError's own (translated, locale-dependent) string value. That
// string is not a safe identity: a locale switch can change how an
// already-visible error reads without it being a new occurrence, and two
// unrelated failures could coincidentally translate to the same text.
// Comparing sequence numbers sidesteps both problems entirely.

// Returns { play, nextLastPlayedSeq } given the current launchError value,
// its accompanying launchErrorSeq, and whichever seq value was last
// recorded as "already played" (null if none yet / cleared since).
export function shouldPlayLaunchErrorCue(launchError, launchErrorSeq, lastPlayedSeq) {
  if (!launchError) return { play: false, nextLastPlayedSeq: null }
  if (launchErrorSeq !== lastPlayedSeq) return { play: true, nextLastPlayedSeq: launchErrorSeq }
  return { play: false, nextLastPlayedSeq: lastPlayedSeq }
}
