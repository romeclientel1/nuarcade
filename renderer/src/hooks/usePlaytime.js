import { useCallback } from "react"

const KEY         = "nuarcade_playtime"
const LAUNCHES_KEY = "nuarcade_launches"

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") } catch { return {} }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

function loadLaunches() {
  try { return JSON.parse(localStorage.getItem(LAUNCHES_KEY) || "{}") } catch { return {} }
}

function saveLaunches(data) {
  try { localStorage.setItem(LAUNCHES_KEY, JSON.stringify(data)) } catch {}
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

  const recordLaunch = useCallback((gameId) => {
    if (!gameId) return
    const data = loadLaunches()
    if (!data[gameId]) data[gameId] = { count: 0, last: null }
    data[gameId].count += 1
    data[gameId].last = new Date().toISOString()
    saveLaunches(data)
  }, [])

  const getLaunches = useCallback((gameId) => {
    const data = loadLaunches()
    return data[gameId] || { count: 0, last: null }
  }, [])

  const getAllLaunches = useCallback(() => loadLaunches(), [])

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

  const formatLastPlayed = useCallback((isoDate) => {
    if (!isoDate) return null
    const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
    if (diff < 60)      return "Just now"
    if (diff < 3600)    return Math.floor(diff / 60) + "m ago"
    if (diff < 86400)   return Math.floor(diff / 3600) + "h ago"
    if (diff < 604800)  return Math.floor(diff / 86400) + "d ago"
    if (diff < 2592000) return Math.floor(diff / 604800) + "w ago"
    return new Date(isoDate).toLocaleDateString()
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

  return {
    startSession, endSession,
    recordLaunch, getLaunches, getAllLaunches,
    getPlaytime, getAllPlaytime,
    formatTime, formatLastPlayed,
    getTopGames,
  }
}
