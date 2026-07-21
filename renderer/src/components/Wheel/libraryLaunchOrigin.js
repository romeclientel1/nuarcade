// libraryLaunchOrigin.js --------------------------------------------------
// Pure origin-context builder for a launch dispatched from the Library
// wheel. No React, JSX, DOM, or CSS -- plain, serializable data only, so
// it's importable (and testable) standalone, and is the exact function
// Wheel.jsx itself calls -- never restated/duplicated in tests.
//
// activeCategory (a stable category name, e.g. "Racing" or a "col_..."
// collection id) is the meaningful "section" to restore -- not a raw
// filteredGames array index on its own, since that list's order/contents
// can shift over time. selectedIndex is included only as a last-resort
// fallback value, never as the primary restoration signal. focusedGameId
// itself is NOT set here -- useGameLauncher's beginLaunchSession always
// derives it from the actual game being launched (see its own comment for
// why); Wheel's own launchGame() always launches `current`
// (filteredGames[selectedIndex]) in the same render/tick it reads
// selectedIndex from, so there's no staleness risk here either way.
export function buildLibraryOriginContext({ activeCategory, selectedIndex } = {}) {
  return {
    sectionId: activeCategory ?? null,
    selectedIndex: typeof selectedIndex === "number" ? selectedIndex : null,
  }
}
