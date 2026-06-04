import { useState, useEffect } from 'react'
import styles from './Wheel.module.css'

// Placeholder game data — will be replaced with real TeknoParrot scanner
const SAMPLE_GAMES = [
  { id: 1, title: "Wangan Midnight MT 5DX+", genre: "Racing",   system: "SEGA Nu",        status: "Perfect", profile: "WMMT5DX.xml",    icon: "🏎️" },
  { id: 2, title: "Initial D Arcade Stage 8", genre: "Racing",   system: "SEGA Nu",        status: "Perfect", profile: "InitialD8.xml",   icon: "🚗" },
  { id: 3, title: "House of the Dead 4",      genre: "Shooter",  system: "SEGA Lindbergh", status: "Perfect", profile: "HotD4.xml",       icon: "🧟" },
  { id: 4, title: "Dead or Alive 6",          genre: "Fighting", system: "SEGA ALLS",      status: "Perfect", profile: "DOA6.xml",        icon: "⚔️" },
  { id: 5, title: "Daytona Championship USA", genre: "Racing",   system: "SEGA PC",        status: "Perfect", profile: "DaytonaUSA.xml",  icon: "🏁" },
  { id: 6, title: "BlazBlue Central Fiction", genre: "Fighting", system: "NESiCAxLive",    status: "Perfect", profile: "BBCF.xml",        icon: "🌀" },
  { id: 7, title: "After Burner Climax",      genre: "Flying",   system: "SEGA Lindbergh", status: "Perfect", profile: "ABC.xml",         icon: "✈️" },
  { id: 8, title: "Cruis'n Blast",            genre: "Racing",   system: "Raw Thrills",    status: "Perfect", profile: "CruisnBlast.xml", icon: "💥" },
  { id: 9, title: "Aliens Armageddon",        genre: "Shooter",  system: "Raw Thrills",    status: "Perfect", profile: "Aliens.xml",      icon: "👾" },
  { id: 10, title: "Time Crisis 5",           genre: "Shooter",  system: "Namco 369",      status: "Great",   profile: "TC5.xml",         icon: "🎯" },
  { id: 11, title: "Dragon Ball Zenkai BR",   genre: "Fighting", system: "Namco 369",      status: "Perfect", profile: "DBZB.xml",        icon: "🐉" },
  { id: 12, title: "Crossbeats Rev",          genre: "Rhythm",   system: "SEGA Nu",        status: "Perfect", profile: "CrossbeatsRev.xml", icon: "🎵" },
]

const CATEGORIES = ['All', 'Racing', 'Fighting', 'Shooter', 'Rhythm', 'Flying', 'Pinball']

export default function Wheel() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState('All')
  const [launching, setLaunching] = useState(false)

  const filteredGames = activeCategory === 'All'
    ? SAMPLE_GAMES
    : SAMPLE_GAMES.filter(g => g.genre === activeCategory)

  const current = filteredGames[selectedIndex] || filteredGames[0]

  useEffect(() => {
    setSelectedIndex(0)
  }, [activeCategory])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length)
      if (e.key === 'ArrowRight') setSelectedIndex(i => (i + 1) % filteredGames.length)
      if (e.key === 'Enter')      handleLaunch()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filteredGames, selectedIndex])

  const handleLaunch = async () => {
    if (launching || !current) return
    setLaunching(true)
    if (window.nuarcade) {
      await window.nuarcade.launchGame(current.profile)
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

  return (
    <div className={styles.stage}>
      <div className={styles.bgGrid} />
      <div className={styles.bgVignette} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoNu}>Nu</span>
          <span className={styles.logoArcade}>Arcade</span>
        </div>
        <div className={styles.gameCount}>{filteredGames.length} games</div>
      </div>

      {/* Category strip */}
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

      {/* Wheel */}
      <div className={styles.wheelArea}>
        <button className={styles.navBtn} onClick={() => setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length)}>‹</button>

        <div className={styles.cardTrack}>
          {filteredGames.map((game, index) => (
            <div
              key={game.id}
              className={`${styles.card} ${getCardClass(index)}`}
              onClick={() => {
                if (index === selectedIndex) handleLaunch()
                else setSelectedIndex(index)
              }}
            >
              <div className={styles.cardArt}>{game.icon}</div>
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

      {/* Info panel */}
      {current && (
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
