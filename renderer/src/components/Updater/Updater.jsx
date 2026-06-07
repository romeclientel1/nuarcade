import { useState, useEffect } from 'react'
import styles from './Updater.module.css'

export default function Updater({ onDismiss }) {
  const [phase, setPhase] = useState('checking') // checking | updating | newgames | uptodate | error
  const [newGames, setNewGames] = useState([])
  const [progress, setProgress] = useState('')

  useEffect(() => {
    runUpdate()
  }, [])

  const runUpdate = async () => {
    setPhase('checking')

    try {
      // Step 1 ? run ParrotPatcher silently
      if (window.nuarcade && window.nuarcade.platform === 'win32') {
        setProgress('Running TeknoParrot updater...')
        setPhase('updating')
        await window.nuarcade.runUpdater()
      } else {
        // Mac dev mode ? simulate
        await delay(800)
      }

      // Step 2 ? check GitHub for new profiles
      setProgress('Checking for new games...')
      const newlyAdded = await checkForNewGames()

      if (newlyAdded.length > 0) {
        setNewGames(newlyAdded)
        setPhase('newgames')
      } else {
        setPhase('uptodate')
        setTimeout(onDismiss, 2000)
      }
    } catch (err) {
      console.error('Update error:', err)
      setPhase('uptodate')
      setTimeout(onDismiss, 1500)
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
        `https://api.github.com/repos/teknogods/TeknoParrotUI/commits?path=GameProfiles&since=${since}&per_page=20`
      )

      if (!res.ok) return []

      const commits = await res.json()
      if (!commits.length) return []

      // Extract game names from commit messages
      const games = commits
        .map(c => c.commit.message)
        .filter(m => m.toLowerCase().includes('add') || m.toLowerCase().includes('update'))
        .slice(0, 5)
        .map(m => m.split('\n')[0].trim())

      return games
    } catch (e) {
      return []
    }
  }

  if (phase === 'checking' || phase === 'updating') {
    return (
      <div className={styles.banner}>
        <div className={styles.spinner} />
        <div className={styles.text}>{progress || 'Checking for updates...'}</div>
      </div>
    )
  }

  if (phase === 'newgames') {
    return (
      <div className={styles.banner} style={{ borderColor: 'rgba(0,200,255,0.4)', background: 'rgba(0,200,255,0.06)' }}>
        <div className={styles.icon}>?</div>
        <div className={styles.content}>
          <div className={styles.title}>{newGames.length} new game{newGames.length > 1 ? 's' : ''} added to TeknoParrot!</div>
          <div className={styles.sub}>{newGames[0]}{newGames.length > 1 ? ` and ${newGames.length - 1} more` : ''}</div>
        </div>
        <button className={styles.dismissBtn} onClick={onDismiss}>?</button>
      </div>
    )
  }

  if (phase === 'uptodate') {
    return (
      <div className={styles.banner} style={{ borderColor: 'rgba(0,255,136,0.3)', background: 'rgba(0,255,136,0.04)' }}>
        <div className={styles.icon} style={{ color: '#00ff88' }}>?</div>
        <div className={styles.text} style={{ color: 'rgba(0,255,136,0.8)' }}>TeknoParrot is up to date</div>
      </div>
    )
  }

  return null
}

const delay = ms => new Promise(r => setTimeout(r, ms))