import { useState, useEffect } from 'react'

const CURRENT_VERSION = "5.6.4"

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [remoteVersion,   setRemoteVersion  ] = useState(null)
  const [downloadUrl,     setDownloadUrl    ] = useState(null)
  const [installing,      setInstalling     ] = useState(false)
  const [progress,        setProgress       ] = useState(null)
  const [installError,    setInstallError   ] = useState(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res  = await fetch('https://api.github.com/repos/romeclientel1/nuarcade/releases/latest')
        const data = await res.json()
        const tag  = (data.tag_name || '').replace(/^v/, '')
        if (tag && tag !== CURRENT_VERSION) {
          setUpdateAvailable(true)
          setRemoteVersion(tag)
          const exeAsset = (data.assets || []).find(function(a) {
            return a.name.toLowerCase().endsWith('.exe') && a.name.toLowerCase().includes('setup')
          }) || (data.assets || [])[0]
          if (exeAsset) setDownloadUrl(exeAsset.browser_download_url)
        }
      } catch (_) {}
    }
    check()
  }, [])

  const handleDownload = () => {
    window.open('https://github.com/romeclientel1/nuarcade/releases/latest', '_blank')
  }

  const handleUpdateNow = async () => {
    if (!downloadUrl || !remoteVersion || !window.nuarcade || !window.nuarcade.downloadUpdate) {
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
      const dl = await window.nuarcade.downloadUpdate({ version: remoteVersion, downloadUrl })
      if (!dl || !dl.success) {
        setInstallError((dl && dl.error) || 'Download failed')
        setInstalling(false)
        return
      }
      const inst = await window.nuarcade.installUpdate({ installerPath: dl.installerPath })
      if (!inst || !inst.success) {
        setInstallError((inst && inst.error) || 'Install failed')
        setInstalling(false)
      }
    } catch (e) {
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
