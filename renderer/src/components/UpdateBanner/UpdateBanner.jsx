import { useState, useEffect } from 'react'
import styles from './UpdateBanner.module.css'
import { useI18n } from '../../i18n/I18nContext.js'

// States: idle -> downloading -> ready -> installing
export default function UpdateBanner({ newVersion, releaseUrl, downloadUrl, releaseNotes, onDismiss }) {
  const { t } = useI18n()
  const [phase,    setPhase   ] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error,    setError   ] = useState(null)

  useEffect(() => {
    if (!window.nuarcade?.onUpdateProgress) return
    window.nuarcade.onUpdateProgress(({ pct }) => setProgress(pct))
  }, [])

  const handleDownload = async () => {
    if (!downloadUrl) {
      // No direct download URL -- open GitHub releases page
      window.open(releaseUrl, '_blank')
      return
    }
    setPhase('downloading')
    setProgress(0)
    try {
      const result = await window.nuarcade.downloadUpdate({
        version: newVersion,
        downloadUrl,
      })
      if (result.success) {
        setPhase('ready')
      } else {
        setError(result.error || t("updateBanner.downloadFailed"))
        setPhase('error')
      }
    } catch (e) {
      setError(e.message || t("updateBanner.downloadFailed"))
      setPhase('error')
    }
  }

  const handleInstall = async () => {
    setPhase('installing')
    // installer path is in temp dir
    const os = window.require ? window.require('os') : null
    const installerPath = (os?.tmpdir() || 'C:\\Users\\Public') + '\\NuArcade-Setup-' + newVersion + '.exe'
    try {
      await window.nuarcade.installUpdate({ installerPath })
      // app will quit itself after spawning installer
    } catch (e) {
      setError(e.message || t("updateBanner.installFailed"))
      setPhase('error')
    }
  }

  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <div className={styles.badge}>{t("updateBanner.badge")}</div>
        <div className={styles.text}>
          <span className={styles.title}>{t("updateBanner.available", { version: newVersion })}</span>
          {phase === 'idle' && (
            <span className={styles.notes}>{releaseNotes || t("updateBanner.readyToDownload")}</span>
          )}
          {phase === 'downloading' && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar} style={{ width: progress + '%' }} />
              <span className={styles.progressLabel}>{t("updateBanner.downloadingPct", { progress })}</span>
            </div>
          )}
          {phase === 'ready' && (
            <span className={styles.notes}>{t("updateBanner.readyToInstall")}</span>
          )}
          {phase === 'installing' && (
            <span className={styles.notes}>{t("updateBanner.installingRestart")}</span>
          )}
          {phase === 'error' && (
            <span className={styles.notes} style={{ color: '#ff5555' }}>{t("updateBanner.errorPrefix")} {error}</span>
          )}
        </div>
      </div>
      <div className={styles.right}>
        {phase === 'idle' && (
          <>
            <button className={styles.downloadBtn} onClick={handleDownload}>
              {downloadUrl ? t("updateBanner.download") : t("updateBanner.viewRelease")}
            </button>
            <button className={styles.dismissBtn} onClick={onDismiss}>{t("updateBanner.later")}</button>
          </>
        )}
        {phase === 'downloading' && (
          <button className={styles.dismissBtn} disabled>{t("updateBanner.downloadingEllipsis")}</button>
        )}
        {phase === 'ready' && (
          <>
            <button className={styles.downloadBtn} onClick={handleInstall}>{t("updateBanner.installNow")}</button>
            <button className={styles.dismissBtn} onClick={onDismiss}>{t("updateBanner.later")}</button>
          </>
        )}
        {phase === 'error' && (
          <>
            <button className={styles.downloadBtn} onClick={() => window.open(releaseUrl, '_blank')}>
              {t("updateBanner.manualDownload")}
            </button>
            <button className={styles.dismissBtn} onClick={onDismiss}>{t("updateBanner.dismiss")}</button>
          </>
        )}
        {phase === 'installing' && (
          <button className={styles.dismissBtn} disabled>{t("updateBanner.restarting")}</button>
        )}
      </div>
    </div>
  )
}
