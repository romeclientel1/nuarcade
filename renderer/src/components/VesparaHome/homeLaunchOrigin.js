// homeLaunchOrigin.js -----------------------------------------------------
// Pure origin-context builder for a launch dispatched from VesparaHome. No
// React, JSX, DOM, or CSS -- plain, serializable data only, so it's
// importable (and testable) standalone, and is the exact function
// VesparaHome.jsx itself calls -- never restated/duplicated in tests.
//
// The only game-launch trigger in Home is a Recently Played tile -- there
// is no other zone a launch can originate from here, so the origin context
// is simply which zone that is. focusedGameId itself is NOT set here:
// useGameLauncher's beginLaunchSession always derives it from the actual
// game being launched (see its own comment for why), so it's never at risk
// of describing a stale recentIndex from a click handler's pre-render state.
export function buildHomeOriginContext() {
  return { sectionId: "recents" }
}
