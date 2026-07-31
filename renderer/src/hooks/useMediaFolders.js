import { useEffect, useState } from 'react'

// Kept separate from the React effect so the native bridge contract can be
// verified without mounting the renderer. A normal Chrome/Vite preview has no
// Electron preload bridge; that is an unavailable native capability, not a
// successful folder-creation run and not an Electron error.
export async function initializeMediaFolders({ nativeBridge, storage, setStatus, setResult, logger = console }) {
  if (typeof nativeBridge?.ensureMediaFolders !== 'function') {
    setStatus('unavailable')
    return
  }

  setStatus('running')
  try {
    const res = await nativeBridge.ensureMediaFolders()
    if (res.success) {
      storage.setItem('nuarcade_media_folders_created', '1')
      setResult(res)
      setStatus('done')
      logger.log('[MediaFolders] Created', res.created, 'folders in', res.mediaRoot)
    } else {
      setStatus('error')
      logger.error('[MediaFolders] Error:', res.error)
    }
  } catch (err) {
    setStatus('error')
    logger.error('[MediaFolders] IPC error:', err)
  }
}

export function useMediaFolders() {
  const [status, setStatus] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const STORAGE_KEY = 'nuarcade_media_folders_created'
    const already = localStorage.getItem(STORAGE_KEY)
    if (already) return

    // Browser-preview support: initializeMediaFolders explicitly recognizes a
    // missing preload bridge and skips native folder creation without claiming
    // success or persisting the Electron-only completion flag.
    initializeMediaFolders({
      nativeBridge: window.nuarcade,
      storage: localStorage,
      setStatus,
      setResult,
    })
  }, [])

  return { status, result }
}
