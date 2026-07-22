import { useState, useEffect } from 'react'
import styles from './CoinCounter.module.css'
import { useI18n } from '../../i18n/I18nContext.js'

const COIN_KEY = 'nuarcade_total_launches'

export default function CoinCounter({ lastLaunch }) {
  const { t } = useI18n()
  const [total, setTotal] = useState(() => {
    try { return parseInt(localStorage.getItem(COIN_KEY) || '0') } catch { return 0 }
  })
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!lastLaunch) return
    setTotal(t => {
      const next = t + 1
      try { localStorage.setItem(COIN_KEY, next) } catch {}
      return next
    })
    setFlash(true)
    setTimeout(() => setFlash(false), 600)
  }, [lastLaunch])

  return (
    <div className={`${styles.counter} ${flash ? styles.flash : ''}`}>
      <span className={styles.icon}>{t("coinCounter.coin")}</span>
      <span className={styles.num}>{total.toLocaleString()}</span>
      <span className={styles.label}>{t("coinCounter.plays")}</span>
    </div>
  )
}
