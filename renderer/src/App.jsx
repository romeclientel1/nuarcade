import { useState, useEffect, useRef, Component } from "react"
import Intro from "./components/Intro/Intro"
import IntroVideo from "./components/Wheel/IntroVideo"
import Wheel from "./components/Wheel/Wheel"
import VesparaHome from "./components/VesparaHome/VesparaHome"
import CRT from "./components/CRT/CRT"
import PlayerSelect from "./components/PlayerSelect/PlayerSelect"
import { useProfiles } from "./context/ProfileContext"
import { useDestination } from "./hooks/useDestination"
import CoinCounter from "./components/CoinCounter/CoinCounter"
import { useTheme } from "./hooks/useTheme"
import { recoverLaunchSession } from "./launchSession/startupRecovery.js"
import { buildRestorationForProfile, invalidateRestorationRequest } from "./launchSession/restorationRequest.js"
import {
  DEFAULT_UI_SOUNDS_ENABLED, DEFAULT_UI_SOUND_VOLUME,
  normalizeUiSoundsEnabled, normalizeUiSoundVolume,
} from "./hooks/uiSoundConfig.js"
import "./index.css"

// Controller debug overlay -- press D to toggle
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#000',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#ef4444', fontFamily: 'monospace', padding: 40, gap: 16
        }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>NuArcade render error</div>
          <div style={{ fontSize: 12, color: '#ff8888', maxWidth: 600, textAlign: 'center' }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '8px 24px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 4 }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const buildMediaVideoPath = (mediaPath, fileName) => {
  const base = (mediaPath || "C:\\Media\\").replace(/[\\/]+$/, "")
  return `${base}\\${fileName}`
}

const resolveCinematicMediaPath = async (fileName, configuredMediaPath) => {
  const mediaPath = configuredMediaPath || "C:\\Media\\"

  // A user-supplied file remains the first-choice override on Windows.
  if (
    window.nuarcade?.platform === "win32" &&
    window.nuarcade?.checkPath
  ) {
    try {
      const result = await window.nuarcade.checkPath(
        buildMediaVideoPath(mediaPath, fileName)
      )
      if (result?.exists) return mediaPath
    } catch {
      // Fall through to the bundled Vespara default.
    }
  }

  try {
    return await window.nuarcade?.getBundledCinematicMediaPath?.(fileName) || null
  } catch {
    return null
  }
}

export default function App() {
  const [phase, setPhase] = useState("videoCheck")
  const [startupConfig, setStartupConfig] = useState(undefined)
  const [launchVideo, setLaunchVideo] = useState(null)
  const { profiles, activeProfile, addProfile, selectProfile, selectGuest, deleteProfile } = useProfiles()
  // App-level surface: Vespara Home <-> the existing Wheel/Library
  // experience. A second, independent useDestination() instance --
  // completely separate from Wheel's own internal one governing
  // Help/Stats. null = Home, "library" = Wheel. Named locally so it's
  // clear this instance has nothing to do with Wheel's destinations.
  // back: backSurface is not yet wired to anything -- Wheel's own return
  // path is pending confirmation (see report). Only what's actually used
  // is destructured here to avoid dead code in the meantime.
  const {
    currentDestination: currentSurface,
    navigate: navigateSurface,
    goHome: goToSurfaceRoot,
  } = useDestination()
  const { themeId, setTheme } = useTheme()
  // Settings already persists this to the backend config under crtEffect --
  // this just loads that saved value on launch and mirrors live changes so
  // the CRT overlay actually reflects what's configured instead of being
  // permanently hardcoded on.
  const [crtEnabled, setCrtEnabled] = useState(true)
  // Same pattern for the UI-sound settings (Settings persists these under
  // uiSoundsEnabled/uiSoundVolume) -- loaded once here, mirrored live via
  // the same onXChange callbacks Settings already uses for crtEffect, and
  // passed down to both Home and Wheel so sound stays in sync across
  // surfaces without a restart. Defaults reproduce today's original
  // always-on, unscaled sound behavior exactly.
  const [uiSoundsEnabled, setUiSoundsEnabled] = useState(DEFAULT_UI_SOUNDS_ENABLED)
  const [uiSoundVolume, setUiSoundVolume] = useState(DEFAULT_UI_SOUND_VOLUME)
  useEffect(() => {
    window.nuarcade?.getConfig?.().then(cfg => {
      setStartupConfig(cfg || null)
      if (!cfg) return
      if (typeof cfg.crtEffect === 'boolean') setCrtEnabled(cfg.crtEffect)
      setUiSoundsEnabled(normalizeUiSoundsEnabled(cfg.uiSoundsEnabled))
      setUiSoundVolume(normalizeUiSoundVolume(cfg.uiSoundVolume))
    }).catch(() => setStartupConfig(null))
  }, [])

  // The full sanctuary-entry film is Vespara's primary opening.
  // A configured Media-folder file can override the bundled product default.
  // intro.mp4 remains a legacy fallback; if neither video resolves, startup
  // continues into the reliable built-in arrival.
  useEffect(() => {
    if (phase !== "videoCheck") return

    const fallback = setTimeout(() => {
      setPhase(current => current === "videoCheck" ? "intro" : current)
    }, 1500)

    if (startupConfig === undefined) {
      return () => clearTimeout(fallback)
    }

    const mediaPath = startupConfig?.mediaPath || "C:\\Media\\"
    let cancelled = false

    const resolveLaunchVideo = async () => {
      const sanctuaryPath = await resolveCinematicMediaPath(
        "sanctuary-entry.mp4",
        mediaPath
      )

      if (sanctuaryPath) {
        return {
          mediaPath: sanctuaryPath,
          fileName: "sanctuary-entry.mp4",
          isFullArrival: true,
        }
      }

      const introPath = await resolveCinematicMediaPath(
        "intro.mp4",
        mediaPath
      )

      if (introPath) {
        return {
          mediaPath: introPath,
          fileName: "intro.mp4",
          isFullArrival: false,
        }
      }

      return null
    }

    resolveLaunchVideo()
      .then(video => {
        if (cancelled) return
        clearTimeout(fallback)

        if (video) {
          setLaunchVideo(video)
          setPhase("launchVideo")
        } else {
          setPhase("intro")
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(fallback)
          setPhase("intro")
        }
      })

    return () => {
      cancelled = true
      clearTimeout(fallback)
    }
  }, [phase, startupConfig])

  // Startup launch-session recovery -- runs once, before Player Select, so
  // a stale nonterminal session from a previous crash/reload/restart never
  // blocks a new launch (sessionStore's own launch guard would otherwise
  // refuse every launch attempt until this resolves). Lifecycle
  // reconciliation (outcome, Recently Played, LIVING) happens immediately
  // here, using the session's own captured profileId -- never gated on
  // whatever profile happens to be active right now. Destination/focus
  // restoration is deliberately DEFERRED to the separate effect below:
  // activeProfileId is reliably null at this point (ProfileContext always
  // starts a fresh session at null until Player Select runs), and null is
  // an unresolved state, not evidence the session belongs to someone else
  // -- so it must not be treated as a profile mismatch here. See
  // startupRecovery.js for the full separation.
  const [pendingRestoration, setPendingRestoration] = useState(null)
  useEffect(() => {
    let cancelled = false
    let unsubscribe = null
    recoverLaunchSession({
      getLaunchLifecycleStatus: window.nuarcade?.getLaunchLifecycleStatus,
      onLaunchLifecycleTerminal: window.nuarcade?.onLaunchLifecycleTerminal,
    }).then((outcome) => {
      if (cancelled) {
        if (typeof outcome.unsubscribe === "function") outcome.unsubscribe()
        return
      }
      unsubscribe = outcome.unsubscribe || null
      if (outcome.pendingRestoration) setPendingRestoration(outcome.pendingRestoration)
    }).catch(() => {})
    return () => {
      cancelled = true
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [])

  // Applies the pending restoration exactly once, only once a real profile
  // has actually been resolved this session (phase === "main", reached via
  // handlePlayerSelect/handleGuest/handleAddProfile below).
  // buildRestorationForProfile turns the captured facts into a
  // serializable request: full origin + focus fields when the selected
  // profile matches the captured one (and it still exists), a bare Home
  // fallback otherwise -- never another player's Library position. The
  // request is handed to the owning surface below, which resolves the
  // focus/section against its own real catalog and consumes the request
  // exactly once; any newer intentional navigation (the handlers further
  // down) invalidates it first.
  const [restorationRequest, setRestorationRequest] = useState(null)
  const appliedRestorationRef = useRef(false)
  useEffect(() => {
    if (!pendingRestoration) return
    if (phase !== "main") return
    if (appliedRestorationRef.current) return
    if (!activeProfile) return
    const request = buildRestorationForProfile(pendingRestoration, {
      selectedProfileId: activeProfile.id, profiles,
    })
    if (!request) return // unresolved -- stay pending, do not consume
    appliedRestorationRef.current = true
    setRestorationRequest(request)
    if (request.destination === "library") navigateSurface("library")
    else goToSurfaceRoot()
  }, [pendingRestoration, phase, activeProfile, profiles, navigateSurface, goToSurfaceRoot])

  // Newer intentional navigation wins over any stale, not-yet-consumed
  // restoration -- once the player deliberately goes somewhere themselves,
  // the old request is dead (module-level invalidation, so even an
  // already-passed prop can no longer be consumed by a mounted surface).
  const clearPendingRestoration = () => {
    if (restorationRequest) invalidateRestorationRequest(restorationRequest)
    setRestorationRequest(null)
    setPendingRestoration(null)
  }

  const handleLaunchVideoComplete = () => {
    if (launchVideo?.isFullArrival) {
      setPhase("playerSelect")
    } else {
      setPhase("intro")
    }
  }

  const handleIntroComplete = () => setPhase("playerSelect")

  const handlePlayerSelect = (player) => {
    selectProfile(player.id)
    setPhase("main")
  }

  const handleGuest = () => {
    selectGuest()
    setPhase("main")
  }

  const handleAddProfile = (name) => {
    addProfile(name)
    setPhase("main")
  }

  const handleReturnToPlayerSelect = () => {
    // Reset the surface to Home so selecting a different player next
    // cannot land them directly inside the previous player's Library view.
    clearPendingRestoration()
    goToSurfaceRoot()
    setPhase("playerSelect")
  }

  const handleEnterLibrary = () => {
    clearPendingRestoration()
    navigateSurface("library")
  }

  const handleReturnHomeFromWheel = () => {
    clearPendingRestoration()
    goToSurfaceRoot()
  }

  return (
    <ErrorBoundary>
      <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>

        {phase === "launchVideo" && launchVideo && (
          <IntroVideo
            mediaPath={launchVideo.mediaPath}
            fileName={launchVideo.fileName}
            onComplete={handleLaunchVideoComplete}
          />
        )}

        {phase === "intro" && (
          <Intro onComplete={handleIntroComplete} />
        )}

        {phase === "playerSelect" && (
          <PlayerSelect
            profiles={profiles}
            onSelect={handlePlayerSelect}
            onGuest={handleGuest}
            onAdd={handleAddProfile}
            onDelete={deleteProfile}
            uiSoundsEnabled={uiSoundsEnabled}
            uiSoundVolume={uiSoundVolume}
          />
        )}

        {phase === "main" && (
          currentSurface === "library" ? (
            <Wheel
              activeProfile={activeProfile}
              onSwitchPlayer={handleReturnToPlayerSelect}
              onReturnHome={handleReturnHomeFromWheel}
              crtEnabled={crtEnabled}
              onCRTChange={setCrtEnabled}
              themeId={themeId}
              onThemeChange={setTheme}
              uiSoundsEnabled={uiSoundsEnabled}
              onUiSoundsChange={setUiSoundsEnabled}
              uiSoundVolume={uiSoundVolume}
              onUiSoundVolumeChange={setUiSoundVolume}
              restorationRequest={restorationRequest?.destination === "library" ? restorationRequest : null}
            />
          ) : (
            <VesparaHome
              onEnterLibrary={handleEnterLibrary}
              onSwitchPlayer={handleReturnToPlayerSelect}
              uiSoundsEnabled={uiSoundsEnabled}
              uiSoundVolume={uiSoundVolume}
              restorationRequest={restorationRequest?.destination === "home" ? restorationRequest : null}
            />
          )
        )}

        <CRT enabled={crtEnabled} />
        <CoinCounter />

      </div>
    </ErrorBoundary>
  )
}
