import { useEffect, useRef, useState } from 'react'
import styles from './Intro.module.css'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import { useI18n } from '../../i18n/I18nContext.js'
import { useOverlayGamepad } from '../../hooks/useOverlayGamepad'

const ARRIVAL_DURATION = 2500
const SAFETY_DURATION = 3500

export default function Intro({ onComplete }) {
  const { currentVersion } = useVersionCheck()
  const { t } = useI18n()
  const [phase, setPhase] = useState('dark')
  const timersRef = useRef([])
  const completedRef = useRef(false)

  const at = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
  }

  const done = () => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete()
  }

  useOverlayGamepad({
    onClose: done,
    onUp: done,
    onDown: done,
    onLeft: done,
    onRight: done,
    onConfirm: done,
    enabled: true,
  })

  useEffect(() => {
    // A calm, bounded arrival sequence. The safety timer remains independent
    // so startup can never become trapped if a visual-stage timer is delayed.
    at(() => setPhase('arrival'), 120)
    at(() => setPhase('recognition'), 900)
    at(() => setPhase('fadeout'), 2100)
    at(() => done(), ARRIVAL_DURATION)
    at(() => done(), SAFETY_DURATION)

    // Arrival is immediately skippable. Completion is guarded by completedRef,
    // so simultaneous input and timeline completion can never fire twice.
    const skip = () => {
      timersRef.current.forEach(clearTimeout)
      done()
    }

    window.addEventListener('keydown', skip)
    window.addEventListener('click', skip)

    return () => {
      timersRef.current.forEach(clearTimeout)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('click', skip)
    }
  }, [])

  const visible = phase !== 'dark'
  const recognized = phase === 'recognition' || phase === 'fadeout'

  return (
    <div
      className={[
        styles.stage,
        visible ? styles.visible : '',
        recognized ? styles.recognized : '',
        phase === 'fadeout' ? styles.fadeOut : '',
      ].join(' ')}
    >
      <div className={styles.depthField} aria-hidden="true" />
      <div className={styles.horizon} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <main className={styles.arrival}>
        <div className={styles.sigils} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className={styles.worldName}>{t("home.worldName")}</div>
        <div className={styles.sanctuary}>{t("home.sanctuary")}</div>

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.status}>
          {t("playerSelect.headline")}
        </div>
      </main>

      <div className={styles.skipHint}>{t("bootScreen.hint")}</div>
      <div className={styles.version}>v{currentVersion}</div>
    </div>
  )
}
