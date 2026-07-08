import { useState, useEffect } from 'react'

const CURRENT_VERSION = "5.0.2"

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [remoteVersion,   setRemoteVersion  ] = useState(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res  = await fetch('https://api.github.com/repos/romeclientel1/nuarcade/releases/latest')
        const data = await res.json()
        const tag  = (data.tag_name || '').replace(/^v/, '')
        if (tag && tag !== CURRENT_VERSION) {
          setUpdateAvailable(true)
          setRemoteVersion(tag)
        }
      } catch (_) {}
    }
    check()
  }, [])

  const handleDownload = () => {
    window.open('https://github.com/romeclientel1/nuarcade/releases/latest', '_blank')
  }

  return { updateAvailable, remoteVersion, currentVersion: CURRENT_VERSION, handleDownload }
}
