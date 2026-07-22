import { useState, useEffect } from 'react'
import styles from './Updater.module.css'
import { useI18n } from '../../i18n/I18nContext.js'

export default function Updater({ onDismiss }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState('checking')
  const [newGames, setNewGames] = useState([])

  useEffect(() => {
    runUpdate()
  }, [])

  const runUpdate = async () => {
    try {
      // Just check GitHub for new TP game profiles -- skip ParrotPatcher entirely
      const newlyAdded = await checkForNewGames()
      if (newlyAdded.length > 0) {
        setNewGames(newlyAdded)
        setPhase('newgames')
      } else {
        setPhase('uptodate')
        setTimeout(onDismiss, 1500)
      }
    } catch {
      setPhase('uptodate')
      setTimeout(onDismiss, 1000)
    }
  }

  const checkForNewGames = async () => {
    try {
      const lastCheck = localStorage.getItem('nuarcade_last_check')
      const now = Date.now()
      localStorage.setItem('nuarcade_last_check', now)
      if (!lastCheck) return []

      const since = new Date(parseInt(lastCheck)).toISOString()
      const res = await fetch(
        `https://api.github.com/repos/teknogods/TeknoParrotUI/commits?path=GameProfiles&since=${since}&per_page=10`,
        { signal: AbortSignal.timeout(4000) }
      )
      if (!res.ok) return []
      const commits = await res.json()
      if (!commits.length) return []

      return commits
        .map(c => c.commit.message.split('\n')[0].trim())
        .filter(m => m.toLowerCase().includes('add'))
        .slice(0, 3)
    } catch {
      return []
    }
  }

  if (phase === 'checking') {
    return (
      <div className={styles.banner}>
        <div className={styles.spinner} />
        <div className={styles.text}>{t("updater.checking")}</div>
      </div>
    )
  }

  if (phase === 'newgames') {
    return (
      <div className={styles.banner} style={{ borderColor: 'rgba(0,200,255,0.4)', background: 'rgba(0,200,255,0.06)' }}>
        <div className={styles.icon}>{t("updater.newBadge")}</div>
        <div className={styles.content}>
          <div className={styles.title}>
            {t("updater.newGamesTitle", { count: newGames.length, unit: newGames.length > 1 ? t("common.games") : t("common.game") })}
          </div>
          <div className={styles.sub}>{newGames[0]}{newGames.length > 1 ? " " + t("updater.newGamesMore", { count: newGames.length - 1 }) : ""}</div>
        </div>
        <button className={styles.dismissBtn} onClick={onDismiss}>X</button>
      </div>
    )
  }

  return null
}
