import { useState, useCallback } from "react"

// useDestination -----------------------------------------------------------
// Minimal "where is the player" state for Wheel-owned overlays that are
// genuine destinations (not modals, not transient overlays -- see the
// classification in the Vespara migration plan). A plain in-memory stack --
// no transition metadata, no animation names, no camera information, no
// destination registry, no event emitter, no route objects, no persistence,
// no history integration, no Vespara scene concepts.
//
// null means "at Wheel's base view." That assumption stays internal to this
// hook and its consumer -- it does not imply Wheel is permanently Vespara
// Home, and nothing here exposes that language.
export function useDestination() {
  const [stack, setStack] = useState([{ id: null, params: undefined }])

  const current = stack[stack.length - 1]

  const navigate = useCallback((id, params) => {
    setStack((s) => {
      const top = s[s.length - 1]
      // Idempotent: navigating to the already-current destination must not
      // push a duplicate entry. Repeated input -- a held button, a double
      // keypress, a toggle shortcut fired twice -- must never produce
      // base -> help -> help -> help.
      if (top.id === id) return s
      return [...s, { id, params }]
    })
  }, [])

  const goHome = useCallback(() => {
    setStack((s) => (s.length === 1 && s[0].id === null ? s : [{ id: null, params: undefined }]))
  }, [])

  const back = useCallback(() => {
    // No-op at the base -- also what makes rapid/repeated Back input safe
    // by construction: once popped to the base, further calls change
    // nothing, regardless of how many fire in a row.
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }, [])

  return {
    currentDestination: current.id,
    params: current.params,
    navigate,
    goHome,
    back,
    canGoBack: stack.length > 1,
  }
}
