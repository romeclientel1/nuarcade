import { useState, useRef, useEffect, useCallback } from "react"
import { getControllerHint } from "../data/controllerHints.js"
import { createSession, hasNonterminalSession, findSession } from "../launchSession/sessionStore.js"
import { reconcileLaunchSession } from "../launchSession/reconciliation.js"
import { useI18n } from "../i18n/I18nContext.js"

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
// Launch-lifecycle integration: every launch is backed by a persisted,
// renderer-owned launch session (launchSession/sessionStore.js) created
// before dispatch. Recently Played / LIVING are never written from the
// dispatch response ({success:true}/{ok:true} confirms the command was
// accepted, nothing more) -- only reconcileLaunchSession, fed authoritative
// evidence from the main-process launch registry (onLaunchLifecycleTerminal
// push, or a getLaunchLifecycleStatus query as a safety net), is allowed to
// write them. originDestination/originContext are optional inputs for a
// future Home/Wheel wiring phase -- until a caller supplies them, every
// session captures a "library" origin with no specific focus target.
//
// The RetroArch launcher-picker shortcut (isLauncher / 'retroarch-launcher')
// is intentionally NOT handled here -- it isn't a game launch, it's a
// shortcut into a different picker UI, and stays in Wheel.

// Mirrors the exact emulator/game conditions the dispatch chain below uses
// to route to the 3 fire-and-forget main-process launchers (VPX, Steam,
// PC) -- every other branch (including the teknoparrot default) is one of
// the 17 tracked launchWithReturn-backed paths reachable from here.
export function isTrackedEmulator(emu, game) {
  if (emu === "vpx" || (game && game.isPinball)) return false
  if (emu === "steam") return false
  if (emu === "pc") return false
  return true
}

// Maps a normalized main-process launch-registry status (11-key shape,
// from either onLaunchLifecycleTerminal or getLaunchLifecycleStatus) onto
// the lifecycleResult shape reconcileLaunchSession/launchEvidence expect.
// Pure field renaming -- classification itself stays entirely inside the
// existing launchEvidence.js, reached through reconciliation.js.
export function buildLifecycleResultFromStatus(status) {
  return {
    processStarted: status.processStarted,
    trackedToExit: status.trackedToExit,
    exitCode: status.exitCode,
    startedAt: status.startedAt,
    exitedAt: status.exitedAt,
    error: status.error || undefined,
  }
}

// A queried/pushed status whose trackedToExit no longer matches what this
// session was dispatched with means the main process doesn't recognize
// this session as this hook expects -- most plausibly a main-process
// restart wiped the in-memory launch registry while the session was still
// in flight. Treated as interrupted rather than fabricating lifecycle
// evidence the registry never actually reported.
export function shouldTreatAsInterrupted(status, expectedTrackedToExit) {
  if (!status) return true
  return status.trackedToExit !== expectedTrackedToExit
}

// The one path every piece of authoritative tracked evidence -- terminal
// push or status query -- funnels through. Safe to call more than once for
// the same session: reconcileLaunchSession's own idempotency (terminalResult
// stored on the session record) makes a second call a no-op that returns
// the already-stored result, never a second write.
export function reconcileFromLifecycleStatus({ session, status, expectedTrackedToExit, currentActiveProfileId, deps }) {
  if (shouldTreatAsInterrupted(status, expectedTrackedToExit)) {
    return reconcileLaunchSession({ session, lifecycleResult: null, currentActiveProfileId, deps, forceInterrupted: true })
  }
  return reconcileLaunchSession({
    session, lifecycleResult: buildLifecycleResultFromStatus(status), currentActiveProfileId, deps,
  })
}

// Fire-and-forget launchers (VPX, Steam, direct PC) have no exit to ever
// wait for -- reconciled immediately as soon as the dispatch itself is
// confirmed accepted. trackedToExit: false takes the existing, unmodified
// launchEvidence.js path straight to 'uncertain', ineligible for Recently
// Played / LIVING by construction, regardless of how the dispatch response
// looked.
export function reconcileImmediateUntracked({ session, currentActiveProfileId, deps }) {
  return reconcileLaunchSession({
    session,
    lifecycleResult: { processStarted: true, trackedToExit: false },
    currentActiveProfileId,
    deps,
  })
}

// A synchronous/pre-dispatch failure (the IPC call itself threw, or
// resolved confirming the command was never accepted) -- processStarted:
// false takes the existing launchEvidence.js path straight to
// 'failed-before-start', distinct from a genuine tracked abnormal exit.
export function reconcilePreDispatchFailure({ session, trackedToExit, error, currentActiveProfileId, deps }) {
  return reconcileLaunchSession({
    session,
    lifecycleResult: { processStarted: false, trackedToExit, error },
    currentActiveProfileId,
    deps,
  })
}

// Persists the nonterminal launch session before any dispatch happens.
// Refuses (rather than silently replacing) when one is already active --
// sessionStore.createSession's own documented launch guard; resolving a
// genuinely stale nonterminal session left over from a crash/reload is
// startup recovery's job (App.jsx), not this hook's.
//
// originContext.focusedGameId always mirrors gameId -- the game actually
// being launched -- regardless of whatever the caller passed. This is a
// deliberate, minimal adaptation: a caller derives its own origin metadata
// (section/category, a secondary index, etc.) from component state that
// can briefly lag behind a just-clicked game (e.g. a click handler that
// updates focus state and calls launch() in the same tick, before React
// re-renders with the new state). gameId itself never has that problem --
// it's the exact game runLaunch/beginLaunchSession were called with -- so
// letting the caller's own value win here would risk silently capturing
// the PREVIOUS focus target instead of the one actually launched. Any
// other fields the caller supplies (sectionId, selectedIndex, etc.) pass
// through unchanged.
export function beginLaunchSession({ profileId, gameId, originDestination, originContext }) {
  if (hasNonterminalSession()) {
    return { ok: false, reason: "already-active" }
  }
  const session = createSession({
    profileId,
    gameId,
    originDestination,
    originContext: { ...(originContext || {}), focusedGameId: gameId },
  })
  return { ok: true, session }
}

// The onLaunchLifecycleTerminal push callback's actual logic, extracted so
// it's testable with a plain Map and plain getter functions -- no
// useEffect/window/React needed to exercise it. `activeLaunches` is this
// hook instance's own sessionId -> { game, expectedTrackedToExit } map
// (never a module-level/shared one): a push for a sessionId not present
// here is a session this hook instance doesn't own and is ignored outright,
// including a redelivered push for a session already handled once (the
// entry is deleted the moment it's handled, so a duplicate finds nothing
// and never re-attempts reconciliation).
export function handleTerminalPush(status, { activeLaunches, getActiveProfileId, getAddRecentlyPlayed }) {
  if (!status || !status.sessionId) return { handled: false }
  const entry = activeLaunches.get(status.sessionId)
  if (!entry) return { handled: false }
  const session = findSession(status.sessionId)
  if (!session) return { handled: false }
  const result = reconcileFromLifecycleStatus({
    session,
    status,
    expectedTrackedToExit: entry.expectedTrackedToExit,
    currentActiveProfileId: getActiveProfileId(),
    deps: { addRecentlyPlayed: getAddRecentlyPlayed(), game: entry.game },
  })
  activeLaunches.delete(status.sessionId)
  return { handled: true, result }
}

// The hook's entire useEffect body, extracted to a plain function so the
// subscription/cleanup contract is testable without React or a DOM: no
// jsdom, no Testing Library, just nuarcade/activeLaunchesRef/depsRef as
// explicit inputs. Registers exactly one onLaunchLifecycleTerminal
// listener, routes every event through handleTerminalPush (the existing,
// separately-tested terminal-handling path), and returns a cleanup that
// invokes the preload bridge's own unsubscribe exactly once. Safe when the
// preload API isn't available at all (dev mode, or an older preload build)
// -- returns a callable no-op cleanup rather than throwing. The cleanup is
// itself idempotent -- React's StrictMode double-invokes effect cleanups
// in development, and a caller could always call it again by mistake; a
// second call must never re-invoke (let alone re-subscribe) anything.
export function subscribeToLaunchLifecycle({ nuarcade, activeLaunchesRef, depsRef }) {
  if (!nuarcade?.onLaunchLifecycleTerminal) return () => {}
  const unsubscribe = nuarcade.onLaunchLifecycleTerminal((status) => {
    handleTerminalPush(status, {
      activeLaunches: activeLaunchesRef.current,
      getActiveProfileId: () => depsRef.current.activeProfileId ?? null,
      getAddRecentlyPlayed: () => depsRef.current.addRecentlyPlayed,
    })
  })
  let cleanedUp = false
  return () => {
    if (cleanedUp) return
    cleanedUp = true
    if (typeof unsubscribe === "function") unsubscribe()
  }
}

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
  originDestination,
  originContext,
} = {}) {
  const { t } = useI18n()
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
    showError, playLaunchSound, artwork, onLaunchStart, onReturn, t,
    originDestination, originContext,
  }

  // Guards a single in-flight launch. A ref, not just the `launching`
  // state, so a duplicate call arriving in the same tick -- e.g. a held
  // controller button firing more than one input event before the next
  // render -- is still caught even before React has re-rendered with the
  // updated `launching` state.
  const launchingRef = useRef(false)

  // Launch-lifecycle sessions this hook instance itself dispatched --
  // sessionId -> { game, expectedTrackedToExit }. The terminal-push
  // subscription below only ever acts on a sessionId present here, so a
  // delayed/duplicate event for a session this hook doesn't recognize (or
  // already reconciled and cleared) is inert rather than able to touch
  // whatever launch is in flight now.
  const activeLaunchesRef = useRef(new Map())

  // Subscribed exactly once for this hook instance's whole lifetime, not
  // per-launch -- a single long-lived listener that reconciles whichever
  // of this hook's own sessions the main process reports terminal, however
  // long that takes (the dispatch call for a tracked launcher already
  // blocks until then; this is what makes that resolution correct, and
  // covers untracked spawn failures too).
  useEffect(() => {
    return subscribeToLaunchLifecycle({ nuarcade: window.nuarcade, activeLaunchesRef, depsRef })
  }, [])

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

    // Launch-lifecycle session (renderer-owned, persisted) -- distinct
    // from the playtime-stats sessionStart/endSession above. Captures the
    // launch-time profile and origin now; reconciliation always reads
    // session.profileId later, never whichever profile is active then.
    const begun = beginLaunchSession({
      profileId: launchedProfileId,
      gameId,
      originDestination: deps.originDestination || "library",
      originContext: deps.originContext || undefined,
    })
    if (!begun.ok) {
      deps.showError?.("A launch is already in progress.")
      failCleanup()
      return
    }
    const session = begun.session
    const reconcileDeps = { addRecentlyPlayed: deps.addRecentlyPlayed, game }

    if (window.nuarcade) {
      const emu = game.emulator || "teknoparrot"
      const gamePath = game.path || game.profilePath || game.profile || game.romPath
      const trackedToExitForThisLaunch = isTrackedEmulator(emu, game)
      activeLaunchesRef.current.set(session.id, { game, expectedTrackedToExit: trackedToExitForThisLaunch })

      try {
        let launchResult = null
        if (emu === "rpcs3")            launchResult = await window.nuarcade.launchPs3Game(gamePath, session.id)
        else if (emu === "xenia")       launchResult = await window.nuarcade.launchXbox360Game(gamePath, session.id)
        else if (emu === "dolphin")     launchResult = await window.nuarcade.launchGCWiiGame(gamePath, session.id)
        else if (emu === "pcsx2")       launchResult = await window.nuarcade.launchPs2Game(gamePath, session.id)
        else if (emu === "ryujinx")     launchResult = await window.nuarcade.launchSwitchGame(gamePath, session.id)
        else if (emu === "mame")        launchResult = await window.nuarcade.launchMameGame(gamePath, session.id)
        else if (emu === "retroarch")   launchResult = await window.nuarcade.launchRetroArchGame(gamePath, game.core, session.id)
        else if (emu === "project64")   launchResult = await window.nuarcade.launchN64Game(gamePath, session.id)
        else if (emu === "duckstation") launchResult = await window.nuarcade.launchPs1Game(gamePath, session.id)
        else if (emu === "flycast")     launchResult = await window.nuarcade.launchFlycastGame(gamePath, session.id)
        else if (emu === "xemu")        launchResult = await window.nuarcade.launchXemuGame(gamePath, session.id)
        else if (emu === "cxbx")        launchResult = await window.nuarcade.launchCxbxGame(gamePath, session.id)
        else if (emu === "model2")      launchResult = await window.nuarcade.launchModel2Game(gamePath, session.id)
        else if (emu === "model3")      launchResult = await window.nuarcade.launchModel3Game(gamePath, session.id)
        else if (emu === "ppsspp")      launchResult = await window.nuarcade.launchPspGame(gamePath, session.id)
        else if (emu === "cemu")        launchResult = await window.nuarcade.launchWiiUGame(gamePath, session.id)
        else if (emu === "vpx" || game.isPinball) launchResult = await window.nuarcade.launchVpxTable(gamePath, session.id)
        else if (emu === "steam")  launchResult = await window.nuarcade.launchSteamGame(game.steamAppId || gamePath, session.id)
        else if (emu === "pc")     launchResult = await window.nuarcade.launchPcGame(gamePath, session.id)
        else launchResult = await window.nuarcade.launchGame(game.profilePath || game.profile, session.id)

        // The dispatch response only ever confirms the command was
        // accepted (or, for the 17 tracked paths, that launchWithReturn's
        // own promise -- which doesn't resolve until the process exits --
        // has now settled). It is never treated as return evidence on its
        // own: Recently Played / LIVING are only ever written by
        // reconcileLaunchSession, fed the main-process launch registry's
        // authoritative facts below.
        if (launchResult && (launchResult.success === false || launchResult.ok === false)) {
          activeLaunchesRef.current.delete(session.id)
          reconcilePreDispatchFailure({
            session, trackedToExit: trackedToExitForThisLaunch, error: launchResult.error,
            currentActiveProfileId: depsRef.current.activeProfileId ?? null, deps: reconcileDeps,
          })
          deps.showError?.(deps.t("errors.launchFailed", { game: game.title }) + ": " + (launchResult.error || "unknown error"))
          failCleanup()
          return
        }

        if (!trackedToExitForThisLaunch) {
          // Fire-and-forget (VPX/Steam/PC): no exit will ever arrive --
          // reconcile immediately, always ineligible for Recently Played/
          // LIVING by construction (trackedToExit: false).
          activeLaunchesRef.current.delete(session.id)
          reconcileImmediateUntracked({
            session, currentActiveProfileId: depsRef.current.activeProfileId ?? null, deps: reconcileDeps,
          })
        } else if (window.nuarcade.getLaunchLifecycleStatus) {
          // Tracked: the onLaunchLifecycleTerminal subscription above
          // should already have reconciled this by the time dispatch
          // resolved (the main process's own child-exit listener fires
          // before launchWithReturn's promise settles). This query is a
          // safety net only -- reconcileLaunchSession's idempotency makes
          // it a no-op if the push already landed, and it still reconciles
          // correctly (rather than leaving the session stuck) if the push
          // was missed or the registry no longer recognizes this session.
          try {
            const status = await window.nuarcade.getLaunchLifecycleStatus(session.id)
            if (status && (status.exitedAt != null || status.trackedToExit !== trackedToExitForThisLaunch)) {
              reconcileFromLifecycleStatus({
                session, status, expectedTrackedToExit: trackedToExitForThisLaunch,
                currentActiveProfileId: depsRef.current.activeProfileId ?? null, deps: reconcileDeps,
              })
            }
          } catch (e) { /* best-effort safety net only */ }
          activeLaunchesRef.current.delete(session.id)
        }
      } catch (e) {
        activeLaunchesRef.current.delete(session.id)
        reconcilePreDispatchFailure({
          session, trackedToExit: trackedToExitForThisLaunch, error: e.message,
          currentActiveProfileId: depsRef.current.activeProfileId ?? null, deps: reconcileDeps,
        })
        deps.showError?.(deps.t("errors.launchFailed", { game: game.title }) + ": " + (e.message || "unknown error"))
        failCleanup()
        return
      }
    } else {
      // Dev mode (no window.nuarcade) -- no real process to confirm
      // against; reconcile as interrupted so the session doesn't linger
      // nonterminal forever, exactly as a genuine startup-recovery path
      // would for an unreachable lifecycle result.
      reconcileLaunchSession({
        session, lifecycleResult: null, forceInterrupted: true,
        currentActiveProfileId: depsRef.current.activeProfileId ?? null, deps: {},
      })
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
