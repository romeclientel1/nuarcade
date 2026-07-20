import { useState, useRef, useCallback } from "react"
import { getControllerHint } from "../data/controllerHints"
import { PROFILE_TAG_FIELD } from "../selectors/profileReadiness"

// useGameLauncher -------------------------------------------------------
// The single place a game actually gets launched, extracted out of
// Wheel's previous launchGame()/handleLaunch() closures. Session
// tracking, Recently Played, marquee/LED/Pixelcade, controller rumble,
// and the full per-emulator dispatch chain all live here, parameterized
// on `game` instead of closing over Wheel's own `current` state -- so a
// future consumer (e.g. a Home destination) can launch a game without
// Wheel needing to exist.
//
// Deliberately does NOT call useGameLibrary()/usePlaytime()/
// useArcadeSounds() itself -- the specific functions those hooks expose
// are passed in instead, so there is only ever one instance of
// session/library/sound state, never a second shadow copy. Only Wheel
// instantiates this hook today. If a second consumer starts using it
// alongside Wheel at the same time, the two instances won't know about
// each other's in-flight launches -- fine while only one instantiates
// it, worth revisiting before that changes.
//
// The RetroArch launcher-picker shortcut (isLauncher / 'retroarch-launcher')
// is intentionally NOT handled here -- it isn't a game launch, it's a
// shortcut into a different picker UI, and stays in Wheel.
export function useGameLauncher({
  addRecentlyPlayed,
  activeProfileId,
  startSession,
  endSession,
  recordLaunch,
  showError,
  playLaunchSound,
  artwork,
  onLaunchStart,
  onReturn,
} = {}) {
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState(null)
  const [needsControllerPrompt, setNeedsControllerPrompt] = useState(null)

  // Latest-ref pattern: launch/confirmLaunch/runLaunch are created once
  // (stable identity) but always read the current value of these on every
  // call via depsRef.current, never a value frozen from whichever render
  // first created the callback. Updated on every render, unconditionally,
  // so artwork (which fills in asynchronously after mount) and the
  // injected functions are never stale.
  const depsRef = useRef({})
  depsRef.current = {
    addRecentlyPlayed, activeProfileId, startSession, endSession, recordLaunch,
    showError, playLaunchSound, artwork, onLaunchStart, onReturn,
  }

  // Guards a single in-flight launch. A ref, not just the `launching`
  // state, so a duplicate call arriving in the same tick -- e.g. a held
  // controller button firing more than one input event before the next
  // render -- is still caught even before React has re-rendered with the
  // updated `launching` state.
  const launchingRef = useRef(false)

  const dismissControllerPrompt = useCallback(() => {
    setNeedsControllerPrompt(null)
  }, [])

  // Defensive reset, not part of the launch flow itself -- Wheel calls this
  // right before (re-)opening GameDetail (via click, gamepad confirm, Enter,
  // or switching games from within GameDetail's own picker) so a stale
  // "launching" flag from an earlier attempt can't leave the Launch button
  // stuck reading "Launching...". Does not touch launchError or
  // needsControllerPrompt -- those clear through their own paths.
  const resetLaunching = useCallback(() => {
    launchingRef.current = false
    setLaunching(false)
  }, [])

  const showLaunchError = useCallback((message, durationMs) => {
    setLaunchError(message)
    setTimeout(() => setLaunchError(null), durationMs || 5000)
  }, [])

  const runLaunch = useCallback(async (game) => {
    if (launchingRef.current || !game) return
    launchingRef.current = true
    setLaunching(true)

    const deps = depsRef.current

    if (game.gamePath && window.nuarcade?.checkPath) {
      try {
        const result = await window.nuarcade.checkPath(game.gamePath)
        if (!result?.exists) {
          showLaunchError("Game file not found. Drive may be offline or file moved: " + game.gamePath, 6000)
          launchingRef.current = false
          setLaunching(false)
          return
        }
      } catch (e) { /* proceed -- checkPath unavailable */ }
    }

    deps.playLaunchSound?.()

    const gameId = game.id || game.profile
    const sessionStart = deps.startSession?.(gameId)
    deps.recordLaunch?.(gameId)
    // Bound to whoever was active when THIS launch started, not whichever
    // profile happens to be active by the time the launch resolves --
    // captured once, here, not re-read from deps at write time below.
    const launchedProfileId = deps.activeProfileId ?? null

    // Self-removing listeners, created fresh per launch call so each one
    // closes over exactly this call's gameId/sessionStart -- not shared
    // module-level state, so nothing here can go stale across launches.
    const handleFocusReturn = () => handleReturn()
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleReturn()
    }
    function handleReturn() {
      window.removeEventListener("focus", handleFocusReturn)
      document.removeEventListener("visibilitychange", handleVisibility)
      deps.endSession?.(gameId, sessionStart)
      deps.onReturn?.()
    }
    window.addEventListener("focus", handleFocusReturn)
    document.addEventListener("visibilitychange", handleVisibility)

    deps.onLaunchStart?.()

    if (window.nuarcade?.updateMarquee) {
      const art = deps.artwork?.[gameId]
      window.nuarcade.updateMarquee({
        title: game.title,
        system: game.system || game.genre,
        hero: art?.hero || null,
        logo: art?.logo || null,
        capsule: art?.capsule || null,
        nowPlaying: true,
        genre: game.genre,
        emulator: game.emulator,
      }).catch(() => {})
    }
    window.nuarcade?.gameLaunched?.({
      title: game.title, system: game.system,
      genre: game.genre, emulator: game.emulator,
      id: gameId,
    }).catch?.(() => {})
    const launchArt = deps.artwork?.[gameId]
    window.nuarcade?.pixelcadePush?.({
      title: game.title, system: game.system,
      genre: game.genre, emulator: game.emulator,
      hero: launchArt?.hero || null, capsule: launchArt?.capsule || null,
      nowPlaying: true,
    }).catch?.(() => {})
    try {
      const gp = navigator.getGamepads()[0]
      if (gp && gp.vibrationActuator) {
        gp.vibrationActuator.playEffect("dual-rumble", {
          startDelay: 0, duration: 300,
          weakMagnitude: 0.5, strongMagnitude: 1.0,
        })
      }
    } catch (e) {}

    const failCleanup = () => {
      window.removeEventListener("focus", handleFocusReturn)
      document.removeEventListener("visibilitychange", handleVisibility)
      launchingRef.current = false
      setLaunching(false)
    }

    if (window.nuarcade) {
      const emu = game.emulator || "teknoparrot"
      const gamePath = game.path || game.profilePath || game.profile || game.romPath
      try {
        let launchResult = null
        if (emu === "rpcs3")            launchResult = await window.nuarcade.launchPs3Game(gamePath)
        else if (emu === "xenia")       launchResult = await window.nuarcade.launchXbox360Game(gamePath)
        else if (emu === "dolphin")     launchResult = await window.nuarcade.launchGCWiiGame(gamePath)
        else if (emu === "pcsx2")       launchResult = await window.nuarcade.launchPs2Game(gamePath)
        else if (emu === "ryujinx")     launchResult = await window.nuarcade.launchSwitchGame(gamePath)
        else if (emu === "mame")        launchResult = await window.nuarcade.launchMameGame(gamePath)
        else if (emu === "retroarch")   launchResult = await window.nuarcade.launchRetroArchGame(gamePath, game.core)
        else if (emu === "project64")   launchResult = await window.nuarcade.launchN64Game(gamePath)
        else if (emu === "duckstation") launchResult = await window.nuarcade.launchPs1Game(gamePath)
        else if (emu === "flycast")     launchResult = await window.nuarcade.launchFlycastGame(gamePath)
        else if (emu === "xemu")        launchResult = await window.nuarcade.launchXemuGame(gamePath)
        else if (emu === "cxbx")        launchResult = await window.nuarcade.launchCxbxGame(gamePath)
        else if (emu === "model2")      launchResult = await window.nuarcade.launchModel2Game(gamePath)
        else if (emu === "model3")      launchResult = await window.nuarcade.launchModel3Game(gamePath)
        else if (emu === "ppsspp")      launchResult = await window.nuarcade.launchPspGame(gamePath)
        else if (emu === "cemu")        launchResult = await window.nuarcade.launchWiiUGame(gamePath)
        else if (emu === "vpx" || game.isPinball) launchResult = await window.nuarcade.launchVpxTable(gamePath)
        else if (emu === "steam")  launchResult = await window.nuarcade.launchSteamGame(game.steamAppId || gamePath)
        else if (emu === "pc")     launchResult = await window.nuarcade.launchPcGame(gamePath)
        else launchResult = await window.nuarcade.launchGame(game.profilePath || game.profile)

        // Several backend launch handlers resolve with a failure object
        // rather than rejecting -- spawn errors surface asynchronously, not
        // as a synchronous throw, so a resolved promise here doesn't
        // guarantee the emulator actually started. Checking the result is
        // what actually catches a missing/misconfigured emulator path
        // instead of silently doing nothing.
        if (launchResult && launchResult.success === false) {
          deps.showError?.("Failed to launch " + game.title + ": " + (launchResult.error || "unknown error"))
          failCleanup()
          return
        }
        // Recently Played is written here, once, on confirmed return --
        // not at dispatch time. For the 18 emulator paths that route
        // through the main process's launchWithReturn helper, `success:
        // true` here already means the process ran past its own
        // immediate-crash window (or exited cleanly) -- the strongest
        // process-lifecycle evidence this app currently has, not a
        // threshold invented in the renderer. Three paths (VPX/pinball,
        // Steam, direct PC launch) are fire-and-forget in the main
        // process and resolve with `{ ok: true }` instead of `{ success
        // }` -- requiring strict `=== true` here means those never
        // write, by construction, rather than by an emulator-type list
        // that could drift out of sync. Documented limitation: games
        // launched through those three paths cannot establish a profile
        // today. See selectors/profileReadiness.js for the read side of
        // this contract.
        if (launchResult && launchResult.success === true) {
          deps.addRecentlyPlayed?.({ ...game, [PROFILE_TAG_FIELD]: launchedProfileId })
        }
      } catch (e) {
        deps.showError?.("Failed to launch " + game.title + ": " + (e.message || "unknown error"))
        failCleanup()
        return
      }
    } else {
      // Dev mode (no window.nuarcade) -- no real process to confirm
      // against, so this also counts as an uncertain launch. No write.
      console.log("Dev mode would launch:", game.profile)
    }
    setTimeout(() => {
      launchingRef.current = false
      setLaunching(false)
    }, 3000)
  }, [showLaunchError])

  const confirmLaunch = useCallback((game) => {
    // Clear any pending prompt state before beginning the launch so it
    // cannot survive a failed or interrupted launch -- otherwise a stale
    // needsControllerPrompt could linger and be shown again incorrectly.
    setNeedsControllerPrompt(null)
    runLaunch(game)
  }, [runLaunch])

  const launch = useCallback((game) => {
    if (launchingRef.current || !game) return
    if (game.status === "not-configured") {
      showLaunchError("Open TeknoParrot and configure this game -- find it in the TP game list and set the exe path.")
      return
    }
    if (game.status === "path-missing") {
      showLaunchError("Game exe not found. Check if the file has moved: " + (game.gamePath || "path unknown"))
      return
    }
    const hint = getControllerHint(game)
    if (hint) {
      setNeedsControllerPrompt(game)
      return
    }
    runLaunch(game)
  }, [runLaunch, showLaunchError])

  return {
    launch,
    confirmLaunch,
    dismissControllerPrompt,
    resetLaunching,
    launching,
    launchError,
    needsControllerPrompt,
  }
}
