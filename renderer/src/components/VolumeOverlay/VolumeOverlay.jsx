import { useState, useEffect, useRef } from 'react'
import styles from './VolumeOverlay.module.css'
import { useI18n } from '../../i18n/I18nContext.js'

export default function VolumeOverlay() {
  const { t } = useI18n()
  const [volume, setVolume] = useState(80)
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef(null)

  const show = (newVol) => {
    setVolume(newVol)
    setVisible(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setVisible(false), 2000)
  }

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '+' || e.key === '=') show(v => Math.min(100, v + 5))
      if (e.key === '-' || e.key === '_') show(v => Math.max(0, v - 5))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!visible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.icon}>{volume === 0 ? t("volumeOverlay.mute") : volume < 40 ? t("volumeOverlay.low") : t("volumeOverlay.volume")}</div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${volume}%` }} />
      </div>
      <div className={styles.label}>{volume}%</div>
    </div>
  )
}
