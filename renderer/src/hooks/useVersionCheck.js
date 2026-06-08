import { useState, useEffect } from "react"

const CURRENT_VERSION = "2.8.0"
const RELEASES_API = "https://api.github.com/repos/romeclientel1/nuarcade/releases/latest"

export function useVersionCheck() {
  const [newVersion, setNewVersion] = useState(null)
  const [releaseUrl, setReleaseUrl] = useState(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    checkVersion()
  }, [])

  const checkVersion = async () => {
    try {
      setChecking(true)
      const res = await fetch(RELEASES_API)
      if (!res.ok) return
      const data = await res.json()
      const latest = data.tag_name?.replace("v", "") || "1.0.0"
      if (latest !== CURRENT_VERSION) {
        setNewVersion(latest)
        setReleaseUrl(data.html_url)
      }
    } catch (e) {
      // silent fail
    } finally {
      setChecking(false)
    }
  }

  return { newVersion, releaseUrl, checking }
}
