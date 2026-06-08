import { useState, useEffect } from "react"

const REPO = "romeclientel1/nuarcade"
const CHECK_KEY = "nuarcade_last_update_check"
const CHECK_INTERVAL = 1000 * 60 * 60 * 6 // 6 hours

export function useAutoUpdate(currentVersion) {
  const [newVersion,   setNewVersion  ] = useState(null)
  const [releaseUrl,   setReleaseUrl  ] = useState(null)
  const [releaseNotes, setReleaseNotes] = useState(null)
  const [dismissed,    setDismissed   ] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const last = parseInt(localStorage.getItem(CHECK_KEY) || "0")
        if (Date.now() - last < CHECK_INTERVAL) return
        localStorage.setItem(CHECK_KEY, Date.now())

        const res = await fetch(
          "https://api.github.com/repos/" + REPO + "/releases/latest",
          { headers: { Accept: "application/vnd.github.v3+json" } }
        )
        if (!res.ok) return
        const data = await res.json()
        const latest = data.tag_name?.replace(/^v/, "")
        if (!latest || latest === currentVersion) return

        setNewVersion(latest)
        setReleaseUrl(data.html_url)
        setReleaseNotes(data.body?.slice(0, 200) || null)
      } catch {}
    }
    check()
  }, [currentVersion])

  const dismiss = () => setDismissed(true)

  return {
    hasUpdate: !!newVersion && !dismissed,
    newVersion,
    releaseUrl,
    releaseNotes,
    dismiss,
  }
}
