import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react"
import { useGamepad } from "../../hooks/useGamepad"
import { useGameLibrary } from "../../hooks/useGameLibrary"
import GameCard from "./GameCard"
import AttractMode from "./AttractMode"
import MediaManager from "../MediaManager/MediaManager"
import Settings from "../Settings/Settings"
import GameDetail from "../GameDetail/GameDetail"
import Help from "../Help/Help"
import Collections, { useCollections } from "../Collections/Collections"
import Stats from "../Stats/Stats"
import Achievements from "../Achievements/Achievements"
import { computeStats } from "../Achievements/computeStats"
import { AchievementToastContainer, useAchievementToasts } from "../Achievements/AchievementToast"
import VirtualKeyboard from "../VirtualKeyboard/VirtualKeyboard"
import IntroVideo from "./IntroVideo"
import GameCoach from "../GameCoach/GameCoach"
import OperatorDashboard from "../OperatorDashboard/OperatorDashboard"
import { useErrorToast, ErrorToastContainer } from "./ErrorToast"
import SortMenu from "./SortMenu"
import { useArcadeSounds } from "../../hooks/useArcadeSounds"
import { useMusicPlayer  } from "../../hooks/useMusicPlayer"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useSteamGridDB } from "../../hooks/useSteamGridDB"
import { useVersionCheck } from "../../hooks/useVersionCheck"
import { getControllerHint } from "../../data/controllerHints"
import ControllerPrompt from "../ControllerPrompt/ControllerPrompt"


import styles from "./Wheel.module.css"
import { useMediaFolders } from "../../hooks/useMediaFolders"

const CATEGORIES = ["All", "Favorites", "Recent", "Arcade", "MAME", "Retro", "Racing", "Fighting", "Shooter", "Rhythm", "Flying", "Sports", "N64", "PS1", "PSP", "Dreamcast", "Model2", "Model3", "PS3", "Xbox360", "GCWii", "WiiU", "PS2", "Switch", "Pinball", "PC"]
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


// -- BUILD 100 Easter Egg -----------------------------------------------------
function KonamiCelebration({ onClose }) {
  const canvasRef = useRef(null)
  const frameRef  = useRef(null)
  const startRef  = useRef(Date.now())

  useEffect(() => {
    const t = setTimeout(onClose, 8000)
    return () => clearTimeout(t)
  }, [onClose])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ['#ff003c','#ff6600','#ffcc00','#00ff88','#00c8ff','#cc00ff','#ffffff']
    const COUNT  = 180

    const particles = Array.from({ length: COUNT }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height * 0.4,
      vx:   (Math.random() - 0.5) * 6,
      vy:   Math.random() * 4 + 2,
      size: Math.random() * 8 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      spin:  (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI * 2,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }))

    const draw = () => {
      const elapsed = (Date.now() - startRef.current) / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x     += p.vx
        p.vy    += 0.12
        p.y     += p.vy
        p.angle += p.spin
        if (p.x < -20) p.x = canvas.width + 20
        if (p.x > canvas.width + 20) p.x = -20
        if (p.y > canvas.height + 20) {
          p.y  = -20
          p.vy = Math.random() * 3 + 1
          p.vx = (Math.random() - 0.5) * 6
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 6) / 2)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })
      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.82)',
    cursor: 'pointer',
  }

  const headStyle = {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 'clamp(48px, 10vw, 120px)',
    fontWeight: 900,
    letterSpacing: '0.05em',
    background: 'linear-gradient(135deg, #ff003c 0%, #ff6600 20%, #ffcc00 40%, #00ff88 60%, #00c8ff 80%, #cc00ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1,
    animation: 'konami-pulse 0.6s ease-in-out infinite alternate',
  }

  const subStyle = {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 'clamp(14px, 2.5vw, 28px)',
    color: '#ffffff',
    letterSpacing: '0.25em',
    marginTop: 16,
    opacity: 0.85,
  }

  const tagStyle = {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 'clamp(10px, 1.5vw, 16px)',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.2em',
    marginTop: 32,
  }

  const codeStyle = {
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.15em',
    marginTop: 48,
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <style>{"@keyframes konami-pulse { from { filter: brightness(1) drop-shadow(0 0 20px rgba(255,200,0,0.5)); } to { filter: brightness(1.2) drop-shadow(0 0 60px rgba(255,200,0,0.9)); } }"}</style>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
      <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px' }}>
        <div style={headStyle}>V5.0</div>
        <div style={subStyle}>MAJOR RELEASE UNLOCKED</div>
        <div style={tagStyle}>NUARCADE {window.nuarcade?.version || 'v5.0.0'} // ROME CLIENTEL // 2026</div>
        <div style={codeStyle}>UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT B A</div>
      </div>
    </div>
  )
}

export default function Wheel({ onCRTChange, crtEnabled, themeId, onThemeChange, activeProfile, onSwitchPlayer }) {
  const {
    games, stats, loading, libraryEmpty, config,
  toggleFavorite, isFavorite,
    recentlyPlayed, addRecentlyPlayed,
    newGameCount,
    refreshVideoPaths,
  } = useGameLibrary()
  useMediaFolders()
  const [artPref, setArtPref] = useState(() => localStorage.getItem('nuarcade_art_pref') || 'sgdb')

  const { getCollections } = useCollections()
  const [collections, setCollections] = useState(() => getCollections())
  const [systemLogos, setSystemLogos] = useState({})

  useEffect(() => {
    window.nuarcade?.getSystemLogos?.().then(r => setSystemLogos(r?.logos || {})).catch(() => {})
  }, [])

  // Refresh collections when panel closes
  const handleCollectionsClose = () => {
    setShowCollections(false)
    setCollections(getCollections())
  }

  const [selectedIndex, setSelectedIndex] = useState(0)
  // 5-tier zone navigation: 0=topMenu, 1=tabs, 2=wheel, 3=launch, 4=hintBar
  const [focusZone,    setFocusZone   ] = useState(2)
  const [showExitPopup, setShowExitPopup] = useState(false)
  const [exitChoice,    setExitChoice   ] = useState(1)  // 0=Yes, 1=No -- default NO
  const [retroArchChoice, setRetroArchChoice] = useState(1)  // 0=Yes, 1=No -- default NO
  const [topMenuIdx,   setTopMenuIdx  ] = useState(0)   // index within zone 0
  const [tabFocusIdx,  setTabFocusIdx ] = useState(0)   // index within zone 1
  const [barFocusIdx,  setBarFocusIdx ] = useState(0)   // index within zone 4
  const focusZoneRef    = useRef(2)
  const topMenuIdxRef   = useRef(0)
  const tabFocusIdxRef  = useRef(0)
  const barFocusIdxRef  = useRef(0)
  const visibleTabsRef  = useRef([])  // tabs actually visible on screen
  const velocityRef = useRef(0)
  const filteredGamesRef = useRef([])
  // Stable refs for gamepad handlers -- avoids stale closure issues
  const activeCategoryRef  = useRef(null)
  const collectionsRef     = useRef(null)
  const currentRef         = useRef(null)
  const showDetailRef      = useRef(false)
  const showSettingsRef    = useRef(false)
  const showSearchRef      = useRef(false)
  const showHelpRef        = useRef(false)
  const showMediaManagerRef = useRef(false)
  const showVirtualKeyboardRef = useRef(false)
  const showSortRef            = useRef(false)
  const showCollectionsRef     = useRef(false)
  const showStatsRef           = useRef(false)
  const showAchievementsRef    = useRef(false)
  const showCoachRef           = useRef(false)
  const showOperatorRef        = useRef(false)
  const showRetroArchPopupRef  = useRef(false)
  const retroArchChoiceRef     = useRef(1)
  const exitConfirmRef         = useRef(false)
  const showExitPopupRef       = useRef(false)
  const exitChoiceRef          = useRef(0)
  const velocityTimerRef = useRef(null)
  const lastNavTime = useRef(0)
  // Velocity-based navigation with elastic overshoot
  const navigate = (dir) => {
    const now = Date.now()
    const timeDelta = now - lastNavTime.current
    lastNavTime.current = now

    // Accelerate if keys come in rapid succession
    if (timeDelta < 150) {
      velocityRef.current = Math.min(velocityRef.current + 1, 6)
    } else {
      velocityRef.current = 1
    }

    const steps = velocityRef.current
    const n = filteredGamesRef.current.length
    if (n === 0) return

    // Elastic overshoot: jump one extra then snap back
    setIsSnapping(true)
    setSelectedIndex(i => ((i + dir * (steps + 1)) % filteredGamesRef.current.length + filteredGamesRef.current.length) % filteredGamesRef.current.length)
    setTimeout(() => {
      setSelectedIndex(i => ((i - dir + n) % n))
      setTimeout(() => setIsSnapping(false), 120)
    }, 80)

    // Decay velocity after pause
    clearTimeout(velocityTimerRef.current)
    velocityTimerRef.current = setTimeout(() => {
      velocityRef.current = 1
    }, 300)
  }


  const [activeCategory, setActiveCategory] = useState("All")
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState(null)
  const [showRetroArchPopup, setShowRetroArchPopup] = useState(false)
  const [showControllerPrompt, setShowControllerPrompt] = useState(false)
  const [attractMode, setAttractMode] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)
  const [showMediaManager, setShowMediaManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showCoach,      setShowCoach     ] = useState(false)
  const [showOperator,   setShowOperator  ] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [showKonami, setShowKonami] = useState(false)
  const konamiSeq = useRef([])
  const [exitConfirm, setExitConfirm] = useState(false)
  const exitConfirmTimer = useRef(null)

  // Background video -- A/B crossfade
  const bgVideoARef = useRef(null)
  const bgVideoBRef = useRef(null)
  const [bgVideoA, setBgVideoA] = useState(null)
  const [bgVideoB, setBgVideoB] = useState(null)
  const [bgActive, setBgActive] = useState('a') // which slot is visible
  const bgLastId = useRef(null)

  // Show boot screen once after library loads (only on cabinet, only if games exist)
  const bootShown = useRef(false)
  useEffect(() => {
    if (bootShown.current || loading || !games.length) return
    bootShown.current = true
    setShowDetail(false)
    setSelectedIndex(0)
    if (window.nuarcade?.platform === 'win32') {
      // Check if user has a custom intro video
      const introPath = (config?.mediaPath || 'C:\\Media\\') + 'intro.mp4'
      if (window.nuarcade?.checkPath) {
        window.nuarcade.checkPath(introPath)
          .then(r => { if (r?.exists) setShowIntro(true) })
          .catch(() => {})
      }
    }
  }, [games.length, loading])
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false)
  const [sortBy, setSortBy] = useState("default")
  const [search,        setSearch       ] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [aiResults,       setAiResults      ] = useState(null)  // null = not active, [] = searching, [...] = results
  const [aiSearching,     setAiSearching    ] = useState(false)
  const [showSearch,    setShowSearch   ] = useState(false)
  const searchRef = useRef(null)
  const searchDebounce = useRef(null)

  const handleSearchChange = (val) => {
    setSearch(val)
    clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => setDebouncedSearch(val), 120)
  }
  const sounds = useArcadeSounds()

  // Background music
  const hasBgVideo = !!(bgVideoA || bgVideoB)
  const { nowPlaying, trackCount, skip: skipTrack } = useMusicPlayer({
    enabled: config?.musicEnabled !== false,
    volume:  config?.musicVolume ?? 60,
    hasBgVideo,
  })
  const { startSession, endSession, getPlaytime, formatTime, recordLaunch } = usePlaytime()
  const [artwork, setArtwork] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nuarcade_artwork") || "{}") } catch { return {} }
  })
  // Media Manager writes new artwork straight to localStorage while this
  // component stays mounted underneath it as an overlay -- without this,
  // newly fetched/imported artwork would sit there correctly saved but never
  // show up until a full restart forced a fresh read.
  const refreshArtwork = () => {
    try { setArtwork(JSON.parse(localStorage.getItem("nuarcade_artwork") || "{}")) } catch {}
  }
  const { updateAvailable, remoteVersion, handleDownload } = useVersionCheck()
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
    // If AI search returned results, use those directly
    if (aiResults && aiResults.length > 0) return aiResults

    let list = games
    if (activeCategory === "Favorites") {
      list = games.filter(g => isFavorite(g.id || g.profile))
    } else if (activeCategory === "Recent") {
      list = recentlyPlayed
    } else if (activeCategory.startsWith("col_")) {
      const col = collections[activeCategory]
      list = col ? games.filter(g => col.games.includes(g.id || g.profile)) : []
    } else if (activeCategory !== "All") {
      list = games.filter(g => g.genre === activeCategory || g.system === activeCategory || g.emulator === activeCategory.toLowerCase())
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim()
      const terms = q.split(/\s+/)
      list = list.filter(g => {
        const haystack = [
          g.title, g.system, g.genre, g.romName, g.serial
        ].filter(Boolean).join(" ").toLowerCase()
        return terms.every(term => haystack.includes(term))
      })
    }
    return sortGames(list, sortBy)
  }

  const filteredGames = useMemo(() => getFilteredGames(), [games, activeCategory, debouncedSearch, collections])
  filteredGamesRef.current = filteredGames
  // Build visible tabs list -- only categories that have games
  const _retroArchSystems = [...new Set(games.filter(g => g.emulator === 'retroarch' && g.system).map(g => g.system))].sort()
  const _visibleTabs = [...new Set(CATEGORIES.filter(cat => {
    if (cat === 'All') return true
    if (cat === 'Favorites') return games.some(g => isFavorite(g.id || g.profile))
    if (cat === 'Recent') return recentlyPlayed.length > 0
    return games.some(g => g.genre === cat || g.system === cat || g.emulator === cat.toLowerCase())
  }).concat(_retroArchSystems))].concat(Object.keys(collections))
  visibleTabsRef.current = _visibleTabs
  focusZoneRef.current   = focusZone
  topMenuIdxRef.current  = topMenuIdx
  tabFocusIdxRef.current = tabFocusIdx
  barFocusIdxRef.current = barFocusIdx
  activeCategoryRef.current    = activeCategory
  collectionsRef.current       = collections
  showDetailRef.current        = showDetail
  showSettingsRef.current      = showSettings
  showSearchRef.current        = showSearch
  showHelpRef.current          = showHelp
  showMediaManagerRef.current  = showMediaManager
  showVirtualKeyboardRef.current = showVirtualKeyboard
    showSortRef.current            = showSort
    showCollectionsRef.current     = showCollections
    showStatsRef.current           = showStats
    showAchievementsRef.current    = showAchievements
    showCoachRef.current           = showCoach
    showOperatorRef.current        = showOperator
    showRetroArchPopupRef.current  = showRetroArchPopup
    retroArchChoiceRef.current     = retroArchChoice
  const current = filteredGames[selectedIndex] || filteredGames[0]
  currentRef.current = current

  useEffect(() => { setSelectedIndex(0); setAiResults(null); setAiSearching(false) }, [activeCategory, debouncedSearch, sortBy])

  // Background video crossfade when center game changes
  useEffect(() => {
    if (!current) return
    const newId = current.id || current.profile
    if (newId === bgLastId.current) return
    bgLastId.current = newId
    const videoPath = current.videoPath || null
    if (!videoPath) return
    // Load into inactive slot, then swap
    if (bgActive === 'a') {
      setBgVideoB(videoPath)
      setTimeout(() => {
        if (bgVideoBRef.current) { bgVideoBRef.current.load(); bgVideoBRef.current.play().catch(() => {}) }
        setBgActive('b')
      }, 50)
    } else {
      setBgVideoA(videoPath)
      setTimeout(() => {
        if (bgVideoARef.current) { bgVideoARef.current.load(); bgVideoARef.current.play().catch(() => {}) }
        setBgActive('a')
      }, 50)
    }
  }, [current?.id, current?.profile, current?.videoPath])

  // Sync background video volume with the "Attract volume" setting -- applies to both
  // the A/B crossfade elements here on the main wheel, whenever the value changes
  useEffect(() => {
    const vol = Math.max(0, Math.min(1, (config?.ambientVolume ?? 35) / 100))
    if (bgVideoARef.current) bgVideoARef.current.volume = vol
    if (bgVideoBRef.current) bgVideoBRef.current.volume = vol
  }, [config?.ambientVolume, bgVideoA, bgVideoB])
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

  const launchGame = () => {
    if (launching || !current) return
    if (current.isLauncher && current.id === 'retroarch-launcher') {
      setShowRetroArchPopup(true)
      return
    }
    if (current.status === 'not-configured') {
      setLaunchError('Open TeknoParrot and configure this game -- find it in the TP game list and set the exe path.')
      setTimeout(() => setLaunchError(null), 5000)
      return
    }
    if (current.status === 'path-missing') {
      setLaunchError('Game exe not found. Check if the file has moved: ' + (current.gamePath || 'path unknown'))
      setTimeout(() => setLaunchError(null), 5000)
      return
    }
    const hint = getControllerHint(current)
    if (hint) { setShowControllerPrompt(true) } else { handleLaunch() }
  }

  const handleLaunch = async () => {
    if (launching || !current) return
    if (current.gamePath && window.nuarcade?.checkPath) {
      try {
        const result = await window.nuarcade.checkPath(current.gamePath)
        if (!result?.exists) {
          setLaunchError('Game file not found. Drive may be offline or file moved: ' + current.gamePath)
          setTimeout(() => setLaunchError(null), 6000)
          return
        }
      } catch (e) { /* proceed -- checkPath unavailable */ }
    }
    sounds.launch()
    setLaunching(true)
    // The background gameplay video (and its audio) has no reason to keep
    // playing once the actual game launches -- pause whichever of the A/B
    // slots is currently active. Resumed below once the emulator closes.
    bgVideoARef.current?.pause()
    bgVideoBRef.current?.pause()
    const gameId = current.id || current.profile
    const sessionStart = startSession(gameId)
    recordLaunch(gameId)
    addRecentlyPlayed(current)

    // When window regains focus, the user returned from the emulator -- save session
    const handleFocusReturn = () => {
      endSession(gameId, sessionStart)
      setAchievementStats(computeStats(games))
      const activeRef = bgActive === 'a' ? bgVideoARef : bgVideoBRef
      activeRef.current?.play().catch(() => {})
      window.removeEventListener("focus", handleFocusReturn)
    }
    window.addEventListener("focus", handleFocusReturn)

    // Also save if NuArcade is closed before focus returns (visibilitychange)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        endSession(gameId, sessionStart)
        const activeRef2 = bgActive === 'a' ? bgVideoARef : bgVideoBRef
        activeRef2.current?.play().catch(() => {})
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
      const gamePath = current.path || current.profilePath || current.profile || current.romPath
      try {
        let launchResult = null
        if (emu === 'rpcs3')            launchResult = await window.nuarcade.launchPs3Game(gamePath)
        else if (emu === 'xenia')       launchResult = await window.nuarcade.launchXbox360Game(gamePath)
        else if (emu === 'dolphin')     launchResult = await window.nuarcade.launchGCWiiGame(gamePath)
        else if (emu === 'pcsx2')       launchResult = await window.nuarcade.launchPs2Game(gamePath)
        else if (emu === 'ryujinx')     launchResult = await window.nuarcade.launchSwitchGame(gamePath)
        else if (emu === 'mame')        launchResult = await window.nuarcade.launchMameGame(gamePath)
        else if (emu === 'retroarch')   launchResult = await window.nuarcade.launchRetroArchGame(gamePath, current.core)
        else if (emu === 'project64')   launchResult = await window.nuarcade.launchN64Game(gamePath)
        else if (emu === 'duckstation') launchResult = await window.nuarcade.launchPs1Game(gamePath)
        else if (emu === 'flycast')     launchResult = await window.nuarcade.launchFlycastGame(gamePath)
        else if (emu === 'model2')      launchResult = await window.nuarcade.launchModel2Game(gamePath)
        else if (emu === 'model3')      launchResult = await window.nuarcade.launchModel3Game(gamePath)
        else if (emu === 'ppsspp')      launchResult = await window.nuarcade.launchPspGame(gamePath)
        else if (emu === 'cemu')        launchResult = await window.nuarcade.launchWiiUGame(gamePath)
        else if (emu === 'vpx' || current.isPinball) launchResult = await window.nuarcade.launchVpxTable(gamePath)
        else if (emu === 'steam')  launchResult = await window.nuarcade.launchSteamGame(current.steamAppId || gamePath)
        else if (emu === 'pc')     launchResult = await window.nuarcade.launchPcGame(gamePath)
        else launchResult = await window.nuarcade.launchGame(current.profilePath || current.profile)

        // Several backend launch handlers resolve with a failure object
        // rather than rejecting -- spawn errors surface asynchronously, not
        // as a synchronous throw, so a resolved promise here doesn't
        // guarantee the emulator actually started. Checking the result is
        // what actually catches a missing/misconfigured emulator path
        // instead of silently doing nothing.
        if (launchResult && launchResult.success === false) {
          showError("Failed to launch " + current.title + ": " + (launchResult.error || "unknown error"))
          setLaunching(false)
          return
        }
      } catch (e) {
        showError("Failed to launch " + current.title + ": " + (e.message || "unknown error"))
        setLaunching(false)
        return
      }
    } else {
      console.log("Dev mode would launch:", current.profile)
    }
    setTimeout(() => setLaunching(false), 3000)
  }

  // Clear any stale auto-launch state on mount -- prevents GameDetail showing on startup
  useEffect(() => {
    localStorage.removeItem("nuarcade_auto_launch")
    setShowDetail(false)
    setSelectedIndex(0)
  }, [])

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
      // search removed
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return

      if (e.key === "ArrowLeft")  { sounds.navigate(); navigate(-1) }
      if (e.key === "ArrowRight") { sounds.navigate(); navigate(1) }
      if (e.key === "Enter")      { if (!showDetail && !showHelp && !showStats && !showAchievements && !showCollections && !showSettings && !showMediaManager && !showCoach) { sounds.select(); setLaunching(false); setShowDetail(true) } }
      if ((e.key === "c" || e.key === "C") && !showDetail && !showHelp && !showStats && !showCoach && !showSettings && !showMediaManager) { sounds.select?.(); setShowCoach(true) }
      if ((e.key === "o" || e.key === "O") && !showDetail && !showHelp && !showStats && !showCoach && !showSettings && !showMediaManager) { sounds.select?.(); setShowOperator(true) }
      if (e.key === "Escape") {
        sounds.back()
        setShowDetail(false)
        setShowHelp(false); setShowSort(false); setShowStats(false)
        setShowAchievements(false); setShowCollections(false)
        // search removed
      }

      // Single-key shortcuts only fire when no overlay is open
      const anyOverlay = showDetail || showHelp || showStats || showAchievements || showCollections || showSettings || showMediaManager || showCoach || showOperator || showControllerPrompt
      if (anyOverlay) return

      // Konami code detector: UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT b a
      const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"]
      konamiSeq.current = [...konamiSeq.current, e.key].slice(-KONAMI.length)
      if (konamiSeq.current.join(",") === KONAMI.join(",")) {
        konamiSeq.current = []
        setShowKonami(true)
        sounds.coin?.()
        return
      }

      if (e.key === "f" || e.key === "F") { if (current) toggleFavorite(current.id || current.profile) }
      if (e.key === "?") setShowHelp(h => !h)
      if (e.key === "n" || e.key === "N") setShowCollections(c => !c)
      if (e.key === "t" || e.key === "T") setShowStats(s => !s)
      if (e.key === "a" || e.key === "A") setShowAchievements(s => !s)
      if (e.key === "s" || e.key === "S") setScreenshotMode(m => !m)
      if (e.key === "r" || e.key === "R") {
        const randomIndex = Math.floor(Math.random() * filteredGames.length)
        setSelectedIndex(randomIndex)
      }
      if (e.key === " ") { e.preventDefault(); if (current) launchGame() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [filteredGames, selectedIndex, showSearch, showVirtualKeyboard, showDetail, showHelp, showStats, showAchievements, showCollections, showSettings, showMediaManager, showCoach, showOperator, current, handleLaunch])

  // search focus effect removed

  
  // Top menu actions indexed 0-10
  // Named search opener -- ensures both states set for controller
  // Search removed -- use LB/RB and tabs to filter games

  const topMenuActions = [
    () => setShowSort(s => !s),                                  // 0 Sort
    () => { if (filteredGamesRef.current.length > 0) { setSelectedIndex(Math.floor(Math.random() * filteredGamesRef.current.length)); sounds.navigate() } }, // 2 RND
    () => setShowCollections(true),                              // 3 []
    () => setShowStats(true),                                    // 4 #
    () => setShowAchievements(true),                             // 5 *
    () => { if (onSwitchPlayer) onSwitchPlayer() },              // 6 Player
    () => setShowMediaManager(true),                             // 7 Media
    () => setShowSettings(true),                                 // 8 Settings
    () => setShowHelp(true),                                     // 9 ?
    () => setShowExitPopup(true), // 10 Exit -- show Yes/No popup
  ]
  const TOP_MENU_MAX = 9

  // Hint bar actions indexed 0-12
  const hintBarActions = [
    () => { if (currentRef.current) toggleFavorite(currentRef.current.id || currentRef.current.profile) }, // 0 Favorite
    () => setShowCoach(true),                                    // 1 Coach
    () => setShowOperator(true),                               // 2 Operator
  ]
  const HINT_BAR_MAX = 2
  
  const filterLeft = () => {
    const tabs = visibleTabsRef.current
    const idx = tabs.indexOf(activeCategoryRef.current)
    const newIdx = Math.max(0, idx - 1)
    setTabFocusIdx(newIdx)
    setActiveCategory(tabs[newIdx])
  }
  const filterRight = () => {
    const tabs = visibleTabsRef.current
    const idx = tabs.indexOf(activeCategoryRef.current)
    const newIdx = Math.min(tabs.length - 1, idx + 1)
    setTabFocusIdx(newIdx)
    setActiveCategory(tabs[newIdx])
  }




  // Sync overlay refs synchronously before every paint -- fixes GameDetail controller conflict
  useLayoutEffect(() => {
    showDetailRef.current          = showDetail
    showSettingsRef.current        = showSettings
    showSearchRef.current          = showSearch
    showHelpRef.current            = showHelp
    showMediaManagerRef.current    = showMediaManager
    showVirtualKeyboardRef.current = showVirtualKeyboard
    showSortRef.current            = showSort
    showCollectionsRef.current     = showCollections
    showStatsRef.current           = showStats
    showAchievementsRef.current    = showAchievements
    showCoachRef.current           = showCoach
    showOperatorRef.current        = showOperator
    showRetroArchPopupRef.current  = showRetroArchPopup
    retroArchChoiceRef.current     = retroArchChoice
    exitConfirmRef.current         = exitConfirm
    showExitPopupRef.current       = showExitPopup
    exitChoiceRef.current          = exitChoice
    focusZoneRef.current           = focusZone
    activeCategoryRef.current      = activeCategory
    collectionsRef.current         = collections
  })

  useGamepad({
    enabled: !showDetailRef.current && !showMediaManagerRef.current && !showSettingsRef.current && !showHelpRef.current && !attractMode  && !showVirtualKeyboardRef.current && !showSortRef.current && !showCollectionsRef.current && !showStatsRef.current && !showAchievementsRef.current && !showCoachRef.current && !showOperatorRef.current ,
    left: () => {
      if (showRetroArchPopupRef.current) { setRetroArchChoice(0); return }
      if (showExitPopupRef.current) { setExitChoice(0); return }
      const z = focusZoneRef.current
      if (z === 0) { setTopMenuIdx(i => Math.max(0, i - 1)); sounds.navigate(); return }
      if (z === 1) { setTabFocusIdx(i => Math.max(0, i - 1)); sounds.navigate(); return }
      if (z === 2) { navigate(-1); return }
      if (z === 3) { return }
      if (z === 4) { setBarFocusIdx(i => Math.max(0, i - 1)); sounds.navigate(); return }
    },
    right: () => {
      if (showRetroArchPopupRef.current) { setRetroArchChoice(1); return }
      if (showExitPopupRef.current) { setExitChoice(1); return }
      const z = focusZoneRef.current
      if (z === 0) { setTopMenuIdx(i => Math.min(TOP_MENU_MAX, i + 1)); sounds.navigate(); return }
      if (z === 1) { setTabFocusIdx(i => Math.min(visibleTabsRef.current.length - 1, i + 1)); sounds.navigate(); return }
      if (z === 2) { navigate(1); return }
      if (z === 3) { return }
      if (z === 4) { setBarFocusIdx(i => Math.min(HINT_BAR_MAX, i + 1)); sounds.navigate(); return }
    },
    up: () => {
      if (showExitPopupRef.current) return
      const z = focusZoneRef.current
      if (z === 4) { setFocusZone(3); sounds.navigate(); return }  // hintBar -> launch
      if (z === 3) { setFocusZone(2); sounds.navigate(); return }  // launch -> wheel
      if (z === 2) { setFocusZone(1); sounds.navigate(); return }  // wheel -> tabs
      if (z === 1) { setFocusZone(0); sounds.navigate(); return }  // tabs -> topMenu
    },
    down: () => {
      if (showExitPopupRef.current) return
      const z = focusZoneRef.current
      if (z === 0) { setFocusZone(1); sounds.navigate(); return }  // topMenu -> tabs
      if (z === 1) { setFocusZone(2); sounds.navigate(); return }  // tabs -> wheel
      if (z === 2) { setFocusZone(3); sounds.navigate(); return }  // wheel -> launch
      if (z === 3) { setFocusZone(4); sounds.navigate(); return }  // launch -> hintBar
    },
    confirm: () => {
      if (showRetroArchPopupRef.current) {
        if (retroArchChoiceRef.current === 0) { window.nuarcade?.launchRetroArch?.() }
        setShowRetroArchPopup(false)
        setRetroArchChoice(1)
        return
      }
      if (showExitPopupRef.current) {
        if (exitChoiceRef.current === 0) { window.nuarcade?.quit?.() }
        else { setShowExitPopup(false); setExitChoice(1) }
        return
      }
      const z = focusZoneRef.current
      if (z === 0) { topMenuActions[topMenuIdxRef.current]?.(); return }
      if (z === 1) {
        // Apply the highlighted tab
        const tabs = visibleTabsRef.current
        const tab = tabs[tabFocusIdxRef.current]
        if (tab) setActiveCategory(tab)
        setFocusZone(2); return
      }
      if (z === 2) { if (!showDetailRef.current) { setLaunching(false); setShowDetail(true) } return }
      if (z === 3) { launchGame(); return }
      if (z === 4) { hintBarActions[barFocusIdxRef.current]?.(); return }
    },
    settings: () => { if (!showSettingsRef.current) setShowSettings(true) },
    back: () => {
      if (showRetroArchPopupRef.current) { setShowRetroArchPopup(false); setRetroArchChoice(1); return }
      if (showExitPopupRef.current)   { setShowExitPopup(false); setExitChoice(1); return }
      if (showDetailRef.current)      { setShowDetail(false); return }
      if (showSettingsRef.current)    { setShowSettings(false); return }
      if (showSearchRef.current)      { sounds.back(); setShowSearch(false); setShowVirtualKeyboard(false); setSearch(""); setDebouncedSearch(""); return }
      if (showHelpRef.current)        { setShowHelp(false); return }
      if (showMediaManagerRef.current){ setShowMediaManager(false); return }
      // If in any zone other than wheel, return to wheel
      if (focusZoneRef.current !== 2) { setFocusZone(2); return }
    },
    favorite:      () => { if (currentRef.current) toggleFavorite(currentRef.current.id || currentRef.current.profile) },
    filterLeft:  () => {
      const allCats = [...CATEGORIES, ...Object.keys(collectionsRef.current)]
      const idx = allCats.indexOf(activeCategoryRef.current)
      setActiveCategory(allCats[(idx - 1 + allCats.length) % allCats.length])
    },
    filterRight: () => {
      const allCats = [...CATEGORIES, ...Object.keys(collectionsRef.current)]
      const idx = allCats.indexOf(activeCategoryRef.current)
      setActiveCategory(allCats[(idx + 1) % allCats.length])
    },
    random:        () => {
      if (filteredGamesRef.current.length > 0) {
        setSelectedIndex(Math.floor(Math.random() * filteredGamesRef.current.length))
        sounds.navigate()
      }
    },
    // settings handled above
  })


  const getCardStyle = (index) => {
    const diff = index - selectedIndex
    const n = filteredGames.length
    const wrapped = ((diff % n) + n) % n
    const signed = wrapped > n / 2 ? wrapped - n : wrapped
    const absPos = Math.abs(signed)
    if (absPos > 4) return { display: 'none' }
    // Arc layout: parametric circle positioning
    const ARC_RADIUS = 900
    const ANGLE_STEP = 22  // degrees between cards
    const angle = signed * ANGLE_STEP
    const angleRad = (angle * Math.PI) / 180
    const x = Math.sin(angleRad) * ARC_RADIUS * 0.95
    const y = (Math.cos(angleRad) - 1) * ARC_RADIUS * 0.18
    const scale = signed === 0 ? 1 : Math.max(0.48, 1 - absPos * 0.13)
    const opacity = signed === 0 ? 1 : Math.max(0.25, 1 - absPos * 0.18)
    const rotateY = signed * -8
    const zIndex = 10 - absPos
    return {
      transform: 'translateX(' + x + 'px) translateY(' + y + 'px) scale(' + scale + ') rotateY(' + rotateY + 'deg)',
      opacity,
      zIndex,
      pointerEvents: signed === 0 ? 'auto' : 'none',
      // Without this, the overshoot-then-correct navigation logic (two
      // separate setSelectedIndex calls 80ms apart, by design -- see
      // navigate()) has nothing to animate between, so it reads as two
      // jarring instant snaps instead of the intended spring motion. The
      // browser smoothly redirects an in-progress transition when the
      // target changes mid-flight, which is what actually produces the
      // spring feel here.
      transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
    }
  
  // Xbox controller mapping


}

  if (loading) return <div style={{ width:"100vw", height:"100vh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", color:"#888", fontFamily:"monospace", fontSize:14 }}>Scanning game library...</div>

  // Also wait if games haven't populated yet (async cache + video patch still running)
  if (!libraryEmpty && games.length === 0) return <div style={{ width:"100vw", height:"100vh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", color:"#888", fontFamily:"monospace", fontSize:14 }}>Loading...</div>

  return (
    <div className={styles.stage + (cabinetMode ? " " + styles.cabinetMode : "") + (screenshotMode ? " " + styles.screenshotMode : "")}>
      <div className={styles.bgGrid} />
      <div className={styles.bgVignette} />

      {/* Background gameplay video -- A/B crossfade */}
      {bgVideoA && (
        <video
          ref={bgVideoARef}
          className={`${styles.bgVideo} ${bgActive !== 'a' ? styles.bgVideoHidden : ''}`}
          src={bgVideoA}
          loop
          playsInline
          autoPlay
        />
      )}
      {bgVideoB && (
        <video
          ref={bgVideoBRef}
          className={`${styles.bgVideo} ${bgActive !== 'b' ? styles.bgVideoHidden : ''}`}
          src={bgVideoB}
          loop
          playsInline
          autoPlay
        />
      )}

      <AttractMode
        games={games.filter(g => !g.isLauncher)}
        isActive={attractMode}
        onSelect={setSelectedIndex}
        onWake={resetIdleTimer}
        artwork={artwork}
        attractConfig={{
          cycleSpeed:    config?.attractCycleSpeed || 6,
          preferArt:     config?.attractPreferArt !== false,
          ambientVolume: config?.ambientVolume ?? 35,
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
                  if (e.key === "Escape") { setShowSearch(false); setSearch(""); setDebouncedSearch(""); setAiResults(null); setAiSearching(false); setShowVirtualKeyboard(false) }
                  if (e.key === "Enter" && debouncedSearch.trim() && window.nuarcade?.aiSearch) {
                    const directMatches = getFilteredGames().length
                    if (directMatches < 3) {
                      // Too few direct matches -- try AI search
                      setAiSearching(true)
                      setAiResults([])
                      window.nuarcade.aiSearch({
                        query: debouncedSearch.trim(),
                        games: games.map(g => ({ id: g.id || g.profile, title: g.title, genre: g.genre, system: g.system }))
                      }).then(res => {
                        setAiSearching(false)
                        if (res.results && res.results.length > 0) {
                          // Map back to full game objects
                          const fullResults = res.results.map(r => games.find(g => (g.id || g.profile) === r.id)).filter(Boolean)
                          setAiResults(fullResults)
                        } else {
                          setAiResults(null)
                        }
                      }).catch(() => { setAiSearching(false); setAiResults(null) })
                    }
                  }
                }}
                onFocus={() => setShowVirtualKeyboard(false)}
              />
              {debouncedSearch && (
                <span className={styles.searchCount} style={{ color: aiResults ? '#00c8ff' : undefined }}>
                  {aiSearching ? 'AI searching...' : aiResults ? 'AI: ' + aiResults.length + ' results' : filteredGames.length + ' result' + (filteredGames.length !== 1 ? 's' : '')}
                </span>
              )}
              {aiResults && (
                <button className={styles.searchClose} style={{ fontSize: 9, padding: '2px 6px', marginRight: 4 }} onClick={() => setAiResults(null)} title="Clear AI results">
                  CLEAR AI
                </button>
              )}
              <button className={styles.searchClose} onClick={() => {
                setShowSearch(false); setSearch(""); setDebouncedSearch(""); setAiResults(null); setAiSearching(false); setShowVirtualKeyboard(false)
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
              <button className={(sortBy !== "default" ? styles.sortActive : styles.sortBtn) + (focusZone === 0 && topMenuIdx === 0 ? " " + styles.barFocused : "")} onClick={() => setShowSort(s => !s)}>Sort</button>
              <button className={styles.randBtn + (focusZone === 0 && topMenuIdx === 1 ? " " + styles.barFocused : "")} onClick={() => {
                if (filteredGames.length > 0) {
                  setSelectedIndex(Math.floor(Math.random() * filteredGames.length))
                  sounds.navigate()
                }
              }} title="Random game (R)">RND</button>
              <button className={styles.colBtn + (focusZone === 0 && topMenuIdx === 2 ? " " + styles.barFocused : "")} onClick={() => setShowCollections(true)} title="Collections (N)">Sets</button>
              <button className={styles.statsBtn + (focusZone === 0 && topMenuIdx === 3 ? " " + styles.barFocused : "")} onClick={() => setShowStats(true)} title="My Stats (T)">Stats</button>
              <button className={styles.achieveBtn + (focusZone === 0 && topMenuIdx === 4 ? " " + styles.barFocused : "")} onClick={() => setShowAchievements(true)} title="Achievements (A)">Ach.</button>
              {activeProfile && (
                <button
                  className={styles.settingsBtn}
                  style={{ borderColor: activeProfile.color + '44', color: activeProfile.color }}
                  onClick={onSwitchPlayer}
                  title="Switch player"
                >
                  {activeProfile.name[0]} {activeProfile.name}
                </button>
              )}
              {!activeProfile && onSwitchPlayer && (
                <button className={styles.settingsBtn + (focusZone === 0 && topMenuIdx === 5 ? " " + styles.barFocused : "")} onClick={onSwitchPlayer} title="Select player">
                  GUEST
                </button>
              )}
              <button className={styles.mediaBtn + (focusZone === 0 && topMenuIdx === 6 ? " " + styles.barFocused : "")} onClick={() => setShowMediaManager(true)}>Media</button>
              <button className={styles.settingsBtn + (focusZone === 0 && topMenuIdx === 7 ? " " + styles.barFocused : "")} onClick={() => setShowSettings(true)}>Settings</button>
              <button className={styles.helpBtn + (focusZone === 0 && topMenuIdx === 8 ? " " + styles.barFocused : "")} onClick={() => setShowHelp(true)}>?</button>
              {updateAvailable && (
                <button
                  className={styles.settingsBtn}
                  style={{ borderColor: 'rgba(255,170,0,0.5)', color: '#ffaa00' }}
                  onClick={handleDownload}
                  title={"NuArcade " + remoteVersion + " is available -- click to download"}
                >
                  UPDATE
                </button>
              )}
              <button
                className={styles.exitBtn + (focusZone === 0 && topMenuIdx === 9 ? " " + styles.barFocused : "")}
                onClick={() => setShowExitPopup(true)}
                title="Exit NuArcade"
              >
                EXIT
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.categoryStrip}>
        {_visibleTabs.map(cat => {
          const col = collections[cat]
          const label = col ? col.name : (cat === "Favorites" ? "Favorites" : cat === "Recent" ? "Recent" : cat)
          const count = col ? col.games.length : (cat === "Recent" ? recentlyPlayed.length : cat === "All" ? games.length : games.filter(g => g.genre === cat || g.system === cat || g.emulator === cat.toLowerCase()).length)
          return (
            <button
              key={cat}
              ref={el => { if (el && focusZone === 1 && visibleTabsRef.current[tabFocusIdx] === cat) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }) }}
              className={styles.catPill + (col ? " " + styles.catCollection : "") + (activeCategory === cat ? " " + styles.catActive : "") + (focusZone === 1 && visibleTabsRef.current[tabFocusIdx] === cat ? " " + styles.catFocused : "")}
              onClick={() => setActiveCategory(cat)}
            >
              {!col && systemLogos[cat.toLowerCase()] ? (
                <img src={systemLogos[cat.toLowerCase()]} alt={cat} className={styles.catLogo} />
              ) : label}
              {cat !== "Favorites" && (
                <span className={styles.catCount}>{count}</span>
              )}
            </button>
          )
        })}
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
                      <span className={styles.recentIcon}>{g.icon || (g.genre ? g.genre.slice(0,3).toUpperCase() : "?")}</span>
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
          <div className={styles.emptyBigIcon}>[ ]</div>
          <div className={styles.emptyBigTitle}>Your library is empty</div>
          <div className={styles.emptyBigSub}>
            NuArcade is ready -- you just need to add games.
          </div>
          <div className={styles.emptySteps}>
            <div className={styles.emptyStep}>
              <span className={styles.emptyStepNum}>1</span>
              <span>Install emulators via <strong>Emulators</strong> section in Settings</span>
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
            {activeCategory === "Favorites" ? "<3" : activeCategory === "Recent" ? "[]" : activeCategory === "Pinball" ? "PIN" : activeCategory === "PS3" ? "PS3" : activeCategory === "Xbox360" ? "360" : activeCategory === "GCWii" ? "GCN" : activeCategory === "PS2" ? "PS2" : "?"}
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
             activeCategory === "Pinball" ? ("Add .vpx files to " + (config?.tablesPath || "your Pinball tables folder")) :
             activeCategory === "PC" ? ("Add game folders to " + (config?.pcGamesPath || "your PC games folder")) :
             "Try selecting a different category"}
          </div>
        </div>
      ) : (
        <div className={styles.wheelArea}>
          <button className={styles.navBtn} onClick={() => navigate(-1)}>&#8249;</button>
          <div className={styles.cardTrack}>
            {filteredGames.map((game, index) => {
              const cardStyle = getCardStyle(index)
              return (
                <div
                  key={game.id || game.profile}
                  className={styles.cardSlot}
                  style={cardStyle}
                >
                  {/* getCardStyle already hides far cards via display:none,
                      but that alone doesn't stop the browser from loading
                      images for hidden DOM nodes -- skipping the mount
                      entirely for anything outside the visible window is
                      what actually avoids triggering hundreds of
                      simultaneous artwork loads on every wheel mount or
                      category switch. */}
                  {cardStyle.display !== 'none' && (
                    <GameCard
                      game={game}
                      isCenter={index === selectedIndex}
                      isAttract={attractMode}
                      isFavorite={isFavorite(game.id || game.profile)}
                      artPref={artPref}
                      artwork={artwork}
                      onClick={() => {
                        if (index === selectedIndex) { sounds.select(); setLaunching(false); setShowDetail(true) }
                        else setSelectedIndex(index)
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <button className={styles.navBtn} onClick={() => navigate(1)}>&#8250;</button>
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
                className={styles.favBtn + (isFavorite(current.id || current.profile) ? " " + styles.favActive : "") + (focusZone === 4 && barFocusIdx === 0 ? " " + styles.barFocused : "")}
                onClick={() => toggleFavorite(current.id || current.profile)}
                title="Toggle favorite (F)"
              >
                {isFavorite(current.id || current.profile) ? "<3" : "+"}
              </button>
            </div>
            <div className={styles.infoExe}>
              {current.emulator === 'mame' ? 'mame.exe ' + (current.romName || '') :
               current.emulator === 'rpcs3' ? 'rpcs3.exe ' + (current.profile || '') :
               current.emulator === 'xenia' ? 'xenia.exe ' + (current.romName || '') :
               current.emulator === 'dolphin' ? 'Dolphin.exe ' + (current.romName || '') :
               current.emulator === 'pcsx2' ? 'pcsx2-qt.exe ' + (current.romName || '') :
               current.emulator === 'ryujinx' ? 'Ryujinx.exe ' + (current.romName || '') :
               current.emulator === 'retroarch' ? 'retroarch.exe ' + (current.romName || '') :
               current.isPinball ? 'VPXStarter.exe ' + (current.romName || '') :
               current.system === 'MAME' ? 'mame.exe ' + (current.romName || '') :
               'TeknoParrotUi.exe --profile=' + (current.profile || '')}
            </div>
          </div>
          <div className={styles.infoRight}>
            <button className={styles.launchBtn + (focusZone === 3 ? " " + styles.barFocused : "")} onClick={launchGame} disabled={launching}>
              {launching ? "Launching..." : current.isPinball ? "Launch Table" : current.emulator === "retroarch" ? "Launch RetroArch to Play" : "Launch Game"}
            </button>
            {launchError && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                background: 'rgba(0,0,0,0.93)', border: '1px solid #ff4444',
                color: '#ff8888', padding: '16px 24px', borderRadius: 8, maxWidth: 420,
                fontFamily: 'Share Tech Mono, monospace', fontSize: 13,
                zIndex: 9999, textAlign: 'center', lineHeight: 1.6,
              }}>
                <div style={{ color: '#ff4444', fontSize: 11, marginBottom: 8, letterSpacing: 2 }}>CANNOT LAUNCH</div>
                {launchError}
              </div>
            )}
          </div>
        </div>
      )}

      {showSort && <SortMenu current={sortBy} onChange={setSortBy} onClose={() => setShowSort(false)} />}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}

      {showCoach && current && (
        <GameCoach
          game={current}
          onClose={() => setShowCoach(false)}
        />
      )}

      {showOperator && (
        <OperatorDashboard
          games={games}
          onClose={() => setShowOperator(false)}
        />
      )}

      {showControllerPrompt && current && (
        <ControllerPrompt
          game={current}
          onDone={() => { setShowControllerPrompt(false); handleLaunch() }}
        />
      )}
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
      {false && (
        <VirtualKeyboard
          value={search}
          onChange={val => handleSearchChange(val)}
          onDone={() => setShowVirtualKeyboard(false)}
          onClose={() => { setShowSearch(false); setSearch(""); setDebouncedSearch(""); setAiResults(null); setAiSearching(false); setShowVirtualKeyboard(false) }}
          resultCount={filteredGames.length}
        />
      )}
      {showMediaManager && <MediaManager onClose={() => setShowMediaManager(false)} onVideosUpdated={refreshVideoPaths} onArtworkUpdated={refreshArtwork} />}
      {showSettings && <Settings games={games} onClose={() => setShowSettings(false)} onCRTChange={onCRTChange} crtEnabled={crtEnabled} themeId={themeId} onThemeChange={onThemeChange} />}
      {showDetail && current && (
        <GameDetail
          game={current}
          games={games}
          artwork={artwork}
          onClose={() => { sounds.back(); setShowDetail(false) }}
          onLaunch={() => { sounds.back(); setShowDetail(false); launchGame() }}
          launching={launching}
          onSelectGame={(g) => {
            const idx = filteredGames.findIndex(fg => (fg.id && fg.id === g.id) || (fg.profile && fg.profile === g.profile))
            if (idx >= 0) setSelectedIndex(idx)
            setLaunching(false)
            setShowDetail(false)
            setTimeout(() => setShowDetail(true), 50)
          }}
        />
      )}

      {/* Keyboard hint bar -- hidden in cabinet/screenshot mode */}
      {!cabinetMode && !screenshotMode && !attractMode && (
        <div className={styles.hintBar}>
              <span className={styles.hint + (focusZone === 4 && barFocusIdx === 0 ? " " + styles.barFocused : "")}><kbd>F</kbd> Favorite</span>
              {/* Search removed from hint bar -- already in top menu zone 0 */}
          <span className={styles.hint + (focusZone === 4 && barFocusIdx === 1 ? " " + styles.barFocused : "")}><kbd>C</kbd> Coach</span>
          <span className={styles.hint + (focusZone === 4 && barFocusIdx === 2 ? " " + styles.barFocused : "")}><kbd>O</kbd> Operator</span>
              </div>
      )}
      
      {/* Exit confirmation popup */}
      {showRetroArchPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, flexDirection: 'column', gap: 20,
        }}>
          <div style={{ color: '#9933ff', fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: 3 }}>RETROARCH</div>
          <div style={{ color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: 20, letterSpacing: 2 }}>Open RetroArch?</div>
          <div style={{ color: '#aaa', fontFamily: 'Share Tech Mono, monospace', fontSize: 12, textAlign: 'center', maxWidth: 360 }}>
            Controller is configured inside RetroArch. Exit RA to return here.
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <button style={{
                padding: '10px 32px', borderRadius: 6, fontFamily: 'Orbitron, monospace', fontSize: 14, cursor: 'pointer',
                background: retroArchChoice === 0 ? 'rgba(153,51,255,0.25)' : 'rgba(255,255,255,0.05)',
                border: retroArchChoice === 0 ? '2px solid #9933ff' : '2px solid rgba(255,255,255,0.2)',
                color: retroArchChoice === 0 ? '#c88cff' : '#fff',
                boxShadow: retroArchChoice === 0 ? '0 0 16px rgba(153,51,255,0.5)' : 'none',
              }}
              onClick={() => { window.nuarcade?.launchRetroArch?.(); setShowRetroArchPopup(false); setRetroArchChoice(1) }}>YES</button>
            <button style={{
                padding: '10px 32px', borderRadius: 6, fontFamily: 'Orbitron, monospace', fontSize: 14, cursor: 'pointer',
                background: retroArchChoice === 1 ? 'rgba(153,51,255,0.25)' : 'rgba(255,255,255,0.05)',
                border: retroArchChoice === 1 ? '2px solid #9933ff' : '2px solid rgba(255,255,255,0.2)',
                color: retroArchChoice === 1 ? '#c88cff' : '#fff',
                boxShadow: retroArchChoice === 1 ? '0 0 16px rgba(153,51,255,0.5)' : 'none',
              }}
              onClick={() => { setShowRetroArchPopup(false); setRetroArchChoice(1) }}>NO</button>
          </div>
        </div>
      )}

      {launchError && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: 'rgba(0,0,0,0.93)', border: '1px solid #ff4444',
          color: '#ff8888', padding: '16px 24px', borderRadius: 8, maxWidth: 420,
          fontFamily: 'Share Tech Mono, monospace', fontSize: 13,
          zIndex: 9999, textAlign: 'center', lineHeight: 1.6,
        }}>
          <div style={{ color: '#ff4444', fontSize: 11, marginBottom: 8, letterSpacing: 2 }}>CANNOT LAUNCH</div>
          {launchError}
        </div>
      )}

      {showExitPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, flexDirection: 'column', gap: 24,
        }}>
          <div style={{ color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: 22, letterSpacing: 2 }}>
            EXIT NUARCADE?
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <button
              onClick={() => window.nuarcade?.quit?.()}
              style={{
                padding: '12px 36px', fontFamily: 'Orbitron, monospace', fontSize: 16,
                background: exitChoice === 0 ? 'rgba(0,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: exitChoice === 0 ? '2px solid #0ff' : '2px solid rgba(255,255,255,0.2)',
                color: exitChoice === 0 ? '#0ff' : '#fff', cursor: 'pointer', borderRadius: 6,
                boxShadow: exitChoice === 0 ? '0 0 16px rgba(0,255,255,0.5)' : 'none',
              }}
            >YES</button>
            <button
              onClick={() => { setShowExitPopup(false); setExitChoice(0) }}
              style={{
                padding: '12px 36px', fontFamily: 'Orbitron, monospace', fontSize: 16,
                background: exitChoice === 1 ? 'rgba(0,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: exitChoice === 1 ? '2px solid #0ff' : '2px solid rgba(255,255,255,0.2)',
                color: exitChoice === 1 ? '#0ff' : '#fff', cursor: 'pointer', borderRadius: 6,
                boxShadow: exitChoice === 1 ? '0 0 16px rgba(0,255,255,0.5)' : 'none',
              }}
            >NO</button>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace' }}>
            Left/Right to choose   A to confirm   B to cancel
          </div>
        </div>
      )}
{/* Achievement toasts */}
      <AchievementToastContainer toasts={achieveToasts} onDismiss={dismissToast} />

      {/* Error toasts */}
      <ErrorToastContainer toasts={errorToasts} onDismiss={dismissError} />

      {/* Custom intro video -- plays once on first library load if intro.mp4 exists */}
      {showIntro && (
        <IntroVideo
          mediaPath={config?.mediaPath}
          onComplete={() => setShowIntro(false)}
        />
      )}

      {/* Konami code easter egg -- version milestone celebration */}
      {showKonami && (
        <KonamiCelebration onClose={() => setShowKonami(false)} />
      )}

      {/* Now Playing badge -- bottom left, subtle */}
      {nowPlaying && config?.musicEnabled !== false && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: 24,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
            padding: '5px 10px',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            maxWidth: 260,
          }}
          onClick={skipTrack}
          title="Click to skip track"
        >
          <span style={{ color: 'rgba(0,200,255,0.5)', fontSize: 9 }}>MUSIC</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nowPlaying}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, flexShrink: 0 }}>skip</span>
        </div>
      )}
    </div>
  )
}
