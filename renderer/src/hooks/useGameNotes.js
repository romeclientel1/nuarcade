import { useState, useCallback } from "react"

const NOTES_KEY = "nuarcade_notes"

export function useGameNotes() {
  const getNotes = () => {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}") } catch { return {} }
  }

  const getNote = useCallback((game) => {
    const id = game.id || game.profile
    return getNotes()[id] || ""
  }, [])

  const saveNote = useCallback((game, note) => {
    const id = game.id || game.profile
    const notes = getNotes()
    if (note.trim()) {
      notes[id] = note
    } else {
      delete notes[id]
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  }, [])

  return { getNote, saveNote }
}
