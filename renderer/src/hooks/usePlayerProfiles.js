// usePlayerProfiles -- manages player profiles stored in localStorage
// Each profile: { id, name, color, createdAt, lastSeen, totalPlaytime, favoriteGame }

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

export function usePlayerProfiles() {
  const [profiles, setProfiles] = useState(() => loadProfiles())
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || null)

  const activeProfile = profiles.find(p => p.id === activeId) || null

  const addProfile = useCallback((name) => {
    const id = 'player_' + Date.now()
    const color = COLORS[profiles.length % COLORS.length]
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
    const next = [...profiles, profile]
    setProfiles(next)
    saveProfiles(next)
    return profile
  }, [profiles])

  const selectProfile = useCallback((id) => {
    // Update lastSeen
    const next = profiles.map(p =>
      p.id === id ? { ...p, lastSeen: Date.now() } : p
    )
    setProfiles(next)
    saveProfiles(next)
    setActiveId(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }, [profiles])

  const selectGuest = useCallback(() => {
    setActiveId(null)
    localStorage.removeItem(ACTIVE_KEY)
  }, [])

  const updateProfile = useCallback((id, updates) => {
    const next = profiles.map(p => p.id === id ? { ...p, ...updates } : p)
    setProfiles(next)
    saveProfiles(next)
  }, [profiles])

  const deleteProfile = useCallback((id) => {
    const next = profiles.filter(p => p.id !== id)
    setProfiles(next)
    saveProfiles(next)
    if (activeId === id) {
      setActiveId(null)
      localStorage.removeItem(ACTIVE_KEY)
    }
  }, [profiles, activeId])

  // Record a game play session
  const recordPlay = useCallback((gameId, gameTitle, playtimeMs) => {
    if (!activeId) return
    const profile = profiles.find(p => p.id === activeId)
    if (!profile) return

    // Track per-game playtime
    const ptKey = 'nuarcade_playtime_' + activeId
    try {
      const pt = JSON.parse(localStorage.getItem(ptKey) || '{}')
      pt[gameId] = (pt[gameId] || 0) + playtimeMs
      localStorage.setItem(ptKey, JSON.stringify(pt))

      // Find favorite (most played)
      const sorted = Object.entries(pt).sort((a, b) => b[1] - a[1])
      const favoriteGame = sorted[0]?.[0] || null

      updateProfile(activeId, {
        totalPlaytime: (profile.totalPlaytime || 0) + playtimeMs,
        gamesPlayed: (profile.gamesPlayed || 0) + 1,
        favoriteGame,
      })
    } catch {}
  }, [activeId, profiles, updateProfile])

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
