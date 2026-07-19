import { useGameLibrary } from "./useGameLibrary"

// useRecentGames --------------------------------------------------------
// A purpose-built view over useGameLibrary() for surfaces that only need
// a short Recently Played list, not the full library. Does not duplicate
// or alter useGameLibrary's own state or storage -- it's a pure narrowing
// of what that hook already returns, plus the one bit of logic (applying
// the limit) that a bare rename wouldn't provide.
export function useRecentGames(limit = 8) {
  const { recentlyPlayed, addRecentlyPlayed, loading } = useGameLibrary()
  return {
    recentGames: recentlyPlayed.slice(0, limit),
    addRecentlyPlayed,
    loading,
  }
}
