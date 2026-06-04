import { useState, useEffect } from 'react'
import { useGameLibrary } from '../../hooks/useGameLibrary'
import styles from './Wheel.module.css'

const CATEGORIES = ['All', 'Racing', 'Fighting', 'Shooter', 'Rhythm', 'Flying', 'Sports', 'Pinball']

export default function Wheel() {
  const { games, stats, loading, error } = useGameLibrary()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState('All')
  const [launching, setLaunching] = useState(false)

  const filteredGames = activeCategory === 'All'
    ? games
    : games.filter(g => g.genre === activeCategory)

  const current = filteredGames[selectedIndex] || filteredGames[0]

  useEffect(() => { setSelectedIndex(0) }, [activeCategory])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  setSelectedIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setSelectedIndex(i => Math.min(filteredGames.length - 1, i + 1))
      if (e.key === 'Enter')      handleLaunch()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filteredGames, selectedIndex])

  const handleLaunch = async () => {
    if (launching || !current) return
    setLaunching(true)
    if (window.nuarcade) {
      await window.nuarcade.launchGame(current.profilePath || current.profile)
    } else {
      console.log('Dev mode — would launch:', current.profile)
    }
    setTimeout(() => setLaunching(false), 3000)
  }

  const getCardClass = (index) => {
    const diff = index - selectedIndex
    const n = filteredGames.length
    const wrapped = ((diff % n) + n) % n
    const signed = wrapped > n / 2 ? wrapped - n : wrapped
    if (signed === 0)  return styles.cardCenter
    if (signed === -1) return styles.cardNear
    if (signed === 1)  return styles.cardNearRight
    if (signed === -2) return styles.cardFar
    if (signed === 2)  return styles.cardFarRight
    if (signed === -3) return styles.cardEdge
    if (signed === 3)  return styles.cardEdgeRight
    return styles.cardHidden
  }

  if (loading) return (
    <div className={styles.stage}>
      <div className={styles.bgGrid} />
      <div className={styles.loadingMsg}>
        <div className={styles.loadingSpinner} />
        <div>Scanning game library...</div>
      </div>
    </div>
  )

  return (
    <div className={styles.stage}>
      <div className={styles.bgGrid} />
      <div className={styles.bgVignette} />

      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoNu}>Nu</span>
          <span className={styles.logoArcade}>Arcade</span>
        </div>
        <div className={styles.headerRight}>
          {stats && (
            <div className={styles.statsRow}>
              {stats.devMode && <span className={styles.devBadge}>DEV MODE</span>}
              <span className={styles.gameCount}>{filteredGames.length} games</span>
              {stats.hidden > 0 && (
                <span className={styles.hiddenCount}>{stats.hidden} hidden</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.categoryStrip}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`${styles.catPill} ${activeCategory === cat ? styles.catActive : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredGames.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🕹️</div>
          <div className={styles.emptyTitle}>No games in this category</div>
          <div className={styles.emptySub}>Try selecting a different category above</div>
        </div>
      ) : (
        <div className={styles.wheelArea}>
          <button className={styles.navBtn} onClick={() => setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length)}>‹</button>
          <div className={styles.cardTrack}>
            {filteredGames.map((game, index) => (
              <div
                key={game.id || game.profile}
                className={`${styles.card} ${getCardClass(index)}`}
                onClick={() => {
                  if (index === selectedIndex) handleLaunch()
                  else setSelectedIndex(index)
                }}
              >
                <div className={styles.cardArt}>{game.icon || '🎮'}</div>
                <div className={styles.cardGradient} />
                <div className={styles.cardStatus} style={{ background: game.status === 'Perfect' ? '#00ff88' : '#ffaa00' }} />
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{game.title}</div>
                  <div className={styles.cardSys}>{game.system}</div>
                </div>
                {index === selectedIndex && (
                  <div className={styles.playOverlay}>
                    <div className={styles.playIcon}>▶</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className={styles.navBtn} onClick={() => setSelectedIndex(i => (i + 1) % filteredGames.length)}>›</button>
        </div>
      )}

      {current && filteredGames.length > 0 && (
        <div className={styles.infoPanel}>
          <div className={styles.infoLeft}>
            <div className={styles.infoTitle}>{current.title}</div>
            <div className={styles.infoMeta}>
              <span className={styles.tagSystem}>{current.system}</span>
              <span className={styles.tagGenre}>{current.genre}</span>
              <span className={current.status === 'Perfect' ? styles.tagPerfect : styles.tagGreat}>
                {current.status}
              </span>
            </div>
            <div className={styles.infoExe}>
              TeknoParrotUi.exe --profile=<span>{current.profile}</span>
            </div>
          </div>
          <div className={styles.infoRight}>
            <button className={styles.launchBtn} onClick={handleLaunch} disabled={launching}>
              {launching ? '⏳ Launching...' : '▶ Launch Game'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}