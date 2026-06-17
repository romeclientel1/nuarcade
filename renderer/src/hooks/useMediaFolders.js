import { useEffect, useState } from 'react'

export function useMediaFolders() {
  const [status, setStatus] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const STORAGE_KEY = 'nuarcade_media_folders_created'
    const already = localStorage.getItem(STORAGE_KEY)
    if (already) return

    setStatus('running')
    window.electron.ipcRenderer.invoke('ensure-media-folders')
      .then((res) => {
        if (res.success) {
          localStorage.setItem(STORAGE_KEY, '1')
          setResult(res)
          setStatus('done')
          console.log('[MediaFolders] Created', res.created, 'folders in', res.mediaRoot)
        } else {
          setStatus('error')
          console.error('[MediaFolders] Error:', res.error)
        }
      })
      .catch((err) => {
        setStatus('error')
        console.error('[MediaFolders] IPC error:', err)
      })
  }, [])

  return { status, result }
}
