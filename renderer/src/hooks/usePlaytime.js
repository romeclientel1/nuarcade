import { useCallback } from "react"

const KEY = "nuarcade_playtime"

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") } catch { return {} }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export function usePlaytime() {
  const startSession = useCallback((gameId) => {
    return Date.now()
  }, [])

  const endSession = useCallback((gameId, startTime) => {
    if (!gameId || !startTime) return
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    if (elapsed < 5) return
    const data = load()
    if (!data[gameId]) data[gameId] = { total: 0, sessions: 0, last: null }
    data[gameId].total += elapsed
    data[gameId].sessions += 1
    data[gameId].last = new Date().toISOString()
    save(data)
  }, [])

  const getPlaytime = useCallback((gameId) => {
    const data = load()
    return data[gameId] || { total: 0, sessions: 0, last: null }
  }, [])

  const getAllPlaytime = useCallback(() => load(), [])

  const formatTime = useCallback((seconds) => {
    if (!seconds) return "0m"
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return h + "h " + m + "m"
    return m + "m"
  }, [])

  const getTopGames = useCallback((games, limit = 5) => {
    const data = load()
    return games
      .filter(g => data[g.id || g.profile]?.total > 0)
      .sort((a, b) => {
        const at = data[a.id || a.profile]?.total || 0
        const bt = data[b.id || b.profile]?.total || 0
        return bt - at
      })
      .slice(0, limit)
      .map(g => ({ ...g, playtime: data[g.id || g.profile] }))
  }, [])

  return { startSession, endSession, getPlaytime, getAllPlaytime, formatTime, getTopGames }
}
