import { useState, useCallback } from 'react'

const STORAGE_KEY = 'nuarcade_profiles'
const ACTIVE_KEY  = 'nuarcade_active_profile'

const COLORS = [
  '#00c8ff', '#ff3c7d', '#00ff88', '#ff6b00',
  '#cc00ff', '#ffcc00', '#ff0055', '#00ffcc',
]

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveProfiles(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

function getActiveId() {
  return localStorage.getItem(ACTIVE_KEY) || null
}

export function usePlayerProfiles() {
  const [profiles, setProfiles] = useState(() => loadProfiles())
  const [activeId, setActiveId] = useState(() => getActiveId())

  // Always derive from current profiles + current activeId
  const activeProfile = profiles.find(p => p.id === activeId) || null

  const addProfile = useCallback((name) => {
    const current = loadProfiles() // read fresh from storage
    const id = 'player_' + Date.now()
    const color = COLORS[current.length % COLORS.length]
    const profile = {
      id,
      name: name.trim().slice(0, 12).toUpperCase(),
      color,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      totalPlaytime: 0,
      gamesPlayed: 0,
      favoriteGame: null,
    }
    const next = [...current, profile]
    // Write to storage FIRST, then update state
    saveProfiles(next)
    localStorage.setItem(ACTIVE_KEY, id)
    // Update state synchronously in one batch
    setProfiles(next)
    setActiveId(id)
    return profile
  }, [])

  const selectProfile = useCallback((id) => {
    const current = loadProfiles()
    const next = current.map(p =>
      p.id === id ? { ...p, lastSeen: Date.now() } : p
    )
    saveProfiles(next)
    localStorage.setItem(ACTIVE_KEY, id)
    setProfiles(next)
    setActiveId(id)
  }, [])

  const selectGuest = useCallback(() => {
    localStorage.removeItem(ACTIVE_KEY)
    setActiveId(null)
  }, [])

  const updateProfile = useCallback((id, updates) => {
    const current = loadProfiles()
    const next = current.map(p => p.id === id ? { ...p, ...updates } : p)
    saveProfiles(next)
    setProfiles(next)
  }, [])

  const deleteProfile = useCallback((id) => {
    const current = loadProfiles()
    const next = current.filter(p => p.id !== id)
    saveProfiles(next)
    if (getActiveId() === id) {
      localStorage.removeItem(ACTIVE_KEY)
      setActiveId(null)
    }
    setProfiles(next)
  }, [])

  const recordPlay = useCallback((gameId, gameTitle, playtimeMs) => {
    const id = getActiveId()
    if (!id) return
    const current = loadProfiles()
    const profile = current.find(p => p.id === id)
    if (!profile) return

    const ptKey = 'nuarcade_playtime_' + id
    try {
      const pt = JSON.parse(localStorage.getItem(ptKey) || '{}')
      pt[gameId] = (pt[gameId] || 0) + playtimeMs
      localStorage.setItem(ptKey, JSON.stringify(pt))
      const sorted = Object.entries(pt).sort((a, b) => b[1] - a[1])
      const favoriteGame = sorted[0]?.[0] || null
      const next = current.map(p => p.id === id ? {
        ...p,
        totalPlaytime: (p.totalPlaytime || 0) + playtimeMs,
        gamesPlayed: (p.gamesPlayed || 0) + 1,
        favoriteGame,
      } : p)
      saveProfiles(next)
      setProfiles(next)
    } catch {}
  }, [])

  return {
    profiles,
    activeProfile,
    activeId,
    addProfile,
    selectProfile,
    selectGuest,
    updateProfile,
    deleteProfile,
    recordPlay,
  }
}
