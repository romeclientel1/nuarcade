import { useState, useEffect, useCallback, useRef } from 'react'
import { useGameLibrary } from '../../hooks/useGameLibrary'
import GameCard from './GameCard'
import AttractMode from './AttractMode'
import MediaManager from '../MediaManager/MediaManager'
import Settings from '../Settings/Settings'
import GameDetail from '../GameDetail/GameDetail'
import { useGamepad } from './useGamepad'
import styles from './Wheel.module.css'

const CATEGORIES = ['All', 'Favorites', 'Recent', 'Racing', 'Fighting', 'Shooter', 'Rhythm', 'Flying', 'Sports', 'Pinball']
const ATTRACT_TIMEOUT = 120000

export default function Wheel() {
  const {
    games, stats, loading,
    toggleFavorite, isFavorite,
    recentlyPlayed, addRecentlyPlayed,
  } = useGameLibrary()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState('All')
  const [launching, setLaunching] = useState(false)
  const [attractMode, setAttractMode] = useState(false)
  const [showMediaManager, setShowMediaManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef(null)
  const idleTimer = useRef(null)

  const getFilteredGames = () => {
    let list = games
    if (activeCategory === 'Favorites') {
      list = games.filter(g => isFavorite(g.id || g.profile))
    } else if (activeCategory === 'Recent') {
      list = recentlyPlayed
    } else if (activeCategory !== 'All') {
      list = games.filter(g => g.genre === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        g.title?.toLowerCase().includes(q) ||
        g.system?.toLowerCase().includes(q) ||
        g.genre?.toLowerCase().includes(q)
      )
    }
    return list
  }

  const filteredGames = getFilteredGames()
  const current = filteredGames[selectedIndex] || filteredGames[0]

  useEffect(() => { setSelectedIndex(0) }, [activeCategory, search])

  const resetIdleTimer = useCallback(() => {
    setAttractMode(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setAttractMode(true), ATTRACT_TIMEOUT)
  }, [])

  useEffect(() => {
    resetIdleTimer()
    window.addEventListener('keydown', resetIdleTimer)
    window.addEventListener('mousemove', resetIdleTimer)
    window.addEventListener('click', resetIdleTimer)
    return () => {
      clearTimeout(idleTimer.current)
      window.removeEventListener('keydown', resetIdleTimer)
      window.removeEventListener('mousemove', resetIdleTimer)
      window.removeEventListener('click', resetIdleTimer)
    }
  }, [resetIdleTimer])

  useEffect(() => {
    const handler = (e) => {
      if (showSearch) return
      if (e.key === 'ArrowLeft')  setSelectedIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setSelectedIndex(i => Math.min(filteredGames.length - 1, i + 1))
      if (e.key === 'Enter')      setShowDetail(true)
      if (e.key === 'Escape')     { setShowDetail(false); setShowSearch(false); setSearch('') }
      if (e.key === 'f' || e.key === 'F') {
        if (current) toggleFavorite(current.id || current.profile)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filteredGames, selectedIndex, showSearch, current])

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus()
  }, [showSearch])

  useGamepad({
    enabled: !showDetail && !showMediaManager && !showSettings && !showSearch,
    onLeft:     () => setSelectedIndex(i => Math.max(0, i - 1)),
    onRight:    () => setSelectedIndex(i => Math.min(filteredGames.length - 1, i + 1)),
    onConfirm:  () => setShowDetail(true),
    onBack:     () => { setShowDetail(false); setSearch(''); setShowSearch(false) },
    onFavorite: () => { if (current) toggleFavorite(current.id || current.profile) },
  })

  const handleLaunch = async () => {
    if (launching || !current) return
    setLaunching(true)
    addRecentlyPlayed(current)
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

      <AttractMode
        games={filteredGames}
        isActive={attractMode}
        onSelect={setSelectedIndex}
        onWake={resetIdleTimer}
      />

      {attractMode && (
        <div className={styles.attractBanner}>
          <span>INSERT COIN</span>
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoNu}>Nu</span>
          <span className={styles.logoArcade}>Arcade</span>
        </div>
        <div className={styles.headerRight}>
          {showSearch ? (
            <div className={styles.searchWrap}>
              <input
                ref={searchRef}
                className={styles.searchInput}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search games..."
                onKeyDown={e => {
                  if (e.key === 'Escape') { setShowSearch(false); setSearch('') }
                }}
              />
              <button className={styles.searchClose} onClick={() => { setShowSearch(false); setSearch('') }}>✕</button>
            </div>
          ) : (
            <div className={styles.statsRow}>
              {stats?.devMode && <span className={styles.devBadge}>DEV MODE</span>}
              {attractMode && <span className={styles.attractBadge}>ATTRACT</span>}
              <span className={styles.gameCount}>{filteredGames.length} games</span>
              <button className={styles.searchBtn} onClick={() => setShowSearch(true)}>🔍 Search</button>
              <button className={styles.mediaBtn} onClick={() => setShowMediaManager(true)}>🎬 Media</button>
              <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>⚙ Settings</button>
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
            {cat === 'Favorites' ? '♥ Favorites' : cat === 'Recent' ? '🕐 Recent' : cat}
          </button>
        ))}
      </div>

      {filteredGames.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            {activeCategory === 'Favorites' ? '♥' : activeCategory === 'Recent' ? '🕐' : '🕹️'}
          </div>
          <div className={styles.emptyTitle}>
            {activeCategory === 'Favorites' ? 'No favorites yet' :
             activeCategory === 'Recent' ? 'No recently played games' :
             search ? `No results for "${search}"` :
             'No games in this category'}
          </div>
          <div className={styles.emptySub}>
            {activeCategory === 'Favorites' ? 'Press F on any game to add it' :
             activeCategory === 'Recent' ? 'Launch a game to see it here' :
             'Try selecting a different category'}
          </div>
        </div>
      ) : (
        <div className={styles.wheelArea}>
          <button className={styles.navBtn} onClick={() => setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length)}>‹</button>
          <div className={styles.cardTrack}>
            {filteredGames.map((game, index) => (
              <div
                key={game.id || game.profile}
                className={`${styles.cardSlot} ${getCardClass(index)}`}
              >
                <GameCard
                  game={game}
                  isCenter={index === selectedIndex}
                  isAttract={attractMode}
                  isFavorite={isFavorite(game.id || game.profile)}
                  onClick={() => {
                    if (index === selectedIndex) setShowDetail(true)
                    else setSelectedIndex(index)
                  }}
                />
              </div>
            ))}
          </div>
          <button className={styles.navBtn} onClick={() => setSelectedIndex(i => (i + 1) % filteredGames.length)}>›</button>
        </div>
      )}

      {current && filteredGames.length > 0 && (
        <div className={`${styles.infoPanel} ${attractMode ? styles.infoPanelAttract : ''}`}>
          <div className={styles.infoLeft}>
            <div className={styles.infoTitle}>{current.title}</div>
            <div className={styles.infoMeta}>
              <span className={styles.tagSystem}>{current.system}</span>
              <span className={styles.tagGenre}>{current.genre}</span>
              <span className={
                current.status === 'Perfect' ? styles.tagPerfect :
                current.status === 'Great' || current.status === 'Playable' ? styles.tagGreat :
                styles.tagUnverified
              }>
                {current.status}
              </span>
              <button
                className={`${styles.favBtn} ${isFavorite(current.id || current.profile) ? styles.favActive : ''}`}
                onClick={() => toggleFavorite(current.id || current.profile)}
                title="Toggle favorite (F)"
              >
                {isFavorite(current.id || current.profile) ? '♥' : '♡'}
              </button>
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

      {showMediaManager && <MediaManager onClose={() => setShowMediaManager(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showDetail && current && (
        <GameDetail
          game={current}
          onClose={() => setShowDetail(false)}
          onLaunch={() => { setShowDetail(false); handleLaunch() }}
          launching={launching}
        />
      )}
    </div>
  )
}