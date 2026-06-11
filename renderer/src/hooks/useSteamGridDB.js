import { useCallback } from "react"

const SGDB_BASE = "https://www.steamgriddb.com/api/v2"
const DEFAULT_KEY = "8e15be83af3c9840a1a26987bdf6fd13"

export function useSteamGridDB(apiKey) {
  const key = apiKey || DEFAULT_KEY
  const searchGame = useCallback(async (title) => {
    try {
      const res = await fetch(SGDB_BASE + "/search/autocomplete/" + encodeURIComponent(title), {
        headers: { Authorization: "Bearer " + key }
      })
      const data = await res.json()
      return data.data?.[0] || null
    } catch { return null }
  }, [key])

  const getHero = useCallback(async (gameId) => {
    if (!gameId) return null
    try {
      const res = await fetch(SGDB_BASE + "/heroes/game/" + gameId + "?limit=1", {
        headers: { Authorization: "Bearer " + key }
      })
      const data = await res.json()
      return data.data?.[0]?.url || null
    } catch { return null }
  }, [key])

  const getCapsule = useCallback(async (gameId) => {
    if (!gameId) return null
    try {
      const res = await fetch(SGDB_BASE + "/grids/game/" + gameId + "?limit=1&dimensions=600x900", {
        headers: { Authorization: "Bearer " + key }
      })
      const data = await res.json()
      return data.data?.[0]?.url || null
    } catch { return null }
  }, [key])

  const getLogo = useCallback(async (gameId) => {
    if (!gameId) return null
    try {
      const res = await fetch(SGDB_BASE + "/logos/game/" + gameId + "?limit=1", {
        headers: { Authorization: "Bearer " + key }
      })
      const data = await res.json()
      return data.data?.[0]?.url || null
    } catch { return null }
  }, [key])

  const fetchArtworkForGame = useCallback(async (title) => {
    const game = await searchGame(title)
    if (!game) return null
    const [hero, capsule, logo] = await Promise.all([
      getHero(game.id),
      getCapsule(game.id),
      getLogo(game.id),
    ])
    return { gameId: game.id, hero, capsule, logo }
  }, [searchGame, getHero, getCapsule, getLogo])

  return { searchGame, getHero, getCapsule, getLogo, fetchArtworkForGame }
}
