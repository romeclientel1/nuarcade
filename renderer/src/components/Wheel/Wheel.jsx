import { useState, useEffect, useCallback, useRef } from "react"
import { useGameLibrary } from "../../hooks/useGameLibrary"
import GameCard from "./GameCard"
import AttractMode from "./AttractMode"
import MediaManager from "../MediaManager/MediaManager"
import Settings from "../Settings/Settings"
import GameDetail from "../GameDetail/GameDetail"
import Help from "../Help/Help"
import SortMenu from "./SortMenu"
import { useGamepad } from "./useGamepad"
import { useArcadeSounds } from "../../hooks/useArcadeSounds"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useSteamGridDB } from "../../hooks/useSteamGridDB"


import styles from "./Wheel.module.css"

const CATEGORIES = ["All", "Favorites", "Recent", "Racing", "Fighting", "Shooter", "Rhythm", "Flying", "Sports", "PS3", "Xbox360", "GCWii", "PS2", "Switch", "Pinball"]
const ATTRACT_TIMEOUT = 120000

function sortGames(games, sortBy) {
  const sorted = [...games]
  switch (sortBy) {
    case "most_played": {
      try {
        const pt = JSON.parse(localStorage.getItem("nuarcade_playtime") || "{}")
        return sorted.sort((a, b) => {
          const at = pt[a.id || a.profile]?.total || 0
          const bt = pt[b.id || b.profile]?.total || 0
          return bt - at
        })
      } catch { return sorted }
    }
    case "name":   return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case "system": return sorted.sort((a, b) => (a.system || "").localeCompare(b.system || ""))
    case "status": {
      const order = { Perfect: 0, Great: 1, Playable: 2, Unverified: 3 }
      return sorted.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4))
    }
    default: return sorted
  }
}

export default function Wheel({ onCRTChange, crtEnabled, themeId, onThemeChange }) {
  const {
    games, stats, loading,
    toggleFavorite, isFavorite,
    recentlyPlayed, addRecentlyPlayed,
    newGameCount,
  } = useGameLibrary()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState("All")
  const [launching, setLaunching] = useState(false)
  const [attractMode, setAttractMode] = useState(false)
  const [showMediaManager, setShowMediaManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [sortBy, setSortBy] = useState("default")
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef(null)
  const sounds = useArcadeSounds()
  const { startSession, endSession, getPlaytime, formatTime } = usePlaytime()
  const [artwork, setArtwork] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nuarcade_artwork") || "{}") } catch { return {} }
  })
  const sgdbKey = config?.sgdbApiKey || null
  const { fetchArtworkForGame } = useSteamGridDB(sgdbKey)
  
  const [cabinetMode, setCabinetMode] = useState(false)
  const [screenshotMode, setScreenshotMode] = useState(false)
  const idleTimer = useRef(null)

  const getFilteredGames = () => {
    let list = games
    if (activeCategory === "Favorites") {
      list = games.filter(g => isFavorite(g.id || g.profile))
    } else if (activeCategory === "Recent") {
      list = recentlyPlayed
    } else if (activeCategory !== "All") {
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
    return sortGames(list, sortBy)
  }

  const filteredGames = getFilteredGames()
  const current = filteredGames[selectedIndex] || filteredGames[0]

  useEffect(() => { setSelectedIndex(0) }, [activeCategory, search, sortBy])

  const resetIdleTimer = useCallback(() => {
    setAttractMode(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setAttractMode(true), ATTRACT_TIMEOUT)
  }, [])

  useEffect(() => {
    resetIdleTimer()
    window.addEventListener("keydown", resetIdleTimer)
    window.addEventListener("mousemove", resetIdleTimer)
    window.addEventListener("click", resetIdleTimer)
    return () => {
      clearTimeout(idleTimer.current)
      window.removeEventListener("keydown", resetIdleTimer)
      window.removeEventListener("mousemove", resetIdleTimer)
      window.removeEventListener("click", resetIdleTimer)
    }
  }, [resetIdleTimer])

  useEffect(() => {
    const handler = (e) => {
      if (showSearch) return
      if (e.key === "ArrowLeft")  { sounds.navigate(); setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length) }
      if (e.key === "ArrowRight") { sounds.navigate(); setSelectedIndex(i => (i + 1) % filteredGames.length) }
      if (e.key === "Enter")      { sounds.select(); setShowDetail(true) }
      if (e.key === "Escape") {
        sounds.back(); setShowDetail(false)
        setShowSearch(false)
        setSearch("")
        setShowHelp(false)
        setShowSort(false)
      }
      if (e.key === "f" || e.key === "F") {
        if (current) toggleFavorite(current.id || current.profile)
      }
      if (e.key === "?") setShowHelp(h => !h)
      if (e.key === "c" || e.key === "C") setCabinetMode(m => !m)
      if (e.key === "s" || e.key === "S") setScreenshotMode(m => !m)
      if (e.key === "r" || e.key === "R") {
        const randomIndex = Math.floor(Math.random() * filteredGames.length)
        setSelectedIndex(randomIndex)
      }
      if (e.key === " ") { e.preventDefault(); if (current) handleLaunch() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [filteredGames, selectedIndex, showSearch, current])

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus()
  }, [showSearch])

  useGamepad({
    enabled: !showDetail && !showMediaManager && !showSettings && !showSearch && !showHelp,
    onLeft:     () => setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length),
    onRight:    () => setSelectedIndex(i => (i + 1) % filteredGames.length),
    onConfirm:  () => setShowDetail(true),
    onBack:     () => { sounds.back(); setShowDetail(false); setSearch(""); setShowSearch(false) },
    onFavorite: () => { if (current) toggleFavorite(current.id || current.profile) },
  })

  const handleLaunch = async () => {
    if (launching || !current) return
    sounds.launch()
    setLaunching(true)
    const sessionStart = startSession(current.id || current.profile)
    addRecentlyPlayed(current)
    // Gamepad rumble on launch
    try {
      const gp = navigator.getGamepads()[0]
      if (gp && gp.vibrationActuator) {
        gp.vibrationActuator.playEffect("dual-rumble", {
          startDelay: 0, duration: 300,
          weakMagnitude: 0.5, strongMagnitude: 1.0
        })
      }
    } catch (e) {}
    if (window.nuarcade) {
      const emu = current.emulator || 'teknoparrot'
      const gamePath = current.path || current.profilePath || current.profile
      if (emu === 'rpcs3')       await window.nuarcade.launchPs3Game(gamePath)
      else if (emu === 'xenia')  await window.nuarcade.launchXbox360Game(gamePath)
      else if (emu === 'dolphin') await window.nuarcade.launchGCWiiGame(gamePath)
      else if (emu === 'pcsx2')  await window.nuarcade.launchPs2Game(gamePath)
      else if (emu === 'ryujinx') await window.nuarcade.launchSwitchGame(gamePath)
      else if (emu === 'mame')   await window.nuarcade.launchMameGame(gamePath)
      else if (emu === 'retroarch') await window.nuarcade.launchRetroArchGame(gamePath)
      else if (emu === 'project64') await window.nuarcade.launchN64Game(gamePath)
      else if (emu === 'duckstation') await window.nuarcade.launchPs1Game(gamePath)
      else if (emu === 'flycast') await window.nuarcade.launchFlycastGame(gamePath)
      else await window.nuarcade.launchGame(current.profilePath || current.profile)
    } else {
      console.log("Dev mode would launch:", current.profile)
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

  if (loading) return <Splash message="Scanning game library..." />

  return (
    <div className={styles.stage + (cabinetMode ? " " + styles.cabinetMode : "") + (screenshotMode ? " " + styles.screenshotMode : "")}>
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
                  if (e.key === "Escape") { setShowSearch(false); setSearch("") }
                }}
              />
              <button className={styles.searchClose} onClick={() => { setShowSearch(false); setSearch("") }}>x</button>
            </div>
          ) : (
            <div className={styles.statsRow}>
              {stats?.devMode && <span className={styles.devBadge}>DEV MODE</span>}
              {attractMode && <span className={styles.attractBadge}>ATTRACT</span>}
              <span className={styles.gameCount}>{filteredGames.length} games</span>
              {newGameCount > 0 && (
                <span className={styles.newBadge}>+{newGameCount} new</span>
              )}
              <button className={styles.searchBtn} onClick={() => setShowSearch(true)}>Search</button>
              <button className={sortBy !== "default" ? styles.sortActive : styles.sortBtn} onClick={() => setShowSort(s => !s)}>Sort</button>
              <button className={styles.mediaBtn} onClick={() => setShowMediaManager(true)}>Media</button>
              <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>Settings</button>
              <button className={styles.helpBtn} onClick={() => setShowHelp(true)}>?</button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.categoryStrip}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={styles.catPill + (activeCategory === cat ? " " + styles.catActive : "")}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "Favorites" ? "Favorites" : cat === "Recent" ? "Recent" : cat}
            {cat === "Recent" && recentlyPlayed.length > 0 && (
              <span className={styles.catCount}>{recentlyPlayed.length}</span>
            )}
            {cat !== "Favorites" && cat !== "Recent" && (
              <span className={styles.catCount}>
                {cat === "All" ? games.length : games.filter(g => g.genre === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredGames.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            {activeCategory === "Favorites" ? "?" : activeCategory === "Recent" ? "?" : activeCategory === "Pinball" ? "?" : activeCategory === "PS3" ? "?" : activeCategory === "Xbox360" ? "?" : activeCategory === "GCWii" ? "?" : activeCategory === "PS2" ? "?" : "??"}
          </div>
          <div className={styles.emptyTitle}>
            {activeCategory === "Favorites" ? "No favorites yet" :
             activeCategory === "Recent" ? "No recently played games" :
             activeCategory === "Pinball" ? "No pinball tables found" :
             search ? "No results for " + search :
             "No games in this category"}
          </div>
          <div className={styles.emptySub}>
            {activeCategory === "Favorites" ? "Press F on any game to add it" :
             activeCategory === "Recent" ? "Launch a game to see it here" :
             activeCategory === "Pinball" ? "Add .vpx files to F:/PinballTables/" :
             "Try selecting a different category"}
          </div>
        </div>
      ) : (
        <div className={styles.wheelArea}>
          <button className={styles.navBtn} onClick={() => setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length)}>&#8249;</button>
          <div className={styles.cardTrack}>
            {filteredGames.map((game, index) => (
              <div
                key={game.id || game.profile}
                className={styles.cardSlot + " " + getCardClass(index)}
              >
                <GameCard
                  game={game}
                  isCenter={index === selectedIndex}
                  isAttract={attractMode}
                  isFavorite={isFavorite(game.id || game.profile)}
              artwork={artwork}
                  onClick={() => {
                    if (index === selectedIndex) setShowDetail(true)
                    else setSelectedIndex(index)
                  }}
                />
              </div>
            ))}
          </div>
          <button className={styles.navBtn} onClick={() => setSelectedIndex(i => (i + 1) % filteredGames.length)}>&#8250;</button>
        </div>
      )}

      {current && filteredGames.length > 0 && (
        <div className={styles.infoPanel + (attractMode ? " " + styles.infoPanelAttract : "")}>
          <div className={styles.infoLeft}>
            <div className={styles.marqueeWrap}>
              <div className={styles.marqueeInner + (current.title.length < 20 ? " " + styles.short : "")}>
                {current.title}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{current.title.length >= 20 ? current.title : ""}
              </div>
            </div>
            <div className={styles.infoMeta}>
              <span className={styles.tagSystem}>{current.system}</span>
              <span className={styles.tagGenre}>{current.genre}</span>
              <span className={
                current.status === "Perfect" ? styles.tagPerfect :
                current.status === "Great" || current.status === "Playable" ? styles.tagGreat :
                styles.tagUnverified
              }>
                {current.status}
              </span>
              <button
                className={styles.favBtn + (isFavorite(current.id || current.profile) ? " " + styles.favActive : "")}
                onClick={() => toggleFavorite(current.id || current.profile)}
                title="Toggle favorite (F)"
              >
                {isFavorite(current.id || current.profile) ? "?" : "?"}
              </button>
            </div>
            <div className={styles.infoExe}>
              {current.isPinball ? "VPX: " : "TeknoParrotUi.exe --profile="}
              <span>{current.profile}</span>
            </div>
          </div>
          <div className={styles.infoRight}>
            <button className={styles.launchBtn} onClick={handleLaunch} disabled={launching}>
              {launching ? "Launching..." : current.isPinball ? "Launch Table" : "Launch Game"}
            </button>
          </div>
        </div>
      )}

      {showSort && <SortMenu current={sortBy} onChange={setSortBy} onClose={() => setShowSort(false)} />}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}
      {showMediaManager && <MediaManager onClose={() => setShowMediaManager(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} onCRTChange={onCRTChange} crtEnabled={crtEnabled} themeId={themeId} onThemeChange={onThemeChange} />}
      {showDetail && current && (
        <GameDetail
          game={current}
          artwork={artwork?.[current?.id || current?.profile] || null}
          onClose={() => { sounds.back(); setShowDetail(false) }}
          onLaunch={() => { sounds.back(); setShowDetail(false); handleLaunch() }}
          launching={launching}
          playCount={0}
          lastPlayed={null}
        />
      )}
    </div>
  )
}
