import { useGameLibrary } from "./useGameLibrary"

// useRecentGames --------------------------------------------------------
// A purpose-built view over useGameLibrary() for surfaces that only need
// a short Recently Played list, not the full library. Does not duplicate
// or alter useGameLibrary's own state or storage -- it is a pure
// narrowing of what that hook already returns.
//
// recentGames is the display-ready, limited slice (existing behavior,
// unchanged). recentGamesRaw is the full, unsliced, unfiltered list --
// needed by profile-scoped selectors (selectValidRecentGames) so
// filtering-by-profile happens BEFORE any limit is applied, not after --
// otherwise a profile's own valid entry could be excluded just because
// other profiles or Guest played many games in between. games is exposed
// for the same reason: installation-readiness and recent-game-validity
// selectors both need the current library to resolve against.
export function useRecentGames(limit = 8) {
  const { games, recentlyPlayed, addRecentlyPlayed, loading } = useGameLibrary()
  return {
    recentGames: recentlyPlayed.slice(0, limit),
    recentGamesRaw: recentlyPlayed,
    games,
    addRecentlyPlayed,
    loading,
  }
}
