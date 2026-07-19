import { createContext, useContext, useState, useCallback, useMemo } from "react"
import { usePlayerProfiles } from "../hooks/usePlayerProfiles"

const ProfileContext = createContext(null)

// Matches the object App.jsx has always fabricated locally for Guest
// sessions -- module-scoped so it's referentially stable across renders,
// never a fresh object each time.
const GUEST_PROFILE = { name: "Guest", id: "guest" }

// ProfileProvider ---------------------------------------------------------
// The single authoritative owner of usePlayerProfiles(). Everything below
// App.jsx in the tree should read profile state from useProfiles() instead
// of calling the hook directly -- there must only ever be one instance of
// it mounted.
export function ProfileProvider({ children }) {
  const {
    profiles,
    activeProfile: hookActiveProfile,
    activeId,
    addProfile: hookAddProfile,
    selectProfile: hookSelectProfile,
    selectGuest: hookSelectGuest,
    updateProfile,
    deleteProfile,
    recordPlay,
  } = usePlayerProfiles()

  // selectGuest() clears the hook's own activeId to null -- identical to
  // what happens when the active profile gets deleted. The hook alone
  // can't tell "explicitly chose Guest" apart from "nobody selected yet."
  // This stays internal, not part of the public Context value, so there is
  // still exactly one public meaning of "active profile."
  const [isGuestSession, setIsGuestSession] = useState(false)

  // The underlying hook reads its own activeId from localStorage on mount,
  // so hookActiveProfile can already be non-null the instant the Provider
  // mounts -- reflecting whatever was active last session, before Player
  // Select has run at all this session. Gating on an explicit "chose this
  // session" flag keeps activeProfile at null until a real selection
  // happens here, matching how App.jsx's own session state has always
  // behaved (a plain useState(null) with no persistence) and keeping a
  // persisted activeId from ever silently bypassing Player Select.
  const [hasSelectedThisSession, setHasSelectedThisSession] = useState(false)

  const selectProfile = useCallback((id) => {
    setIsGuestSession(false)
    setHasSelectedThisSession(true)
    hookSelectProfile(id)
  }, [hookSelectProfile])

  const selectGuest = useCallback(() => {
    setIsGuestSession(true)
    setHasSelectedThisSession(true)
    hookSelectGuest()
  }, [hookSelectGuest])

  const addProfile = useCallback((name) => {
    setIsGuestSession(false)
    setHasSelectedThisSession(true)
    // addProfile() already sets activeId and persists nuarcade_active_profile
    // internally -- do not also call selectProfile() here, that would be a
    // redundant duplicate write of the same value.
    return hookAddProfile(name)
  }, [hookAddProfile])

  const activeProfile = !hasSelectedThisSession ? null : (isGuestSession ? GUEST_PROFILE : hookActiveProfile)

  const value = useMemo(() => ({
    profiles,
    activeProfile,
    activeId,
    addProfile,
    selectProfile,
    selectGuest,
    updateProfile,
    deleteProfile,
    recordPlay,
  }), [profiles, activeProfile, activeId, addProfile, selectProfile, selectGuest, updateProfile, deleteProfile, recordPlay])

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfiles() {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error("useProfiles() must be called within a <ProfileProvider>. Did you forget to wrap the app root in main.jsx?")
  }
  return ctx
}
