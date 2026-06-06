import { useState, useCallback } from "react"

const PLAY_COUNTS_KEY = "nuarcade_play_counts"
const LAST_PLAYED_KEY = "nuarcade_last_played"

export function usePlayTracking() {
  const getPlayCounts = () => {
    try { return JSON.parse(localStorage.getItem(PLAY_COUNTS_KEY) || "{}") } catch { return {} }
  }

  const getLastPlayed = () => {
    try { return JSON.parse(localStorage.getItem(LAST_PLAYED_KEY) || "{}") } catch { return {} }
  }

  const recordPlay = useCallback((game) => {
    const id = game.id || game.profile
    const counts = getPlayCounts()
    counts[id] = (counts[id] || 0) + 1
    localStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(counts))

    const lastPlayed = getLastPlayed()
    lastPlayed[id] = Date.now()
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(lastPlayed))
  }, [])

  const getCount = useCallback((game) => {
    const id = game.id || game.profile
    return getPlayCounts()[id] || 0
  }, [])

  const getLastPlayedTime = useCallback((game) => {
    const id = game.id || game.profile
    const ts = getLastPlayed()[id]
    if (!ts) return null
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return "Just now"
    if (mins < 60) return mins + " min ago"
    if (hours < 24) return hours + " hr ago"
    return days + " day" + (days > 1 ? "s" : "") + " ago"
  }, [])

  return { recordPlay, getCount, getLastPlayedTime }
}
