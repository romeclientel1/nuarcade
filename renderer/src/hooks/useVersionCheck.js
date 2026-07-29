import { useState, useEffect } from 'react'

const CURRENT_VERSION = "6.0.2"

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [remoteVersion,   setRemoteVersion  ] = useState(null)
  const [installing,      setInstalling     ] = useState(false)
  const [progress,        setProgress       ] = useState(null)
  const [installError,    setInstallError   ] = useState(null)

  useEffect(() => {
    // R0 Commit 5 (amended): the availability check itself is now main-
    // owned. This hook no longer fetches GitHub, parses release JSON, or
    // constructs any GitHub URL -- it only asks the main process "is
    // anything newer than my current version" and receives back a plain
    // { updateAvailable, version } display fact. The main process (see
    // src/main/updater.js's checkForUpdate) independently queries the
    // latest-release endpoint, validates the tag strictly (v<N>.<N>.<N>, no
    // prerelease/path-like content), and compares versions numerically --
    // none of that logic or its intermediate data (the release object,
    // any asset, any URL) ever reaches here.
    const check = async () => {
      try {
        if (!window.nuarcade || !window.nuarcade.checkForUpdate) return
        const result = await window.nuarcade.checkForUpdate({ currentVersion: CURRENT_VERSION })
        if (result && result.success && result.updateAvailable && result.version) {
          setUpdateAvailable(true)
          setRemoteVersion(result.version)
        }
      } catch (_) {}
    }
    check()
  }, [])

  const handleDownload = () => {
    // Plain repository homepage, not a releases/API URL -- this is a manual
    // browser-navigation fallback for the Traveler to find the Releases
    // tab themselves, not an in-app release lookup or asset selection.
    window.open('https://github.com/romeclientel1/nuarcade', '_blank')
  }

  const handleUpdateNow = async () => {
    // Confirms the click itself actually reached this handler, and with
    // what remote version -- previously nothing logged this at all, so a
    // packaged build's stdout gave no evidence Update Now had even fired.
    console.log('[useVersionCheck] Update Now clicked', { remoteVersion })

    if (!remoteVersion || !window.nuarcade || !window.nuarcade.downloadUpdate) {
      console.log('[useVersionCheck] falling back to manual download (no remoteVersion or bridge unavailable)')
      handleDownload()
      return
    }
    setInstallError(null)
    setInstalling(true)
    setProgress(0)
    if (window.nuarcade.onUpdateProgress) {
      window.nuarcade.onUpdateProgress(function(data) { setProgress(data.pct) })
    }
    try {
      // Only the version is sent -- the main process independently looks
      // up the release, selects the exact installer/checksum assets,
      // verifies the download, and returns an opaque single-use token.
      // Nothing about a URL or filesystem path ever passes through here.
      const dl = await window.nuarcade.downloadUpdate({ version: remoteVersion })
      if (!dl || !dl.success || !dl.token) {
        const reason = (dl && dl.error) || 'Download failed'
        console.error('[useVersionCheck] downloadUpdate failed:', reason)
        setInstallError(reason)
        setInstalling(false)
        return
      }
      console.log('[useVersionCheck] downloadUpdate succeeded, installing')
      const inst = await window.nuarcade.installUpdate({ token: dl.token })
      if (!inst || !inst.success) {
        const reason = (inst && inst.error) || 'Install failed'
        console.error('[useVersionCheck] installUpdate failed:', reason)
        setInstallError(reason)
        setInstalling(false)
      }
    } catch (e) {
      console.error('[useVersionCheck] Update Now threw an unexpected error:', e && e.message)
      setInstallError(e.message)
      setInstalling(false)
    }
  }

  return {
    updateAvailable,
    remoteVersion,
    currentVersion: CURRENT_VERSION,
    handleDownload,
    handleUpdateNow,
    installing,
    progress,
    installError,
  }
}
