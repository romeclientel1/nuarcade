import { useState, useEffect, useCallback, useRef } from "react"
import { useGameLibrary } from "../../hooks/useGameLibrary"
import GameCard from "./GameCard"
import AttractMode from "./AttractMode"
import MediaManager from "../MediaManager/MediaManager"
import Settings from "../Settings/Settings"
import GameDetail from "../GameDetail/GameDetail"
import Help from "../Help/Help"
import Collections, { useCollections } from "../Collections/Collections"
import Stats from "../Stats/Stats"
import Achievements, { computeStats } from "../Achievements/Achievements"
import { AchievementToastContainer, useAchievementToasts } from "../Achievements/AchievementToast"
import VirtualKeyboard from "../VirtualKeyboard/VirtualKeyboard"
import BootScreen from "./BootScreen"
import { useErrorToast, ErrorToastContainer } from "./ErrorToast"
import SortMenu from "./SortMenu"
import { useGamepad } from "./useGamepad"
import { useArcadeSounds } from "../../hooks/useArcadeSounds"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useSteamGridDB } from "../../hooks/useSteamGridDB"


import styles from "./Wheel.module.css"

const CATEGORIES = ["All", "Favorites", "Recent", "Arcade", "Retro", "Racing", "Fighting", "Shooter", "Rhythm", "Flying", "Sports", "N64", "PS1", "PSP", "Dreamcast", "Model2", "Model3", "PS3", "Xbox360", "GCWii", "WiiU", "PS2", "Switch", "Pinball", "PC"]
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
    case "most_launched": {
      try {
        const lc = JSON.parse(localStorage.getItem("nuarcade_launches") || "{}")
        return sorted.sort((a, b) => {
          const al = lc[a.id || a.profile]?.count || 0
          const bl = lc[b.id || b.profile]?.count || 0
          return bl - al
        })
      } catch { return sorted }
    }
    case "recently_added": {
      try {
        const seen = JSON.parse(localStorage.getItem("nuarcade_first_seen") || "{}")
        return sorted.sort((a, b) => {
          const at = seen[a.id || a.profile] || 0
          const bt = seen[b.id || b.profile] || 0
          return bt - at
        })
      } catch { return sorted }
    }
    case "top_rated": {
      try {
        const ratings = JSON.parse(localStorage.getItem("nuarcade_ratings") || "{}")
        return sorted.sort((a, b) => {
          const ar = ratings[a.id || a.profile] || 0
          const br = ratings[b.id || b.profile] || 0
          return br - ar
        })
      } catch { return sorted }
    }
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
    games, stats, loading, libraryEmpty, config,
    toggleFavorite, isFavorite,
    recentlyPlayed, addRecentlyPlayed,
    newGameCount,
  } = useGameLibrary()

  const { getCollections } = useCollections()
  const [collections, setCollections] = useState(() => getCollections())

  // Refresh collections when panel closes
  const handleCollectionsClose = () => {
    setShowCollections(false)
    setCollections(getCollections())
  }

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState("All")
  const [launching, setLaunching] = useState(false)
  const [attractMode, setAttractMode] = useState(false)
  const [showMediaManager, setShowMediaManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showBoot, setShowBoot] = useState(false)

  // Show boot screen once after library loads (only on cabinet, only if games exist)
  const bootShown = useRef(false)
  useEffect(() => {
    if (bootShown.current || loading || !games.length) return
    bootShown.current = true
    if (window.nuarcade?.platform === "win32") {
      setShowBoot(true)
    }
  }, [games.length, loading])
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false)
  const [sortBy, setSortBy] = useState("default")
  const [search,        setSearch       ] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showSearch,    setShowSearch   ] = useState(false)
  const searchRef = useRef(null)
  const searchDebounce = useRef(null)

  const handleSearchChange = (val) => {
    setSearch(val)
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => setDebouncedSearch(val), 120)
  }
  const sounds = useArcadeSounds()
  const { startSession, endSession, getPlaytime, formatTime, recordLaunch } = usePlaytime()
  const [artwork, setArtwork] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nuarcade_artwork") || "{}") } catch { return {} }
  })
  const sgdbKey = config?.sgdbApiKey || null
  const { fetchArtworkForGame } = useSteamGridDB(sgdbKey)

  // Achievement stats -- recomputed every 15s and whenever games change
  const [achievementStats, setAchievementStats] = useState(() => computeStats(games))
  useEffect(() => {
    if (!games.length) return
    setAchievementStats(computeStats(games))
    const interval = setInterval(() => setAchievementStats(computeStats(games)), 15000)
    return () => clearInterval(interval)
  }, [games])
  const { toasts: achieveToasts, dismiss: dismissToast } = useAchievementToasts(achievementStats)
  const { toasts: errorToasts, showError, dismiss: dismissError } = useErrorToast()
  
  const [cabinetMode, setCabinetMode] = useState(false)
  const [screenshotMode, setScreenshotMode] = useState(false)
  const idleTimer = useRef(null)

  const getFilteredGames = () => {
    let list = games
    if (activeCategory === "Favorites") {
      list = games.filter(g => isFavorite(g.id || g.profile))
    } else if (activeCategory === "Recent") {
      list = recentlyPlayed
    } else if (activeCategory.startsWith("col_")) {
      const col = collections[activeCategory]
      list = col ? games.filter(g => col.games.includes(g.id || g.profile)) : []
    } else if (activeCategory !== "All") {
      list = games.filter(g => g.genre === activeCategory)
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim()
      const terms = q.split(/\s+/)
      list = list.filter(g => {
        const haystack = [
          g.title, g.system, g.genre, g.romName, g.serial
        ].filter(Boolean).join(" ").toLowerCase()
        // All terms must appear somewhere in the haystack (AND logic)
        return terms.every(term => haystack.includes(term))
      })
    }
    return sortGames(list, sortBy)
  }

  const filteredGames = getFilteredGames()
  const current = filteredGames[selectedIndex] || filteredGames[0]

  useEffect(() => { setSelectedIndex(0) }, [activeCategory, debouncedSearch, sortBy])

  // Update marquee display when selected game changes + fire LED game-selected event
  useEffect(() => {
    if (!current || !window.nuarcade?.updateMarquee) return
    const art = artwork?.[current.id || current.profile]
    window.nuarcade.updateMarquee({
      title:  current.title,
      system: current.system,
      hero:   art?.hero   || null,
      logo:   art?.logo   || null,
      capsule: art?.capsule || null,
    }).catch(() => {})
    // Fire LED/external event
    window.nuarcade?.gameSelected?.({
      title: current.title, system: current.system,
      genre: current.genre, emulator: current.emulator,
      id: current.id || current.profile,
    }).catch?.(() => {})
    // Pixelcade push on navigation (reuse art already declared above)
    window.nuarcade?.pixelcadePush?.({
      title: current.title, system: current.system,
      genre: current.genre, emulator: current.emulator,
      hero: art?.hero || null, capsule: art?.capsule || null,
    }).catch?.(() => {})
  }, [current?.id, current?.profile, artwork])

  // Auto-launch last played game if configured
  useEffect(() => {
    if (!games.length) return
    try {
      const raw = localStorage.getItem("nuarcade_auto_launch")
      if (!raw) return
      localStorage.removeItem("nuarcade_auto_launch")
      const lastGame = JSON.parse(raw)
      const idx = games.findIndex(g =>
        (g.id && g.id === lastGame.id) || (g.profile && g.profile === lastGame.profile)
      )
      if (idx >= 0) {
        setSelectedIndex(idx)
        setTimeout(() => handleLaunch(), 1200)
      }
    } catch {}
  }, [games])

  const resetIdleTimer = useCallback(() => {
    setAttractMode(false)
    clearTimeout(idleTimer.current)
    const timeoutMs = ((config?.attractTimeout || 120)) * 1000
    idleTimer.current = setTimeout(() => setAttractMode(true), timeoutMs)
  }, [config?.attractTimeout])

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
      // Never intercept when any text input or overlay is active
      if (showSearch || showVirtualKeyboard) return
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return

      if (e.key === "ArrowLeft")  { sounds.navigate(); setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length) }
      if (e.key === "ArrowRight") { sounds.navigate(); setSelectedIndex(i => (i + 1) % filteredGames.length) }
      if (e.key === "Enter")      { if (!showDetail && !showHelp && !showStats && !showAchievements && !showCollections && !showSettings && !showMediaManager) { sounds.select(); setShowDetail(true) } }
      if (e.key === "Escape") {
        sounds.back()
        setShowDetail(false); setShowSearch(false); setSearch(""); setDebouncedSearch("")
        setShowHelp(false); setShowSort(false); setShowStats(false)
        setShowAchievements(false); setShowCollections(false)
        setShowVirtualKeyboard(false)
      }

      // Single-key shortcuts only fire when no overlay is open
      const anyOverlay = showDetail || showHelp || showStats || showAchievements || showCollections || showSettings || showMediaManager
      if (anyOverlay) return

      if (e.key === "f" || e.key === "F") { if (current) toggleFavorite(current.id || current.profile) }
      if (e.key === "?") setShowHelp(h => !h)
      if (e.key === "n" || e.key === "N") setShowCollections(c => !c)
      if (e.key === "t" || e.key === "T") setShowStats(s => !s)
      if (e.key === "a" || e.key === "A") setShowAchievements(s => !s)
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
  }, [filteredGames, selectedIndex, showSearch, showVirtualKeyboard, showDetail, showHelp, showStats, showAchievements, showCollections, showSettings, showMediaManager, current, handleLaunch])

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus()
  }, [showSearch])

  useGamepad({
    enabled: !showDetail && !showMediaManager && !showSettings && !showSearch && !showHelp && !showVirtualKeyboard,
    onLeft:          () => setSelectedIndex(i => (i - 1 + filteredGames.length) % filteredGames.length),
    onRight:         () => setSelectedIndex(i => (i + 1) % filteredGames.length),
    onConfirm:       () => setShowDetail(true),
    onBack:          () => { sounds.back(); setShowDetail(false); setSearch(""); setDebouncedSearch(""); setShowSearch(false) },
    onFavorite:      () => { if (current) toggleFavorite(current.id || current.profile) },
    onCategoryLeft:  () => {
      const allCats = [...CATEGORIES, ...Object.keys(collections)]
      const idx = allCats.indexOf(activeCategory)
      setActiveCategory(allCats[(idx - 1 + allCats.length) % allCats.length])
    },
    onCategoryRight: () => {
      const allCats = [...CATEGORIES, ...Object.keys(collections)]
      const idx = allCats.indexOf(activeCategory)
      setActiveCategory(allCats[(idx + 1) % allCats.length])
    },
    onRandom:        () => {
      if (filteredGames.length > 0) {
        setSelectedIndex(Math.floor(Math.random() * filteredGames.length))
        sounds.navigate()
      }
    },
    onSettings:      () => setShowSettings(true),
  })

  const handleLaunch = async () => {
    if (launching || !current) return
    sounds.launch()
    setLaunching(true)
    const gameId = current.id || current.profile
    const sessionStart = startSession(gameId)
    recordLaunch(gameId)
    addRecentlyPlayed(current)

    // When window regains focus, the user returned from the emulator -- save session
    const handleFocusReturn = () => {
      endSession(gameId, sessionStart)
      setAchievementStats(computeStats(games))
      window.removeEventListener("focus", handleFocusReturn)
    }
    window.addEventListener("focus", handleFocusReturn)

    // Also save if NuArcade is closed before focus returns (visibilitychange)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        endSession(gameId, sessionStart)
        document.removeEventListener("visibilitychange", handleVisibility)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    // Push "NOW PLAYING" state to marquee with full game info
    if (window.nuarcade?.updateMarquee) {
      const art = artwork?.[gameId]
      window.nuarcade.updateMarquee({
        title:      current.title,
        system:     current.system || current.genre,
        hero:       art?.hero    || null,
        logo:       art?.logo    || null,
        capsule:    art?.capsule || null,
        nowPlaying: true,
        genre:      current.genre,
        emulator:   current.emulator,
      }).catch(() => {})
    }
    // Fire LED/external game-launched event
    window.nuarcade?.gameLaunched?.({
      title: current.title, system: current.system,
      genre: current.genre, emulator: current.emulator,
      id: gameId,
    }).catch?.(() => {})
    // Pixelcade push on launch (with nowPlaying flag)
    const launchArt = artwork?.[gameId]
    window.nuarcade?.pixelcadePush?.({
      title: current.title, system: current.system,
      genre: current.genre, emulator: current.emulator,
      hero: launchArt?.hero || null, capsule: launchArt?.capsule || null,
      nowPlaying: true,
    }).catch?.(() => {})
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
      try {
        if (emu === 'rpcs3')            await window.nuarcade.launchPs3Game(gamePath)
        else if (emu === 'xenia')       await window.nuarcade.launchXbox360Game(gamePath)
        else if (emu === 'dolphin')     await window.nuarcade.launchGCWiiGame(gamePath)
        else if (emu === 'pcsx2')       await window.nuarcade.launchPs2Game(gamePath)
        else if (emu === 'ryujinx')     await window.nuarcade.launchSwitchGame(gamePath)
        else if (emu === 'mame')        await window.nuarcade.launchMameGame(gamePath)
        else if (emu === 'retroarch')   await window.nuarcade.launchRetroArchGame(gamePath)
        else if (emu === 'project64')   await window.nuarcade.launchN64Game(gamePath)
        else if (emu === 'duckstation') await window.nuarcade.launchPs1Game(gamePath)
        else if (emu === 'flycast')     await window.nuarcade.launchFlycastGame(gamePath)
        else if (emu === 'model2')      await window.nuarcade.launchModel2Game(gamePath)
        else if (emu === 'model3')      await window.nuarcade.launchModel3Game(gamePath)
        else if (emu === 'ppsspp')      await window.nuarcade.launchPspGame(gamePath)
        else if (emu === 'cemu')        await window.nuarcade.launchWiiUGame(gamePath)
        else if (emu === 'vpx' || current.isPinball) await window.nuarcade.launchVpxTable(gamePath)
        else await window.nuarcade.launchGame(current.profilePath || current.profile)
      } catch (e) {
        showError("Failed to launch " + current.title + ": " + (e.message || "unknown error"))
      }
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
        artwork={artwork}
        attractConfig={{
          cycleSpeed:  config?.attractCycleSpeed || 6,
          preferArt:   config?.attractPreferArt !== false,
        }}
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
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search games, systems, ROM names..."
                onKeyDown={e => {
                  if (e.key === "Escape") { setShowSearch(false); setSearch(""); setDebouncedSearch(""); setShowVirtualKeyboard(false) }
                }}
                onFocus={() => setShowVirtualKeyboard(false)}
              />
              {debouncedSearch && (
                <span className={styles.searchCount}>
                  {filteredGames.length} result{filteredGames.length !== 1 ? "s" : ""}
                </span>
              )}
              <button className={styles.searchClose} onClick={() => {
                setShowSearch(false); setSearch(""); setDebouncedSearch(""); setShowVirtualKeyboard(false)
              }}>x</button>
            </div>
          ) : (
            <div className={styles.statsRow}>
              {stats?.devMode && <span className={styles.devBadge}>DEV MODE</span>}
              {attractMode && <span className={styles.attractBadge}>ATTRACT</span>}
              {activeCategory.startsWith("col_") && collections[activeCategory] && (
                <span className={styles.collectionBadge}>
                  [] {collections[activeCategory].name}
                </span>
              )}
              {!activeCategory.startsWith("col_") && activeCategory !== "All" && activeCategory !== "Recent" && activeCategory !== "Favorites" && (
                <span className={styles.filterBadge}>{activeCategory}</span>
              )}
              <span className={styles.gameCount}>{filteredGames.length} game{filteredGames.length !== 1 ? "s" : ""}</span>
              {newGameCount > 0 && (
                <span className={styles.newBadge}>+{newGameCount} new</span>
              )}
              <button className={styles.searchBtn} onClick={() => {
                setShowSearch(true)
                setShowVirtualKeyboard(true)
              }}>Search</button>
              <button className={sortBy !== "default" ? styles.sortActive : styles.sortBtn} onClick={() => setShowSort(s => !s)}>Sort</button>
              <button className={styles.randBtn} onClick={() => {
                if (filteredGames.length > 0) {
                  setSelectedIndex(Math.floor(Math.random() * filteredGames.length))
                  sounds.navigate()
                }
              }} title="Random game (R)">?</button>
              <button className={styles.colBtn} onClick={() => setShowCollections(true)} title="Collections (N)">[]</button>
              <button className={styles.statsBtn} onClick={() => setShowStats(true)} title="My Stats (T)">#</button>
              <button className={styles.achieveBtn} onClick={() => setShowAchievements(true)} title="Achievements (A)">*</button>
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
        {Object.values(collections).map(col => (
          <button
            key={col.id}
            className={styles.catPill + " " + styles.catCollection + (activeCategory === col.id ? " " + styles.catActive : "")}
            onClick={() => setActiveCategory(col.id)}
          >
            {col.name}
            <span className={styles.catCount}>{col.games.length}</span>
          </button>
        ))}
      </div>

      {/* Recently played carousel -- shown when library has games and recent list is non-empty */}
      {!libraryEmpty && !cabinetMode && !screenshotMode && recentlyPlayed.length > 0 && activeCategory !== "Recent" && !debouncedSearch && (
        <div className={styles.recentCarousel}>
          <div className={styles.recentLabel}>Continue Playing</div>
          <div className={styles.recentTrack}>
            {recentlyPlayed.slice(0, 6).map(g => {
              const gArt = artwork?.[g.id || g.profile]
              const thumb = gArt?.capsule || gArt?.hero || null
              const colors = { Racing:"#0066cc",Fighting:"#9900cc",Shooter:"#cc0000",Rhythm:"#6600cc",
                Arcade:"#ff6600",Retro:"#9933ff",PS1:"#003791",N64:"#e4000f",Dreamcast:"#ff6600",
                PS3:"#0070d1",Xbox360:"#107c10",GCWii:"#6b21a8",PS2:"#003791",Switch:"#e4000f" }
              const accent = colors[g.genre] || "#00ff88"
              return (
                <button
                  key={g.id || g.profile}
                  className={styles.recentCard}
                  onClick={() => {
                    const idx = filteredGames.findIndex(fg =>
                      (fg.id && fg.id === g.id) || (fg.profile && fg.profile === g.profile)
                    )
                    if (idx >= 0) { setSelectedIndex(idx); sounds.navigate() }
                    else { setActiveCategory("All"); setSelectedIndex(0) }
                  }}
                  title={g.title}
                >
                  {thumb ? (
                    <img src={thumb} alt={g.title} className={styles.recentThumb} />
                  ) : (
                    <div className={styles.recentFallback} style={{ background: accent + "18", borderColor: accent + "33" }}>
                      <span className={styles.recentIcon}>{g.icon || g.genre?.[0] || "?"}</span>
                    </div>
                  )}
                  <div className={styles.recentTitle}>{g.title}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {libraryEmpty ? (
        <div className={styles.libraryEmpty}>
          <div className={styles.emptyBigIcon}>?</div>
          <div className={styles.emptyBigTitle}>Your library is empty</div>
          <div className={styles.emptyBigSub}>
            NuArcade is ready -- you just need to add games.
          </div>
          <div className={styles.emptySteps}>
            <div className={styles.emptyStep}>
              <span className={styles.emptyStepNum}>1</span>
              <span>Install emulators via <strong>Setup Guide</strong> in the wizard</span>
            </div>
            <div className={styles.emptyStep}>
              <span className={styles.emptyStepNum}>2</span>
              <span>Copy game files to your F: drive folders</span>
            </div>
            <div className={styles.emptyStep}>
              <span className={styles.emptyStepNum}>3</span>
              <span>Hit <strong>Rescan</strong> in Settings to detect your games</span>
            </div>
          </div>
          <div className={styles.emptyFolders}>
            <div className={styles.emptyFolderRow}><code>F:\ArcadeGames\</code> -- TeknoParrot arcade</div>
            <div className={styles.emptyFolderRow}><code>F:\MAME\roms\</code> -- MAME classics</div>
            <div className={styles.emptyFolderRow}><code>F:\RetroArchGames\</code> -- NES, SNES, Genesis...</div>
            <div className={styles.emptyFolderRow}><code>F:\N64Games\</code> -- Nintendo 64</div>
            <div className={styles.emptyFolderRow}><code>F:\PS1Games\</code> -- PlayStation</div>
            <div className={styles.emptyFolderRow}><code>F:\DreamcastGames\</code> -- Dreamcast</div>
            <div className={styles.emptyFolderRow}><code>F:\PS2Games\</code> -- PlayStation 2</div>
            <div className={styles.emptyFolderRow}><code>F:\PS3Games\</code> -- PlayStation 3</div>
            <div className={styles.emptyFolderRow}><code>F:\Xbox360Games\</code> -- Xbox 360</div>
            <div className={styles.emptyFolderRow}><code>F:\GCWiiGames\</code> -- GameCube / Wii</div>
            <div className={styles.emptyFolderRow}><code>F:\SwitchGames\</code> -- Nintendo Switch</div>
            <div className={styles.emptyFolderRow}><code>F:\PSPGames\</code> -- PSP</div>
            <div className={styles.emptyFolderRow}><code>F:\WiiUGames\</code> -- Wii U</div>
            <div className={styles.emptyFolderRow}><code>F:\PinballTables\</code> -- Visual Pinball X</div>
          </div>
        </div>
      ) : filteredGames.length === 0 ? (
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
      {showCollections && (
        <Collections
          games={games}
          currentGame={current}
          onClose={handleCollectionsClose}
        />
      )}
      {showStats && (
        <Stats games={games} onClose={() => setShowStats(false)} />
      )}
      {showAchievements && (
        <Achievements games={games} onClose={() => setShowAchievements(false)} />
      )}
      {showVirtualKeyboard && showSearch && (
        <VirtualKeyboard
          value={search}
          onChange={val => handleSearchChange(val)}
          onDone={() => setShowVirtualKeyboard(false)}
          onClose={() => { setShowSearch(false); setSearch(""); setDebouncedSearch(""); setShowVirtualKeyboard(false) }}
          resultCount={filteredGames.length}
        />
      )}
      {showMediaManager && <MediaManager onClose={() => setShowMediaManager(false)} />}
      {showSettings && <Settings games={games} onClose={() => setShowSettings(false)} onCRTChange={onCRTChange} crtEnabled={crtEnabled} themeId={themeId} onThemeChange={onThemeChange} />}
      {showDetail && current && (
        <GameDetail
          game={current}
          games={games}
          artwork={artwork}
          onClose={() => { sounds.back(); setShowDetail(false) }}
          onLaunch={() => { sounds.back(); setShowDetail(false); handleLaunch() }}
          launching={launching}
          onSelectGame={(g) => {
            const idx = filteredGames.findIndex(fg => (fg.id && fg.id === g.id) || (fg.profile && fg.profile === g.profile))
            if (idx >= 0) setSelectedIndex(idx)
            setShowDetail(false)
            setTimeout(() => setShowDetail(true), 50)
          }}
        />
      )}

      {/* Keyboard hint bar -- hidden in cabinet/screenshot mode */}
      {!cabinetMode && !screenshotMode && !attractMode && (
        <div className={styles.hintBar}>
          <span className={styles.hint}><kbd>Enter</kbd> Detail</span>
          <span className={styles.hint}><kbd>Space</kbd> Launch</span>
          <span className={styles.hint}><kbd>F</kbd> Favorite</span>
          <span className={styles.hint}><kbd>R</kbd> Random</span>
          <span className={styles.hint}><kbd>N</kbd> Collections</span>
          <span className={styles.hint}><kbd>T</kbd> Stats</span>
          <span className={styles.hint}><kbd>A</kbd> Achievements</span>
          <span className={styles.hint}><kbd>Search</kbd> Keyboard</span>
          <span className={styles.hint}><kbd>?</kbd> Help</span>
        </div>
      )}
      {/* Achievement toasts */}
      <AchievementToastContainer toasts={achieveToasts} onDismiss={dismissToast} />

      {/* Error toasts */}
      <ErrorToastContainer toasts={errorToasts} onDismiss={dismissError} />

      {/* Boot screen -- shown once on first library load */}
      {showBoot && (
        <BootScreen
          games={games}
          artwork={artwork}
          onComplete={() => setShowBoot(false)}
        />
      )}
    </div>
  )
}
