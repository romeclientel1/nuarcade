import { useState, useCallback } from "react"

const NOTES_KEY   = "nuarcade_notes"
const RATINGS_KEY = "nuarcade_ratings"

function getStore(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") } catch { return {} }
}
function saveStore(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

export function useGameNotes() {
  const getNote = useCallback((game) => {
    const id = game.id || game.profile
    return getStore(NOTES_KEY)[id] || ""
  }, [])

  const saveNote = useCallback((game, note) => {
    const id = game.id || game.profile
    const notes = getStore(NOTES_KEY)
    if (note.trim()) notes[id] = note.trim()
    else delete notes[id]
    saveStore(NOTES_KEY, notes)
  }, [])

  const getRating = useCallback((game) => {
    const id = game.id || game.profile
    return getStore(RATINGS_KEY)[id] || 0
  }, [])

  const saveRating = useCallback((game, rating) => {
    const id = game.id || game.profile
    const ratings = getStore(RATINGS_KEY)
    if (rating > 0) ratings[id] = rating
    else delete ratings[id]
    saveStore(RATINGS_KEY, ratings)
  }, [])

  const getAllRatings = useCallback(() => getStore(RATINGS_KEY), [])

  return { getNote, saveNote, getRating, saveRating, getAllRatings }
}
