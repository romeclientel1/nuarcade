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
import GameCoach from "../GameCoach/GameCoach"
import OperatorDashboard from "../OperatorDashboard/OperatorDashboard"
import { useErrorToast, ErrorToastContainer } from "./ErrorToast"
import SortMenu from "./SortMenu"
import { useArcadeSounds } from "../../hooks/useArcadeSounds"
import { shouldPlayLaunchErrorCue } from "../../hooks/launchErrorSoundGuard.js"
import { useGameLauncher } from "../../hooks/useGameLauncher"
import { useDestination } from "../../hooks/useDestination"
import { useMusicPlayer  } from "../../hooks/useMusicPlayer"
import { usePlaytime } from "../../hooks/usePlaytime"
import { useSteamGridDB } from "../../hooks/useSteamGridDB"
import { useVersionCheck } from "../../hooks/useVersionCheck"
import { getControllerHint } from "../../data/controllerHints"
import ControllerPrompt from "../ControllerPrompt/ControllerPrompt"
import { useI18n } from "../../i18n/I18nContext.js"
import DepartConfirmation from "../Depart/DepartConfirmation.jsx"
import { resolveDepartInvoker, restoreDepartFocus } from "../Depart/departInteraction.js"


import styles from "./Wheel.module.css"
import vesparaMicroMark from "../../assets/brand/vespara-symbol-micro.svg"
// D3: the centered global-header lockup must use the same approved
// doorway/beacon geometry as the startup cinematic (IntroVideo.jsx) and
// Sanctuary (VesparaHome.jsx) -- vespara-symbol-micro.svg above is a
// separate flat-silhouette glyph (no threshold-light glow, no nested
// arch strokes) meant for small inline bullets/seals elsewhere in the
// Library, not the production lockup mark itself. It stays imported and
// in use for those smaller decorative seals (placeSeal, Archive View
// fallback); only the header lockup switches to the approved asset.
import vesparaLockupSymbol from "../../assets/brand/vespara-symbol-simplified.svg"
import libraryEnvironment from "./assets/vespara-library-overlook.png"
import { useMediaFolders } from "../../hooks/useMediaFolders"
import { buildLibraryOriginContext } from "./libraryLaunchOrigin.js"
import { applyPendingRecentlyPlayedCredit } from "../../launchSession/startupRecovery.js"
import { consumeRestorationRequest } from "../../launchSession/restorationRequest.js"
import { shouldConsumeRestoration, resolveLibraryRestoration } from "../../launchSession/restorationResolution.js"

const CATEGORIES = ["All", "Favorites", "Recent", "Arcade", "MAME", "Retro", "Racing", "Fighting", "Shooter", "Rhythm", "Flying", "Sports", "N64", "PS1", "PSP", "Dreamcast", "Model2", "Model3", "PS3", "Xbox360", "GCWii", "WiiU", "PS2", "Switch", "Pinball", "PC"]
const ATTRACT_TIMEOUT = 120000
const ARCHIVE_VIDEO_FADE_MS = 600
const ARCHIVE_SELECTION_SETTLE_MS = 100

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
        <div style={tagStyle}>VESPARA {window.nuarcade?.version || 'v5.0.0'} // ROME CLIENTEL // 2026</div>
        <div style={codeStyle}>UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT B A</div>
      </div>
    </div>
  )
}

export default function Wheel({ onCRTChange, crtEnabled, themeId, onThemeChange, activeProfile, onSwitchPlayer, onReturnHome, restorationRequest, uiSoundsEnabled, onUiSoundsChange, uiSoundVolume, onUiSoundVolumeChange }) {
  const { t } = useI18n()
  const {
    games, loading, libraryEmpty, config,
  toggleFavorite, isFavorite,
    recentlyPlayed, addRecentlyPlayed,
    refreshVideoPaths,
  } = useGameLibrary()

  // Completes any Recently Played credit a startup-recovered launch session
  // left pending (see launchSession/startupRecovery.js) -- recovery itself
  // can't resolve the real game/addRecentlyPlayed (it runs before this
  // catalog exists), so it durably records the credit instead of losing
  // it. Cheap and safe to call on every games-list change: a no-op once
  // the pending queue is empty, and idempotent even if Wheel and Home both
  // end up attempting it (whichever runs first wins; the entry is removed
  // the instant it's applied).
  useEffect(() => {
    if (loading) return
    applyPendingRecentlyPlayedCredit({ games, addRecentlyPlayed })
  }, [loading, games, addRecentlyPlayed])

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
  // Zone navigation: 0=topMenu, 1=tabs, 2=wheel, 3=launch, 4=hintBar,
  // 5=continuePlaying (Milestone D2 -- inserted logically between tabs and
  // wheel; kept as its own non-sequential id rather than renumbering 2-4
  // so every pre-existing z===2/3/4 comparison stays correct unchanged).
  const [focusZone,    setFocusZone   ] = useState(2)
  const [showExitPopup, setShowExitPopup] = useState(false)
  const [exitChoice,    setExitChoice   ] = useState(1)  // 0=Yes, 1=No -- default NO
  const departTriggerRef = useRef(null)
  const departInvokerRef = useRef(null)
  const [retroArchChoice, setRetroArchChoice] = useState(1)  // 0=Yes, 1=No -- default NO
  const [topMenuIdx,   setTopMenuIdx  ] = useState(0)   // index within zone 0
  const [tabFocusIdx,  setTabFocusIdx ] = useState(0)   // index within zone 1
  const [barFocusIdx,  setBarFocusIdx ] = useState(0)   // index within zone 4
  const [continueFocusIdx, setContinueFocusIdx] = useState(0)  // index within zone 5
  const focusZoneRef    = useRef(2)
  const topMenuIdxRef   = useRef(0)
  const tabFocusIdxRef  = useRef(0)
  const barFocusIdxRef  = useRef(0)
  const continueFocusIdxRef = useRef(0)
  const continuePlayingVisibleRef = useRef(false)
  const continuePlayingItemsRef   = useRef([])
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
  const currentDestinationRef = useRef(null)
  const showMediaManagerRef = useRef(false)
  const showVirtualKeyboardRef = useRef(false)
  const showSortRef            = useRef(false)
  const showCollectionsRef     = useRef(false)
  const showAchievementsRef    = useRef(false)
  const showCoachRef           = useRef(false)
  const showOperatorRef        = useRef(false)
  const showRetroArchPopupRef  = useRef(false)
  const retroArchChoiceRef     = useRef(1)
  const exitConfirmRef         = useRef(false)
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
  const [showRetroArchPopup, setShowRetroArchPopup] = useState(false)
  const [attractMode, setAttractMode] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)
  const [showMediaManager, setShowMediaManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const { currentDestination, navigate: navigateTo, back } = useDestination()
  const [showCoach,      setShowCoach     ] = useState(false)
  const [showOperator,   setShowOperator  ] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showCollections, setShowCollections] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showKonami, setShowKonami] = useState(false)
  const konamiSeq = useRef([])
  const [exitConfirm, setExitConfirm] = useState(false)
  const exitConfirmTimer = useRef(null)

  // Archive View video -- A/B crossfade. Each slot carries the request that
  // assigned its source so late media events cannot take ownership after a
  // faster selection has superseded them.
  const bgVideoARef = useRef(null)
  const bgVideoBRef = useRef(null)
  const [bgVideoA, setBgVideoA] = useState(null)
  const [bgVideoB, setBgVideoB] = useState(null)
  const [bgActive, setBgActive] = useState(null)
  const bgActiveRef = useRef(null)
  const bgLastId = useRef(null)
  const bgRequestIdRef = useRef(0)
  const bgPendingRef = useRef(null)
  const bgSelectionTimerRef = useRef(null)
  const bgReleaseTimerRef = useRef(null)
  const bgVideoVolumeRef = useRef(0.35)

  const releaseArchiveVideoSlot = useCallback((slot, clearState = true) => {
    const ref = slot === 'a' ? bgVideoARef : bgVideoBRef
    const element = ref.current
    if (element) {
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
    if (clearState) {
      if (slot === 'a') setBgVideoA(null)
      else setBgVideoB(null)
    }
  }, [])

  const releaseAllArchiveVideo = useCallback((clearState = true) => {
    if (bgReleaseTimerRef.current) {
      clearTimeout(bgReleaseTimerRef.current)
      bgReleaseTimerRef.current = null
    }
    releaseArchiveVideoSlot('a', clearState)
    releaseArchiveVideoSlot('b', clearState)
  }, [releaseArchiveVideoSlot])

  const handleArchiveVideoError = useCallback((slot, requestId) => {
    const pending = bgPendingRef.current

    // The selected game's incoming source failed. Invalidate that request
    // once, release the previous game's video too, and reveal the selected
    // game's live artwork fallback rather than retaining the wrong memory.
    if (pending?.slot === slot && pending.requestId === requestId) {
      bgRequestIdRef.current += 1
      bgPendingRef.current = null
      bgActiveRef.current = null
      setBgActive(null)
      releaseAllArchiveVideo()
      return
    }

    // An already-active source can still fail later. Only clear it if the
    // event belongs to the currently displayed request; stale slot events
    // are ignored and cannot disturb a newer selection.
    const slotState = slot === 'a' ? bgVideoA : bgVideoB
    if (
      bgActiveRef.current === slot &&
      slotState?.requestId === requestId
    ) {
      bgActiveRef.current = null
      setBgActive(null)
      releaseArchiveVideoSlot(slot)
    }
  }, [bgVideoA, bgVideoB, releaseAllArchiveVideo, releaseArchiveVideoSlot])

  const handleArchiveVideoReady = useCallback((slot, requestId, source) => {
    const pending = bgPendingRef.current
    if (
      !pending ||
      pending.slot !== slot ||
      pending.requestId !== requestId ||
      pending.source !== source ||
      pending.playRequested
    ) return

    const ref = slot === 'a' ? bgVideoARef : bgVideoBRef
    const element = ref.current
    if (!element || element.dataset.archiveRequest !== String(requestId)) return

    pending.playRequested = true
    element.volume = bgVideoVolumeRef.current

    Promise.resolve(element.play()).then(() => {
      const latest = bgPendingRef.current
      if (
        !latest ||
        latest.slot !== slot ||
        latest.requestId !== requestId ||
        latest.source !== source ||
        element.dataset.archiveRequest !== String(requestId)
      ) {
        // A rapid selection replaced this request while play() was pending.
        // Do not pause a newer source that may now reuse the same DOM slot.
        if (element.dataset.archiveRequest === String(requestId)) element.pause()
        return
      }

      const outgoing = bgActiveRef.current
      bgPendingRef.current = null
      bgActiveRef.current = slot
      setBgActive(slot)

      if (bgReleaseTimerRef.current) clearTimeout(bgReleaseTimerRef.current)
      if (outgoing && outgoing !== slot) {
        bgReleaseTimerRef.current = setTimeout(() => {
          if (
            bgActiveRef.current === slot &&
            bgRequestIdRef.current === requestId
          ) releaseArchiveVideoSlot(outgoing)
          bgReleaseTimerRef.current = null
        }, ARCHIVE_VIDEO_FADE_MS)
      }
    }).catch(() => handleArchiveVideoError(slot, requestId))
  }, [handleArchiveVideoError, releaseArchiveVideoSlot])

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

  // Library Console (Milestone 2.2) -- the single upper-right control that
  // now houses the utilities previously spread across statsRow/
  // libraryToolsGroup/utilityGroup. consoleOpen is the mouse/keyboard-
  // driven popover state; the panel is ALSO shown whenever the pre-
  // existing gamepad zone-0 (topMenu) focus is active, so a controller
  // user moving focus into that zone still sees the buttons it's cycling
  // through. Deliberately its own state, not derived from focusZone, so
  // opening/closing it never touches the existing zone system's behavior
  // contracts (topMenuActions, TOP_MENU_MAX, zone transitions all stay
  // exactly as they were).
  const [consoleOpen, setConsoleOpen] = useState(false)
  const consoleOpenRef = useRef(false)
  const consoleTriggerRef = useRef(null)
  const consoleFirstItemRef = useRef(null)
  const consoleDepartRef = useRef(null)
  // True whenever the panel is actually shown, for either reason above --
  // computed here (not just near its render use) so the effects below can
  // read it.
  const consoleVisible = consoleOpen || focusZone === 0

  // Console-local controller focus model (2.2 correction pass) -- Search
  // was previously unreachable by controller because it isn't one of the
  // existing topMenuActions, and that array's indices/order must never
  // shift or be renumbered (compatibility contract). Rather than touch
  // topMenuActions, the console owns its OWN focus index (consoleFocusIdx)
  // while it's visible: index 0 is Search, indices 1..10 map onto the
  // existing topMenuActions indices below (skipping 5/Home, which lives
  // in worldNav, not the console). The gamepad handlers intercept D-pad/
  // confirm/back BEFORE the old zone-0 branches whenever the console is
  // visible, so those older branches are left completely intact in source
  // (satisfying every existing index/ordering test) but simply never run
  // while the console owns navigation.
  const CONSOLE_ACTION_INDICES = [0, 1, 2, 3, 4, 6, 7, 8, 9, 10]
  const CONSOLE_FOCUS_MAX = CONSOLE_ACTION_INDICES.length // Search is 0, actions are 1..10
  const [consoleFocusIdx, setConsoleFocusIdx] = useState(0)
  const consoleFocusIdxRef = useRef(0)

  const closeConsole = useCallback(() => {
    setConsoleOpen(false)
    consoleTriggerRef.current?.focus()
  }, [])

  // Focus moves into the panel on open (mouse/keyboard path only -- the
  // gamepad zone system manages its own visual focus via barFocused/
  // consoleFocusIdx and never needs real DOM focus moved for it).
  useEffect(() => {
    if (consoleOpen) consoleFirstItemRef.current?.focus()
  }, [consoleOpen])

  // Whenever the console becomes visible (by either path), controller
  // focus starts on a valid item -- Search, matching the mouse/keyboard
  // entry point's own first-item focus above.
  useEffect(() => {
    if (consoleVisible) setConsoleFocusIdx(0)
  }, [consoleVisible])

  // Search still reveals and focuses the existing input -- opening it
  // from the console (or any other future entry point) always lands
  // keyboard input directly in the field.
  useEffect(() => {
    if (showSearch) searchRef.current?.focus()
  }, [showSearch])

  // Pass the raw config values straight through -- useArcadeSounds is the
  // single normalization/conversion boundary (0-100 percent -> 0-1 gain
  // scale); pre-converting here would be a second, redundant conversion.
  const sounds = useArcadeSounds({ enabled: uiSoundsEnabled, volume: uiSoundVolume })

  const openDepart = useCallback((eventOrElement) => {
    departInvokerRef.current = resolveDepartInvoker(
      eventOrElement,
      consoleVisible ? consoleDepartRef.current : null,
      departTriggerRef.current
    )
    setExitChoice(1)
    setShowExitPopup(true)
  }, [consoleVisible])

  const cancelDepart = useCallback(() => {
    setShowExitPopup(false)
    setExitChoice(1)
    restoreDepartFocus(departInvokerRef.current)
  }, [])

  const chooseDepart = useCallback((nextChoice) => {
    sounds.navigate()
    setExitChoice(nextChoice)
  }, [sounds])

  const acceptDepart = useCallback(() => {
    sounds.select()
    window.nuarcade?.quit?.()
  }, [sounds])

  const declineDepart = useCallback(() => {
    sounds.back()
    cancelDepart()
  }, [sounds, cancelDepart])

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
  const { updateAvailable, remoteVersion, handleUpdateNow, installing, progress } = useVersionCheck()
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

  // categoryOverride lets launch-origin restoration resolve an arbitrary
  // category's list with this exact same filtering -- omitted everywhere
  // else, so existing callers behave identically.
  const getFilteredGames = (categoryOverride) => {
    const category = categoryOverride ?? activeCategory
    // If AI search returned results, use those directly
    if (aiResults && aiResults.length > 0) return aiResults

    let list = games
    if (category === "Favorites") {
      list = games.filter(g => isFavorite(g.id || g.profile))
    } else if (category === "Recent") {
      list = recentlyPlayed
    } else if (category.startsWith("col_")) {
      const col = collections[category]
      list = col ? games.filter(g => col.games.includes(g.id || g.profile)) : []
    } else if (category !== "All") {
      list = games.filter(g => g.genre === category || g.system === category || g.emulator === category.toLowerCase())
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
  consoleOpenRef.current        = consoleOpen
  consoleFocusIdxRef.current    = consoleFocusIdx
  currentDestinationRef.current = currentDestination
  showMediaManagerRef.current  = showMediaManager
  showVirtualKeyboardRef.current = showVirtualKeyboard
    showSortRef.current            = showSort
    showCollectionsRef.current     = showCollections
    showAchievementsRef.current    = showAchievements
    showCoachRef.current           = showCoach
    showOperatorRef.current        = showOperator
    showRetroArchPopupRef.current  = showRetroArchPopup
    retroArchChoiceRef.current     = retroArchChoice
  // Continue Playing visibility -- mirrors the recentCarousel render guard
  // exactly, so the focus graph (zone 5) never routes into a row that
  // isn't actually on screen (D2 vertical-navigation correction). Cap
  // raised 6 -> 12 for D3's full-width shelf, which has genuine room to
  // show more than 6 without crowding; ordering/launch/focus logic below
  // is unchanged, it just has a longer list to work with.
  const continuePlayingItems = recentlyPlayed.slice(0, 12)
  const continuePlayingVisible = !libraryEmpty && !cabinetMode && !screenshotMode && continuePlayingItems.length > 0 && activeCategory !== "Recent" && !debouncedSearch
  continueFocusIdxRef.current       = continueFocusIdx
  continuePlayingVisibleRef.current = continuePlayingVisible
  continuePlayingItemsRef.current   = continuePlayingItems
  const current = filteredGames[selectedIndex] || filteredGames[0]
  const currentArtwork = current ? artwork?.[current.id || current.profile] : null
  const previewStill =
    currentArtwork?.hero ||
    currentArtwork?.screenshot ||
    current?.snapPath ||
    currentArtwork?.capsule ||
    current?.boxArtPath ||
    currentArtwork?.logo ||
    null
  currentRef.current = current

  // One-shot suppression: launch-origin restoration sets category and index
  // together in the same update -- without this, the reset below (which is
  // correct for every player-driven category change) would immediately wipe
  // the restored index back to 0 when the restored category differs.
  const suppressSelectedIndexResetRef = useRef(false)
  useEffect(() => {
    setAiResults(null)
    setAiSearching(false)
    if (suppressSelectedIndexResetRef.current) { suppressSelectedIndexResetRef.current = false; return }
    setSelectedIndex(0)
  }, [activeCategory, debouncedSearch, sortBy])

  // D2 vertical-navigation correction -- Continue Playing is now a real
  // focus zone (5). If the row disappears out from under an active zone-5
  // focus (filter change, search, category switch to "Recent", list drains
  // to empty) controller focus must not dead-end there -- it falls back to
  // the main collection, the same place Down already sends it from zone 1
  // when the row was never visible to begin with.
  useEffect(() => {
    if (focusZone === 5 && !continuePlayingVisible) setFocusZone(2)
  }, [focusZone, continuePlayingVisible])

  // Keep the remembered Continue Playing focus item in range as the list
  // (max 6 slots) shrinks, so re-entering zone 5 later restores a real item.
  useEffect(() => {
    setContinueFocusIdx(i => Math.min(i, Math.max(0, continuePlayingItems.length - 1)))
  }, [continuePlayingItems.length])

  // Prepare the selected game's video in the inactive Archive View slot.
  // The outgoing slot remains visible until onCanPlay + play() confirm that
  // the incoming source is genuinely ready. Ordinary rerenders/focus changes
  // do not restart this effect because it is keyed only to stable selection
  // identity and video source fields.
  useEffect(() => {
    if (bgSelectionTimerRef.current) clearTimeout(bgSelectionTimerRef.current)

    // Wheel navigation intentionally overshoots for 80ms before settling.
    // Waiting just past that visual spring prevents the transient card from
    // tearing down the outgoing preview or loading media the user did not
    // actually select.
    bgSelectionTimerRef.current = setTimeout(() => {
      bgSelectionTimerRef.current = null
      const newId = current ? (current.id || current.profile) : null
      const videoPath = current?.videoPath || null
      const selectionKey = `${newId || 'empty'}::${videoPath || 'fallback'}`
      if (selectionKey === bgLastId.current) return
      bgLastId.current = selectionKey

      const requestId = ++bgRequestIdRef.current
      if (bgReleaseTimerRef.current) {
        clearTimeout(bgReleaseTimerRef.current)
        bgReleaseTimerRef.current = null
      }

      if (!current || !videoPath) {
        bgPendingRef.current = null
        bgActiveRef.current = null
        setBgActive(null)
        releaseAllArchiveVideo()
        return
      }

      const activeSlot = bgActiveRef.current
      const incomingSlot = activeSlot === 'a' ? 'b' : 'a'
      const incomingRef = incomingSlot === 'a' ? bgVideoARef : bgVideoBRef
      incomingRef.current?.pause()

      const incoming = { source: videoPath, requestId }
      bgPendingRef.current = {
        slot: incomingSlot,
        source: videoPath,
        requestId,
        playRequested: false,
      }

      if (incomingSlot === 'a') setBgVideoA(incoming)
      else setBgVideoB(incoming)
    }, ARCHIVE_SELECTION_SETTLE_MS)

    return () => {
      if (bgSelectionTimerRef.current) {
        clearTimeout(bgSelectionTimerRef.current)
        bgSelectionTimerRef.current = null
      }
    }
  }, [current?.id, current?.profile, current?.videoPath])

  // Assigning a source is deliberately selection-driven and lazy. Explicit
  // load() calls after React commits the new src keep local file:// media
  // behavior deterministic without assigning or decoding any extra source.
  useEffect(() => {
    if (bgVideoA && bgVideoARef.current) bgVideoARef.current.load()
  }, [bgVideoA])
  useEffect(() => {
    if (bgVideoB && bgVideoBRef.current) bgVideoBRef.current.load()
  }, [bgVideoB])

  // Preserve the existing Attract-volume policy for Archive View audio.
  useEffect(() => {
    const vol = Math.max(0, Math.min(1, (config?.ambientVolume ?? 35) / 100))
    bgVideoVolumeRef.current = vol
    if (bgVideoARef.current) bgVideoARef.current.volume = vol
    if (bgVideoBRef.current) bgVideoBRef.current.volume = vol
  }, [config?.ambientVolume, bgVideoA, bgVideoB])

  // Stop decoding and release both file/network sources on unmount. The
  // request increment also makes any already-resolving play() promise stale.
  useEffect(() => () => {
    bgRequestIdRef.current += 1
    bgPendingRef.current = null
    bgActiveRef.current = null
    if (bgSelectionTimerRef.current) clearTimeout(bgSelectionTimerRef.current)
    releaseAllArchiveVideo(false)
  }, [releaseAllArchiveVideo])
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

  const {
    launch, confirmLaunch, dismissControllerPrompt, resetLaunching,
    launching, launchError, launchErrorSeq, needsControllerPrompt,
  } = useGameLauncher({
    addRecentlyPlayed,
    // Recently Played is no longer tagged/written here -- useGameLauncher
    // itself is now the single write authority, writing once on
    // confirmed return, bound to whichever profile was active at launch
    // time. See useGameLauncher.js and selectors/profileReadiness.js for
    // the full contract.
    activeProfileId: activeProfile?.id ?? null,
    startSession, endSession, recordLaunch,
    showError,
    playLaunchSound: sounds.launch,
    artwork,
    onLaunchStart: () => {
      // The Archive View gameplay video (and its audio) has no reason to
      // keep playing once the actual game launches -- resumed in onReturn
      // below once the emulator closes.
      bgVideoARef.current?.pause()
      bgVideoBRef.current?.pause()
    },
    onReturn: () => {
      setAchievementStats(computeStats(games))
      const activeSlot = bgActiveRef.current
      const activeRef = activeSlot === 'a' ? bgVideoARef : activeSlot === 'b' ? bgVideoBRef : null
      activeRef?.current?.play().catch(() => {})
    },
    originDestination: "library",
    originContext: buildLibraryOriginContext({ activeCategory, selectedIndex }),
  })

  const departOverlayActive =
    showDetail ||
    currentDestination === "help" ||
    currentDestination === "stats" ||
    showAchievements ||
    showCollections ||
    showSettings ||
    showMediaManager ||
    showCoach ||
    showOperator ||
    !!needsControllerPrompt
  const showUniversalDepart = !showExitPopup && (departOverlayActive || !consoleVisible)

  // Surface-scoped launch-error sound: plays sounds.error() once when a
  // genuinely new, non-empty launchError appears -- never on an ordinary
  // rerender while the same message is still showing, and never merely
  // because the display text changed (e.g. a locale switch retranslating
  // an already-visible message). Keyed off launchErrorSeq -- a monotonic
  // occurrence counter useGameLauncher increments once per showLaunchError()
  // call, entirely independent of the (translated, locale-dependent)
  // message text -- rather than comparing launchError's string value,
  // which is not a safe identity across a locale change and could
  // coincidentally collide between two unrelated failures. The ref resets
  // to null the instant the error clears, so a later, separate failure
  // (even with an identical message) is treated as new and sounds again.
  // Deliberately not wired through useErrorToast/ErrorToast (that shared
  // component stays untouched this milestone) -- this only covers Wheel's
  // own local launchError state. Plain ref + effect, no timers, no new
  // React state beyond the seq already exposed by useGameLauncher.
  const lastPlayedLaunchErrorSeqRef = useRef(null)
  useEffect(() => {
    const { play, nextLastPlayedSeq } = shouldPlayLaunchErrorCue(launchError, launchErrorSeq, lastPlayedLaunchErrorSeqRef.current)
    if (play) sounds.error()
    lastPlayedLaunchErrorSeqRef.current = nextLastPlayedSeq
  }, [launchError, launchErrorSeq])

  const launchGame = () => {
    if (launching || !current) return
    if (current.isLauncher && current.id === 'retroarch-launcher') {
      setShowRetroArchPopup(true)
      return
    }
    launch(current)
  }

  // Clear any stale auto-launch state on mount -- prevents GameDetail showing on startup
  useEffect(() => {
    localStorage.removeItem("nuarcade_auto_launch")
    setShowDetail(false)
    setSelectedIndex(0)
  }, [])

  // Launch-origin restoration -- consumes App's restoration request exactly
  // once, at the first moment the catalog is genuinely ready. While
  // `loading` is true this whole component renders the "Scanning game
  // library..." screen (below), so there is no window for the player to
  // navigate the wheel before this applies -- no timeout heuristics needed.
  // Resolution priority lives in resolveLibraryRestoration (game id
  // outranks section, section outranks saved index, everything clamps and
  // degrades safely); the lists it resolves against come from this
  // component's own real getFilteredGames, so category semantics can never
  // drift. Profile validation already happened in App when the request was
  // built -- a request only reaches this surface for the matching profile.
  useEffect(() => {
    if (!shouldConsumeRestoration(restorationRequest, { catalogReady: !loading })) return
    if (!consumeRestorationRequest(restorationRequest)) return
    const savedSectionId = restorationRequest.sectionId
    const sectionExists = !!savedSectionId && visibleTabsRef.current.includes(savedSectionId)
    const resolution = resolveLibraryRestoration(restorationRequest, {
      sectionExists,
      sectionGames: sectionExists ? getFilteredGames(savedSectionId) : [],
      allGames: getFilteredGames("All"),
    })
    if (resolution.category !== activeCategoryRef.current) {
      suppressSelectedIndexResetRef.current = true
      setActiveCategory(resolution.category)
      const tabIdx = visibleTabsRef.current.indexOf(resolution.category)
      if (tabIdx >= 0) setTabFocusIdx(tabIdx)
    }
    setSelectedIndex(resolution.index)
  }, [restorationRequest, loading, games])

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
      if (e.key === "Enter") { if (!showDetail && currentDestination !== "help" && currentDestination !== "stats" && !showAchievements && !showCollections && !showSettings && !showMediaManager && !showCoach) { sounds.select(); resetLaunching(); setShowDetail(true) } else if (showDetail) { if (current) launchGame() } }
      if ((e.key === "c" || e.key === "C") && !showDetail && currentDestination !== "help" && currentDestination !== "stats" && !showCoach && !showSettings && !showMediaManager) { sounds.select?.(); setShowCoach(true) }
      if ((e.key === "o" || e.key === "O") && !showDetail && currentDestination !== "help" && currentDestination !== "stats" && !showCoach && !showSettings && !showMediaManager) { sounds.select?.(); setShowOperator(true) }
      if (e.key === "Escape") {
        sounds.back()
        setShowDetail(false)
        if (currentDestination === "help") back()
        if (currentDestination === "stats") back()
        setShowSort(false)
        setShowAchievements(false); setShowCollections(false)
        if (consoleOpenRef.current) closeConsole()
        // search removed
      }

      // Single-key shortcuts only fire when no overlay is open
      const anyOverlay = showDetail || currentDestination === "help" || currentDestination === "stats" || showAchievements || showCollections || showSettings || showMediaManager || showCoach || showOperator || !!needsControllerPrompt
      if (anyOverlay) return

      // Backspace: direct keyboard path to Return to Sanctuary from the
      // primary Library view -- the existing controller path (topMenu zone
      // walk) and mouse click on the Home button are the only other ways
      // to reach onReturnHome, and neither is reachable from a keyboard
      // alone (see the Library return-path report). Guards SELECT and
      // contenteditable in addition to the INPUT/TEXTAREA check already
      // done above, so it's self-contained and independently correct even
      // though INPUT/TEXTAREA can never reach this line. Never redefines
      // Escape, never touches overlay-close behavior above.
      if (e.key === "Backspace") {
        const target = e.target
        const isEditableTarget = target?.tagName === "SELECT" || target?.isContentEditable
        if (!isEditableTarget) { if (onReturnHome) onReturnHome() }
      }

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
      if (e.key === "?") { if (currentDestination === "help") back(); else navigateTo("help") }
      if (e.key === "n" || e.key === "N") setShowCollections(c => !c)
      if (e.key === "t" || e.key === "T") { if (currentDestination === "stats") back(); else navigateTo("stats") }
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
  }, [filteredGames, selectedIndex, showSearch, showVirtualKeyboard, showDetail, currentDestination, showAchievements, showCollections, showSettings, showMediaManager, showCoach, showOperator, current, onReturnHome])

  // search focus effect removed

  
  // Top menu actions indexed 0-10
  // Named search opener -- ensures both states set for controller
  // Search removed -- use LB/RB and tabs to filter games

  const topMenuActions = [
    () => setShowSort(s => !s),                                  // 0 Sort
    () => { if (filteredGamesRef.current.length > 0) { setSelectedIndex(Math.floor(Math.random() * filteredGamesRef.current.length)); sounds.navigate() } }, // 2 RND
    () => setShowCollections(true),                              // 3 []
    () => navigateTo("stats"),                                   // 4 #
    () => setShowAchievements(true),                             // 5 *
    () => { if (onReturnHome) onReturnHome() },                  // 6 Home
    () => { if (onSwitchPlayer) onSwitchPlayer() },              // 7 Player
    () => setShowMediaManager(true),                             // 8 Media
    () => setShowSettings(true),                                 // 9 Settings
    () => navigateTo("help"),                                    // 10 ?
    () => openDepart(consoleDepartRef.current),                   // 11 Depart
  ]
  const TOP_MENU_MAX = 10

  // Hint bar actions indexed 0-12
  const hintBarActions = [
    () => { if (currentRef.current) toggleFavorite(currentRef.current.id || currentRef.current.profile) }, // 0 Favorite
    () => setShowCoach(true),                                    // 1 Coach
    () => setShowOperator(true),                               // 2 Operator
  ]
  const HINT_BAR_MAX = 2
  




  // Sync overlay refs synchronously before every paint -- fixes GameDetail controller conflict
  useLayoutEffect(() => {
    showDetailRef.current          = showDetail
    showSettingsRef.current        = showSettings
    showSearchRef.current          = showSearch
    currentDestinationRef.current  = currentDestination
    showMediaManagerRef.current    = showMediaManager
    showVirtualKeyboardRef.current = showVirtualKeyboard
    showSortRef.current            = showSort
    showCollectionsRef.current     = showCollections
    showAchievementsRef.current    = showAchievements
    showCoachRef.current           = showCoach
    showOperatorRef.current        = showOperator
    showRetroArchPopupRef.current  = showRetroArchPopup
    retroArchChoiceRef.current     = retroArchChoice
    exitConfirmRef.current         = exitConfirm
    focusZoneRef.current           = focusZone
    activeCategoryRef.current      = activeCategory
    collectionsRef.current         = collections
  })

  useGamepad({
    enabled: !showDetailRef.current && !showMediaManagerRef.current && !showSettingsRef.current && currentDestinationRef.current !== "help" && currentDestinationRef.current !== "stats" && !attractMode && !needsControllerPrompt && !showVirtualKeyboardRef.current && !showSortRef.current && !showCollectionsRef.current && !showAchievementsRef.current && !showCoachRef.current && !showOperatorRef.current ,
    left: () => {
      if (showRetroArchPopupRef.current) { if (retroArchChoiceRef.current !== 0) { sounds.navigate(); setRetroArchChoice(0) } return }
      // Console-local focus (2.2 correction) -- while the Library Console
      // is visible (mouse-opened, or the pre-existing gamepad zone-0
      // focus), D-pad left/right moves consoleFocusIdx, never topMenuIdx.
      // The old z===0 branch below is left completely intact but
      // unreachable in this state, since it's the same condition this
      // check already covers.
      if (consoleOpenRef.current || focusZoneRef.current === 0) { setConsoleFocusIdx(i => Math.max(0, i - 1)); sounds.navigate(); return }
      const z = focusZoneRef.current
      if (z === 0) { setTopMenuIdx(i => Math.max(0, i - 1)); sounds.navigate(); return }
      if (z === 1) { const tabs = visibleTabsRef.current; const newIdx = tabFocusIdxRef.current <= 0 ? tabs.length - 1 : tabFocusIdxRef.current - 1; setTabFocusIdx(newIdx); setActiveCategory(tabs[newIdx]); sounds.navigate(); return }
      if (z === 5) { const n = continuePlayingItemsRef.current.length; if (n > 0) { setContinueFocusIdx(i => (i <= 0 ? n - 1 : i - 1)); sounds.navigate() } return }
      if (z === 2) { navigate(-1); return }
      if (z === 3) { return }
      if (z === 4) { setBarFocusIdx(i => Math.max(0, i - 1)); sounds.navigate(); return }
    },
    right: () => {
      if (showRetroArchPopupRef.current) { if (retroArchChoiceRef.current !== 1) { sounds.navigate(); setRetroArchChoice(1) } return }
      if (consoleOpenRef.current || focusZoneRef.current === 0) { setConsoleFocusIdx(i => Math.min(CONSOLE_FOCUS_MAX, i + 1)); sounds.navigate(); return }
      const z = focusZoneRef.current
      if (z === 0) { setTopMenuIdx(i => Math.min(TOP_MENU_MAX, i + 1)); sounds.navigate(); return }
      if (z === 1) { const tabs = visibleTabsRef.current; const newIdx = tabFocusIdxRef.current >= tabs.length - 1 ? 0 : tabFocusIdxRef.current + 1; setTabFocusIdx(newIdx); setActiveCategory(tabs[newIdx]); sounds.navigate(); return }
      if (z === 5) { const n = continuePlayingItemsRef.current.length; if (n > 0) { setContinueFocusIdx(i => (i >= n - 1 ? 0 : i + 1)); sounds.navigate() } return }
      if (z === 2) { navigate(1); return }
      if (z === 3) { return }
      if (z === 4) { setBarFocusIdx(i => Math.min(HINT_BAR_MAX, i + 1)); sounds.navigate(); return }
    },
    up: () => {
      // Documented boundary (2.2 correction) -- Up while the console is
      // visible is a deliberate no-op, not a silent trap: the console is
      // already the top-level header, exactly like the pre-existing
      // zone-0 (topMenu) had no further "up" target either. Left/Right/
      // Confirm/Back all remain fully live; Down (below) is the live
      // spatial exit.
      if (consoleOpenRef.current || focusZoneRef.current === 0) return
      const z = focusZoneRef.current
      if (z === 4) { setFocusZone(3); sounds.navigate(); return }  // hintBar -> launch
      if (z === 3) { setFocusZone(2); sounds.navigate(); return }  // launch -> wheel
      if (z === 2) { setFocusZone(continuePlayingVisibleRef.current ? 5 : 1); sounds.navigate(); return }  // wheel -> continue playing (or tabs when empty)
      if (z === 5) { setFocusZone(1); sounds.navigate(); return }  // continue playing -> tabs
      if (z === 1) { setFocusZone(0); sounds.navigate(); return }  // tabs -> topMenu
    },
    down: () => {
      // Down exits the console the same way the pre-existing zone-0 ->
      // tabs transition did -- close the popover (if mouse-opened) and
      // land in the category/tab zone, which already shows visible
      // controller focus via its own existing
      // `focusZone === 1 && ...catFocused` condition (unchanged).
      if (consoleOpenRef.current || focusZoneRef.current === 0) { setConsoleOpen(false); setFocusZone(1); sounds.navigate(); return }
      const z = focusZoneRef.current
      if (z === 0) { setFocusZone(1); sounds.navigate(); return }  // topMenu -> tabs
      // D2 correction: Down from the active filter enters Continue Playing
      // when it has items on screen; when the row is empty/hidden it skips
      // straight to the main collection, exactly like before this milestone.
      if (z === 1) { setFocusZone(continuePlayingVisibleRef.current ? 5 : 2); sounds.navigate(); return }  // tabs -> continue playing (or wheel when empty)
      if (z === 5) { setFocusZone(2); sounds.navigate(); return }  // continue playing -> wheel
      if (z === 2) { setFocusZone(3); sounds.navigate(); return }  // wheel -> launch
      if (z === 3) { setFocusZone(4); sounds.navigate(); return }  // launch -> hintBar
    },
    confirm: () => {
      if (showRetroArchPopupRef.current) {
        // Choosing Yes here commits an external-app launch (bypasses the
        // useGameLauncher pipeline entirely -- see launchRetroArch), so it
        // gets the launch cue directly, never select() first (one action,
        // one cue). Choosing No is a cancellation -- back().
        if (retroArchChoiceRef.current === 0) { sounds.launch(); window.nuarcade?.launchRetroArch?.() }
        else { sounds.back() }
        setShowRetroArchPopup(false)
        setRetroArchChoice(1)
        return
      }
      if (consoleOpenRef.current || focusZoneRef.current === 0) {
        // consoleFocusIdx 0 is Search -- reveal/focus it exactly like the
        // mouse-driven consoleSearchItem button does. Every other index
        // maps onto the existing topMenuActions array via
        // CONSOLE_ACTION_INDICES, so the same unchanged handlers fire.
        if (consoleFocusIdxRef.current === 0) { setShowSearch(true); setConsoleOpen(false); return }
        const actionIdx = CONSOLE_ACTION_INDICES[consoleFocusIdxRef.current - 1]
        topMenuActions[actionIdx]?.()
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
      if (z === 5) {
        // Mirrors the mouse recentCard onClick exactly: jump the main
        // collection's selection to the focused Continue Playing item
        // (falling back to "All" if it's no longer in the current filter),
        // then hand focus down to the collection so the new selection is
        // where the next action (Launch) will act on.
        const items = continuePlayingItemsRef.current
        const g = items[continueFocusIdxRef.current]
        if (g) {
          const idx = filteredGamesRef.current.findIndex(fg =>
            (fg.id && fg.id === g.id) || (fg.profile && fg.profile === g.profile)
          )
          if (idx >= 0) { setSelectedIndex(idx); sounds.navigate() }
          else { setActiveCategory("All"); setSelectedIndex(0) }
        }
        setFocusZone(2); return
      }
      if (z === 2) { if (!showDetailRef.current) { resetLaunching(); setShowDetail(true) } return }
      if (z === 3) { launchGame(); return }
      if (z === 4) { hintBarActions[barFocusIdxRef.current]?.(); return }
    },
    settings: () => { if (!showSettingsRef.current) setShowSettings(true) },
    back: () => {
      if (showRetroArchPopupRef.current) { sounds.back(); setShowRetroArchPopup(false); setRetroArchChoice(1); return }
      if (showDetailRef.current)      { setShowDetail(false); return }
      if (showSettingsRef.current)    { setShowSettings(false); return }
      if (showSearchRef.current)      { sounds.back(); setShowSearch(false); setShowVirtualKeyboard(false); setSearch(""); setDebouncedSearch(""); return }
      if (currentDestinationRef.current === "help") { back(); return }
      if (showMediaManagerRef.current){ setShowMediaManager(false); return }
      // Mouse-opened console: close it and restore focus to its trigger
      // predictably, same as Escape/backdrop-click.
      if (consoleOpenRef.current)     { closeConsole(); return }
      // If in any zone other than wheel, return to wheel
      if (focusZoneRef.current !== 2) { setFocusZone(2); return }
    },
    favorite:      () => { if (currentRef.current) toggleFavorite(currentRef.current.id || currentRef.current.profile) },
    filterLeft:  () => {
      const tabs = visibleTabsRef.current
      const idx = tabs.indexOf(activeCategoryRef.current)
      const newIdx = idx <= 0 ? tabs.length - 1 : idx - 1
      setTabFocusIdx(newIdx)
      setActiveCategory(tabs[newIdx])
    },
    filterRight: () => {
      const tabs = visibleTabsRef.current
      const idx = tabs.indexOf(activeCategoryRef.current)
      const newIdx = idx >= tabs.length - 1 ? 0 : idx + 1
      setTabFocusIdx(newIdx)
      setActiveCategory(tabs[newIdx])
    },
    random:        () => {
      if (filteredGamesRef.current.length > 0) {
        setSelectedIndex(Math.floor(Math.random() * filteredGamesRef.current.length))
        sounds.navigate()
      }
    },
    // settings handled above
  })

  // START remains a direct Depart path while a full-screen Library
  // destination owns controller navigation. Ordinary overlay controls
  // continue to own D-pad, confirm, and back.
  useGamepad({
    enabled: departOverlayActive && !showExitPopup,
    settings: openDepart,
  })


  // Milestone D3 -- straight horizontal shelf, replacing the earlier arc/
  // cylinder layout (no sin/cos radius, no rotateY perspective skew, no
  // vertical curve). The selection/navigation architecture underneath is
  // completely unchanged: same signed/absPos derivation from selectedIndex,
  // same 4-card-each-side display cutoff, same zIndex/pointerEvents/
  // transition contract navigate()'s overshoot-then-correct spring relies
  // on -- only the transform formula that used to bend cards along an arc
  // now just spaces them along a flat line, with a gentler scale/opacity
  // falloff so distant covers stay legible instead of shrinking to slivers.
  const getCardStyle = (index) => {
    const diff = index - selectedIndex
    const n = filteredGames.length
    const wrapped = ((diff % n) + n) % n
    const signed = wrapped > n / 2 ? wrapped - n : wrapped
    const absPos = Math.abs(signed)
    if (absPos > 4) return { display: 'none' }
    const CARD_SLOT_WIDTH = 230  // px between adjacent card centers on the flat shelf
    const x = signed * CARD_SLOT_WIDTH
    const scale = signed === 0 ? 1 : Math.max(0.74, 1 - absPos * 0.065)
    const opacity = signed === 0 ? 1 : Math.max(0.5, 1 - absPos * 0.12)
    const zIndex = 10 - absPos
    return {
      transform: 'translateX(' + x + 'px) scale(' + scale + ')',
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
  }

  const getTabStyle = (index) => {
    const tabs = visibleTabsRef.current
    const n = tabs.length
    if (!n) return {}
    const diff = index - tabFocusIdx
    const wrapped = ((diff % n) + n) % n
    const signed = wrapped > n / 2 ? wrapped - n : wrapped
    const absPos = Math.abs(signed)
    if (absPos > 8) return { display: 'none' }
    const SLOT_WIDTH = 168
    const x = signed * SLOT_WIDTH
    const opacity = signed === 0 ? 1 : Math.max(0.35, 1 - absPos * 0.11)
    const scale = signed === 0 ? 1 : Math.max(0.88, 1 - absPos * 0.025)
    return {
      transform: 'translateX(' + x + 'px) scale(' + scale + ')',
      opacity,
      zIndex: 10 - absPos,
      transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
    }
  }

  if (loading) return <div style={{ width:"100vw", height:"100vh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", color:"#888", fontFamily:"monospace", fontSize:14 }}>{t("wheel.scanning")}</div>

  // Also wait if games haven't populated yet (async cache + video patch still running)
  if (!libraryEmpty && games.length === 0) return <div style={{ width:"100vw", height:"100vh", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", color:"#888", fontFamily:"monospace", fontSize:14 }}>{t("common.loading")}</div>

  return (
    <div className={styles.stage + (cabinetMode ? " " + styles.cabinetMode : "") + (screenshotMode ? " " + styles.screenshotMode : "")}>
      <img
        src={libraryEnvironment}
        alt=""
        aria-hidden="true"
        className={styles.libraryEnvironment}
      />
      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.libraryHorizon} aria-hidden="true" />
      <div className={styles.bgVignette} aria-hidden="true" />

      <aside className={styles.previewReservation} aria-hidden="true">
        <div className={styles.previewHeading}>{t("wheel.previewTitle")}</div>
        <div className={styles.previewScreen}>
          {previewStill ? (
            <img src={previewStill} alt="" className={styles.previewStill} />
          ) : (
            <div className={styles.previewFallback}>
              <img src={vesparaMicroMark} alt="" />
              <span>{current?.title || "VESPARA"}</span>
            </div>
          )}
          {bgVideoA && (
            <video
              ref={bgVideoARef}
              className={`${styles.archiveVideo} ${bgActive === 'a' ? styles.archiveVideoActive : ''}`}
              src={bgVideoA.source}
              data-archive-request={bgVideoA.requestId}
              preload="auto"
              loop
              playsInline
              autoPlay
              tabIndex={-1}
              onCanPlay={() => handleArchiveVideoReady('a', bgVideoA.requestId, bgVideoA.source)}
              onError={() => handleArchiveVideoError('a', bgVideoA.requestId)}
            />
          )}
          {bgVideoB && (
            <video
              ref={bgVideoBRef}
              className={`${styles.archiveVideo} ${bgActive === 'b' ? styles.archiveVideoActive : ''}`}
              src={bgVideoB.source}
              data-archive-request={bgVideoB.requestId}
              preload="auto"
              loop
              playsInline
              autoPlay
              tabIndex={-1}
              onCanPlay={() => handleArchiveVideoReady('b', bgVideoB.requestId, bgVideoB.source)}
              onError={() => handleArchiveVideoError('b', bgVideoB.requestId)}
            />
          )}
        </div>
      </aside>

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

      <div className={styles.globalHeader}>
        <div className={styles.worldNav}>
          <button className={styles.returnHomeBtn + (focusZone === 0 && topMenuIdx === 5 ? " " + styles.barFocused : "")} onClick={() => { if (onReturnHome) onReturnHome() }} title={t("wheel.returnHomeTitle")}>{t("wheel.navHome")}</button>
        </div>
        <div className={styles.libraryBrand} aria-hidden="true">
          <img src={vesparaLockupSymbol} alt="" className={styles.libraryBrandSeal} />
          <div>
            <div className={styles.libraryBrandName}>VESPARA</div>
            <div className={styles.libraryBrandWorld}>THE SANCTUARY</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          {showSearch ? (
            <div className={styles.searchWrap}>
              <input
                ref={searchRef}
                className={styles.searchInput}
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={t("wheel.searchPlaceholder")}
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
            <div className={styles.consoleWrap}>
              <button
                ref={consoleTriggerRef}
                className={styles.consoleTrigger + (consoleVisible ? " " + styles.consoleTriggerActive : "")}
                onClick={() => setConsoleOpen(v => !v)}
                aria-haspopup="true"
                aria-expanded={consoleVisible}
                aria-controls="library-console-panel"
                title={updateAvailable ? t("wheel.libraryConsoleUpdateTitle") : t("wheel.libraryConsoleTitle")}
                aria-label={updateAvailable ? t("wheel.libraryConsoleUpdateTitle") : undefined}
              >
                {t("wheel.libraryConsole")}
                {updateAvailable && (
                  <span className={styles.consoleUpdateBadge} aria-hidden="true">{t("wheel.updateBadge")}</span>
                )}
              </button>
              {consoleVisible && (
                <div className={styles.consoleBackdrop} onClick={closeConsole} aria-hidden="true" />
              )}
              {consoleVisible && (
                <div id="library-console-panel" role="menu" className={styles.consolePanel}>
                  <button
                    ref={consoleFirstItemRef}
                    className={styles.consoleSearchItem + (consoleVisible && consoleFocusIdx === 0 ? " " + styles.barFocused : "")}
                    onClick={() => { setShowSearch(true); setConsoleOpen(false) }}
                  >
                    {t("wheel.searchAction")}
                  </button>
                  <div className={styles.consoleDivider} aria-hidden="true" />
                  <div className={styles.libraryToolsGroup}>
                    <button className={(sortBy !== "default" ? styles.sortActive : styles.sortBtn) + ((focusZone === 0 && topMenuIdx === 0) || (consoleVisible && consoleFocusIdx === 1) ? " " + styles.barFocused : "")} onClick={() => setShowSort(s => !s)}>Sort</button>
                    <button className={styles.randBtn + ((focusZone === 0 && topMenuIdx === 1) || (consoleVisible && consoleFocusIdx === 2) ? " " + styles.barFocused : "")} onClick={() => {
                      if (filteredGames.length > 0) {
                        setSelectedIndex(Math.floor(Math.random() * filteredGames.length))
                        sounds.navigate()
                      }
                    }} title={t("wheel.randomTitle")}>RND</button>
                    <button className={styles.colBtn + ((focusZone === 0 && topMenuIdx === 2) || (consoleVisible && consoleFocusIdx === 3) ? " " + styles.barFocused : "")} onClick={() => setShowCollections(true)} title={t("wheel.collectionsTitle")}>Sets</button>
                    <button className={styles.statsBtn + ((focusZone === 0 && topMenuIdx === 3) || (consoleVisible && consoleFocusIdx === 4) ? " " + styles.barFocused : "")} onClick={() => navigateTo("stats")} title={t("wheel.statsTitle")}>Stats</button>
                    <button className={styles.achieveBtn + ((focusZone === 0 && topMenuIdx === 4) || (consoleVisible && consoleFocusIdx === 5) ? " " + styles.barFocused : "")} onClick={() => setShowAchievements(true)} title={t("wheel.achievementsTitle")}>Ach.</button>
                  </div>
                  <div className={styles.consoleDivider} aria-hidden="true" />
                  <div className={styles.utilityGroup}>
                    {activeProfile && (
                      <button
                        className={styles.settingsBtn}
                        style={{ borderColor: activeProfile.color + '44', color: activeProfile.color }}
                        onClick={onSwitchPlayer}
                        title={t("wheel.switchPlayerTitle")}
                      >
                        {activeProfile.name[0]} {activeProfile.name}
                      </button>
                    )}
                    {!activeProfile && onSwitchPlayer && (
                      <button className={styles.settingsBtn + ((focusZone === 0 && topMenuIdx === 6) || (consoleVisible && consoleFocusIdx === 6) ? " " + styles.barFocused : "")} onClick={onSwitchPlayer} title={t("wheel.selectPlayerTitle")}>
                        {t("wheel.guestCta")}
                      </button>
                    )}
                    <button className={styles.mediaBtn + ((focusZone === 0 && topMenuIdx === 7) || (consoleVisible && consoleFocusIdx === 7) ? " " + styles.barFocused : "")} onClick={() => setShowMediaManager(true)}>{t("wheel.navMedia")}</button>
                    <button className={styles.settingsBtn + ((focusZone === 0 && topMenuIdx === 8) || (consoleVisible && consoleFocusIdx === 8) ? " " + styles.barFocused : "")} onClick={() => setShowSettings(true)}>{t("wheel.navSettings")}</button>
                    <button className={styles.helpBtn + ((focusZone === 0 && topMenuIdx === 9) || (consoleVisible && consoleFocusIdx === 9) ? " " + styles.barFocused : "")} onClick={() => navigateTo("help")}>?</button>
                    {updateAvailable && (
                      <button
                        className={styles.settingsBtn}
                        style={{ borderColor: 'rgba(255,170,0,0.5)', color: '#ffaa00' }}
                        onClick={handleUpdateNow}
                        disabled={installing}
                        title={installing ? t("settings.installingEllipsis") : t("settings.updateAvailableTooltip", { version: remoteVersion })}
                      >
                        {installing ? (progress != null ? t("settings.installing", { progress }) : t("settings.installingEllipsis")) : t("settings.updateNow")}
                      </button>
                    )}
                    {!departOverlayActive && (
                      <button
                        ref={consoleDepartRef}
                        className={styles.consoleDepartBtn + ((focusZone === 0 && topMenuIdx === 10) || (consoleVisible && consoleFocusIdx === 10) ? " " + styles.barFocused : "")}
                        onClick={openDepart}
                        title={t("wheel.exitTitle")}
                      >
                        {t("wheel.depart")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className={styles.travelerGreeting} aria-hidden="true">
            <span>{t("wheel.welcomeBack")}</span>
            <strong>{activeProfile?.name || t("wheel.guestCta")}</strong>
          </div>
        </div>
      </div>

      <div className={styles.libraryTitleRow}>
        <div className={styles.placeIdentity}>
          <img src={vesparaMicroMark} alt="" aria-hidden="true" className={styles.placeSeal} />
          <div className={styles.placeName}>{t("wheel.libraryPlaceName")}</div>
          <div className={styles.placeSubtitle} aria-hidden="true">
            <span>{t("wheel.libraryPlaceSubtitle")}</span>
            <span className={styles.placeSubtitleDivider}>·</span>
            <span className={styles.gameCount}>{filteredGames.length} game{filteredGames.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {showUniversalDepart && (
        <button
          ref={departTriggerRef}
          className={styles.departReservation}
          onClick={openDepart}
          title={t("wheel.exitTitle")}
          aria-label={`${t("wheel.depart")} — ${t("wheel.departSubtitle")}`}
        >
          <span>{t("wheel.depart")}</span>
          <small aria-hidden="true">{t("wheel.departSubtitle")}</small>
        </button>
      )}

      <div className={styles.categoryStrip}>
        {_visibleTabs.map((cat, tabIdx) => {
          const col = collections[cat]
          const label = col ? col.name : (cat === "Favorites" ? "Favorites" : cat === "Recent" ? "Recent" : cat === "All" ? t("wheel.categoryAll") : cat)
          const count = col ? col.games.length : (cat === "Recent" ? recentlyPlayed.length : cat === "All" ? games.length : games.filter(g => g.genre === cat || g.system === cat || g.emulator === cat.toLowerCase()).length)
          return (
            <button
              key={cat}
              style={getTabStyle(tabIdx)}
              className={styles.catPill + (col ? " " + styles.catCollection : "") + (activeCategory === cat ? " " + styles.catActive : "") + (focusZone === 1 && visibleTabsRef.current[tabFocusIdx] === cat ? " " + styles.catFocused : "")}
              onClick={() => { setTabFocusIdx(tabIdx); setActiveCategory(cat) }}
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
      {continuePlayingVisible && (
        <div className={styles.recentCarousel}>
          <div className={styles.recentLabel + (focusZone === 5 ? " " + styles.recentLabelFocused : "")}>Continue Playing</div>
          <div className={styles.recentTrack}>
            {continuePlayingItems.map((g, idx) => {
              const gArt = artwork?.[g.id || g.profile]
              const thumb = gArt?.capsule || gArt?.hero || null
              const colors = { Racing:"#0066cc",Fighting:"#9900cc",Shooter:"#cc0000",Rhythm:"#6600cc",
                Arcade:"#ff6600",Retro:"#9933ff",PS1:"#003791",N64:"#e4000f",Dreamcast:"#ff6600",
                PS3:"#0070d1",Xbox360:"#107c10",GCWii:"#6b21a8",PS2:"#003791",Switch:"#e4000f" }
              const accent = colors[g.genre] || "#00ff88"
              const isFocused = focusZone === 5 && continueFocusIdx === idx
              return (
                <button
                  key={g.id || g.profile}
                  className={styles.recentCard + (isFocused ? " " + styles.recentCardFocused : "")}
                  onClick={() => {
                    setContinueFocusIdx(idx)
                    const idxInWheel = filteredGames.findIndex(fg =>
                      (fg.id && fg.id === g.id) || (fg.profile && fg.profile === g.profile)
                    )
                    if (idxInWheel >= 0) { setSelectedIndex(idxInWheel); sounds.navigate() }
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
          <div className={styles.emptyBigTitle}>{t("wheel.libraryEmptyTitle")}</div>
          <div className={styles.emptyBigSub}>
            {t("wheel.libraryEmptySub")}
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
            {activeCategory === "Favorites" ? t("wheel.noFavorites") :
             activeCategory === "Recent" ? t("wheel.noRecent") :
             activeCategory === "Pinball" ? t("wheel.noPinball") :
             search ? t("wheel.noResultsFor", { search }) :
             t("wheel.noGamesInCategory")}
          </div>
          <div className={styles.emptySub}>
            {activeCategory === "Favorites" ? t("wheel.tipFavorite") :
             activeCategory === "Recent" ? t("wheel.tipRecent") :
             activeCategory === "Pinball" ? t("wheel.tipPinball", { path: config?.tablesPath || "your Pinball tables folder" }) :
             activeCategory === "PC" ? t("wheel.tipPc", { path: config?.pcGamesPath || "your PC games folder" }) :
             t("wheel.tipOther")}
          </div>
        </div>
      ) : (
        <div className={styles.wheelArea}>
          {/* Shelf foundation (Milestone 3) -- purely decorative
              architectural layers behind the existing carousel, giving
              the card row a physical resting plane instead of floating
              in empty space. Static/positional only: none of these
              depend on selectedIndex or any other state, so there is
              nothing here for reduced motion to neutralize beyond the
              transitions declared in CSS. */}
          <div className={styles.shelfBays} aria-hidden="true" />
          <div className={styles.shelfNiche} aria-hidden="true" />
          <div className={styles.shelfRail} aria-hidden="true" />
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
                      isNavFocused={focusZone === 2}
                      isAttract={attractMode}
                      isFavorite={isFavorite(game.id || game.profile)}
                      artPref={artPref}
                      artwork={artwork}
                      onClick={() => {
                        if (index === selectedIndex) { sounds.select(); resetLaunching(); setShowDetail(true) }
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
              <span className={styles.infoMetaDivider} aria-hidden="true">·</span>
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
                title={t("wheel.favoriteTitle")}
              >
                {isFavorite(current.id || current.profile) ? "<3" : "+"}
              </button>
              {/* D3: the one quiet secondary detail (genre) now folds onto
                  the same line as platform/readiness/favorite instead of
                  its own row, so the strip stays shallow -- same
                  styles.infoSummary element/content D2 tests expect. */}
              <span className={styles.infoMetaDivider} aria-hidden="true">·</span>
              <span className={styles.infoSummary}>{current.genre}</span>
            </div>
          </div>
          <div className={styles.infoRight}>
            <button className={styles.launchBtn + (focusZone === 3 ? " " + styles.barFocused : "")} onClick={launchGame} disabled={launching}>
              {launching ? t("wheel.launching") : current.isPinball ? t("wheel.launchTable") : t("wheel.launchGame")}
            </button>
            {launchError && (
              <div className={styles.dialogFadeOnly} style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                background: 'rgba(0,0,0,0.93)', border: '1px solid #ff4444',
                color: '#ff8888', padding: '16px 24px', borderRadius: 8, maxWidth: 420,
                fontFamily: 'Share Tech Mono, monospace', fontSize: 13,
                zIndex: 9999, textAlign: 'center', lineHeight: 1.6,
              }}>
                <div style={{ color: '#ff4444', fontSize: 11, marginBottom: 8, letterSpacing: 2 }}>{t("wheel.cannotLaunchTitle")}</div>
                {launchError}
              </div>
            )}
          </div>
        </div>
      )}

      {showSort && <SortMenu current={sortBy} onChange={setSortBy} onClose={() => setShowSort(false)} />}
      {currentDestination === "help" && <Help onClose={back} />}

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

      {needsControllerPrompt && (
        <ControllerPrompt
          game={needsControllerPrompt}
          onDone={() => confirmLaunch(needsControllerPrompt)}
        />
      )}
      {showCollections && (
        <Collections
          games={games}
          currentGame={current}
          onClose={handleCollectionsClose}
        />
      )}
      {currentDestination === "stats" && (
        <Stats games={games} onClose={back} />
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
      {showSettings && <Settings games={games} onClose={() => setShowSettings(false)} onCRTChange={onCRTChange} crtEnabled={crtEnabled} themeId={themeId} onThemeChange={onThemeChange} uiSoundsEnabled={uiSoundsEnabled} onUiSoundsChange={onUiSoundsChange} uiSoundVolume={uiSoundVolume} onUiSoundVolumeChange={onUiSoundVolumeChange} />}
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
            resetLaunching()
            setShowDetail(false)
            setTimeout(() => setShowDetail(true), 50)
          }}
        />
      )}

      {/* Keyboard hint bar -- hidden in cabinet/screenshot mode */}
      {!cabinetMode && !screenshotMode && !attractMode && (
        <div className={styles.hintBar}>
              <span className={styles.hint + (focusZone === 4 && barFocusIdx === 0 ? " " + styles.barFocused : "")}><kbd>F</kbd> {t("wheel.hintFavorite")}</span>
              {/* Search removed from hint bar -- already in top menu zone 0 */}
          <span className={styles.hint + (focusZone === 4 && barFocusIdx === 1 ? " " + styles.barFocused : "")}><kbd>C</kbd> {t("wheel.hintCoach")}</span>
          <span className={styles.hint + (focusZone === 4 && barFocusIdx === 2 ? " " + styles.barFocused : "")}><kbd>O</kbd> {t("wheel.hintOperator")}</span>
              </div>
      )}
      
      {/* Exit confirmation popup */}
      {showRetroArchPopup && (
        <div className={styles.dialogOverlay} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, flexDirection: 'column', gap: 20,
        }}>
          <div style={{ color: '#9933ff', fontFamily: 'Orbitron, monospace', fontSize: 11, letterSpacing: 3 }}>RETROARCH</div>
          <div style={{ color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: 20, letterSpacing: 2 }}>{t("wheel.confirmRetroArchTitle")}</div>
          <div style={{ color: '#aaa', fontFamily: 'Share Tech Mono, monospace', fontSize: 12, textAlign: 'center', maxWidth: 360 }}>
            {t("wheel.confirmRetroArchBody")}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <button style={{
                padding: '10px 32px', borderRadius: 6, fontFamily: 'Orbitron, monospace', fontSize: 14, cursor: 'pointer', textTransform: 'uppercase',
                background: retroArchChoice === 0 ? 'rgba(153,51,255,0.25)' : 'rgba(255,255,255,0.05)',
                border: retroArchChoice === 0 ? '2px solid #9933ff' : '2px solid rgba(255,255,255,0.2)',
                color: retroArchChoice === 0 ? '#c88cff' : '#fff',
                boxShadow: retroArchChoice === 0 ? '0 0 16px rgba(153,51,255,0.5)' : 'none',
              }}
              onClick={() => { sounds.launch(); window.nuarcade?.launchRetroArch?.(); setShowRetroArchPopup(false); setRetroArchChoice(1) }}>{t("common.yes")}</button>
            <button style={{
                padding: '10px 32px', borderRadius: 6, fontFamily: 'Orbitron, monospace', fontSize: 14, cursor: 'pointer', textTransform: 'uppercase',
                background: retroArchChoice === 1 ? 'rgba(153,51,255,0.25)' : 'rgba(255,255,255,0.05)',
                border: retroArchChoice === 1 ? '2px solid #9933ff' : '2px solid rgba(255,255,255,0.2)',
                color: retroArchChoice === 1 ? '#c88cff' : '#fff',
                boxShadow: retroArchChoice === 1 ? '0 0 16px rgba(153,51,255,0.5)' : 'none',
              }}
              onClick={() => { sounds.back(); setShowRetroArchPopup(false); setRetroArchChoice(1) }}>{t("common.no")}</button>
          </div>
        </div>
      )}

      {launchError && (
        <div className={styles.dialogFadeOnly} style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: 'rgba(0,0,0,0.93)', border: '1px solid #ff4444',
          color: '#ff8888', padding: '16px 24px', borderRadius: 8, maxWidth: 420,
          fontFamily: 'Share Tech Mono, monospace', fontSize: 13,
          zIndex: 9999, textAlign: 'center', lineHeight: 1.6,
        }}>
          <div style={{ color: '#ff4444', fontSize: 11, marginBottom: 8, letterSpacing: 2 }}>{t("wheel.cannotLaunchTitle")}</div>
          {launchError}
        </div>
      )}

      {showExitPopup && (
        <DepartConfirmation
          eyebrow={t("home.worldName")}
          title={t("wheel.confirmExitTitle")}
          hint={t("wheel.confirmExitHint")}
          yesLabel={t("common.yes")}
          noLabel={t("common.no")}
          choice={exitChoice}
          onChoiceChange={chooseDepart}
          onConfirm={acceptDepart}
          onCancel={declineDepart}
        />
      )}
{/* Achievement toasts */}
      <AchievementToastContainer toasts={achieveToasts} onDismiss={dismissToast} />

      {/* Error toasts */}
      <ErrorToastContainer toasts={errorToasts} onDismiss={dismissError} />

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
