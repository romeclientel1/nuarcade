import { useState, useEffect } from 'react'

const CURRENT_VERSION = "4.4.55"
const RELEASES_URL    = 'https://github.com/romeclientel1/nuarcade/releases'
const GITHUB_API      = 'https://api.github.com/repos/romeclientel1/nuarcade/releases/latest'

// Compare semver strings -- returns true if remote > local
function isNewer(remote, local) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number)
  const [rMaj, rMin, rPat] = parse(remote)
  const [lMaj, lMin, lPat] = parse(local)
  if (rMaj !== lMaj) return rMaj > lMaj
  if (rMin !== lMin) return rMin > lMin
  return rPat > lPat
}

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [remoteVersion,   setRemoteVersion  ] = useState(null)

  useEffect(() => {
    fetch(GITHUB_API)
      .then(r => r.json())
      .then(data => {
        const tag = data.tag_name || ''
        if (tag && isNewer(tag, CURRENT_VERSION)) {
          setRemoteVersion(tag.replace(/^v/, ''))
          setUpdateAvailable(true)
        }
      })
      .catch(() => {}) // Silent fail -- no banner on network error
  }, [])

  const handleDownload = () => {
    // Open releases page in browser then close the app
    window.nuarcade?.openExternal?.(RELEASES_URL)
    setTimeout(() => window.nuarcade?.closeApp?.(), 500)
  }

  return { updateAvailable, remoteVersion, currentVersion: CURRENT_VERSION, handleDownload }
}
