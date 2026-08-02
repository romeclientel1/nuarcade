import { useState, useEffect, useRef, useCallback } from "react"
import styles from "./AttractMode.module.css"
import { useGamepad } from "../../hooks/useGamepad"
import { useAttractAmbience } from "./useAttractAmbience.js"
import { resolveAttractMedia } from "./attractMediaResolution.js"
import { ATTRACT_SCENES } from "./attractScenes.js"
import { nextAttractSceneIndex } from "./attractSceneCycle.js"
import { getAttractReason } from "./attractReason.js"
import vesparaSymbol from "../../assets/brand/vespara-symbol-simplified.svg"

const RESOLVE_MS = 520
const HOLD_START_MS = 1180
const RECEDE_MS = 900
const NEUTRAL_MS = 320
const MIN_CYCLE_MS = 6000

const gameKey = (game) => game?.id || game?.profile || game?.title || "unknown"

function shuffle(items) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

// A completed pass receives a fresh order. When possible, the item that just
// receded cannot immediately become the first destination in the next pass.
function reshuffle(items, avoidFirstKey) {
  const next = shuffle(items)
  if (next.length > 1 && gameKey(next[0]) === avoidFirstKey) {
    const swapIndex = next.findIndex((item, index) => index > 0 && gameKey(item) !== avoidFirstKey)
    if (swapIndex > 0) [next[0], next[swapIndex]] = [next[swapIndex], next[0]]
  }
  return next
}

export default function AttractMode({ games, isActive, onWake, artwork, attractConfig = {} }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState("neutral")
  const [mediaErrors, setMediaErrors] = useState({})
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
  )
  const [sceneIndex, setSceneIndex] = useState(0)
  const [shuffled, setShuffled] = useState([])
  const overlayRef = useRef(null)
  const videoRef = useRef(null)
  const timersRef = useRef([])
  const orderRef = useRef([])
  const indexRef = useRef(0)
  const sceneIndexRef = useRef(0)
  const activeSessionRef = useRef(false)
  const hasActivatedRef = useRef(false)
  const lastShownKeyRef = useRef(null)

  const cycleMs = Math.max(
    MIN_CYCLE_MS,
    Math.max(2, attractConfig.cycleSpeed || 6) * 1000,
  )

  useAttractAmbience({
    active: isActive && shuffled.length > 0,
    enabled: attractConfig.musicEnabled !== false,
    volume: attractConfig.ambientVolume ?? 35,
  })

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (!query) return undefined
    const update = () => setReducedMotion(query.matches)
    update()
    if (query.addEventListener) query.addEventListener("change", update)
    else query.addListener?.(update)
    return () => {
      if (query.removeEventListener) query.removeEventListener("change", update)
      else query.removeListener?.(update)
    }
  }, [])

  const clearPhaseTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  // Prefer artwork only when it can sustain a real pass. This preserves the
  // existing six-item threshold while keeping one-game and small libraries
  // truthful instead of fabricating destinations.
  useEffect(() => {
    if (!games.length) {
      orderRef.current = []
      setShuffled([])
      setCurrentIdx(0)
      indexRef.current = 0
      sceneIndexRef.current = 0
      setSceneIndex(0)
      return
    }
    const withArt = games.filter((game) => {
      const art = artwork?.[game.id || game.profile]
      return art?.hero || art?.capsule
    })
    const pool = attractConfig.preferArt !== false && withArt.length >= 6 ? withArt : games
    const next = reshuffle(pool, lastShownKeyRef.current)
    orderRef.current = next
    indexRef.current = 0
    setCurrentIdx(0)
    setShuffled(next)
    setMediaErrors({})
    sceneIndexRef.current = 0
    setSceneIndex(0)
  }, [games, artwork, attractConfig.preferArt])

  const advance = useCallback(() => {
    sceneIndexRef.current = nextAttractSceneIndex(sceneIndexRef.current, ATTRACT_SCENES.length)
    setSceneIndex(sceneIndexRef.current)

    const order = orderRef.current
    if (order.length <= 1) return
    const current = order[indexRef.current]
    lastShownKeyRef.current = gameKey(current)

    if (indexRef.current + 1 < order.length) {
      indexRef.current += 1
      setCurrentIdx(indexRef.current)
      return
    }

    const next = reshuffle(order, lastShownKeyRef.current)
    orderRef.current = next
    indexRef.current = 0
    setShuffled(next)
    setCurrentIdx(0)
  }, [])

  // One cancellable timeline per discovery: gateway, resolve, hold, recede,
  // neutral interval, then advance. The configured cycle remains the pacing
  // contract, with a six-second safety floor so its phases stay meaningful.
  useEffect(() => {
    clearPhaseTimers()
    if (!isActive || shuffled.length === 0) {
      activeSessionRef.current = false
      setPhase("neutral")
      return
    }

    const entering = !activeSessionRef.current
    activeSessionRef.current = true
    if (entering && hasActivatedRef.current) advance()
    hasActivatedRef.current = true

    let cancelled = false
    const later = (fn, delay) => {
      const id = setTimeout(() => { if (!cancelled) fn() }, delay)
      timersRef.current.push(id)
    }
    const runCycle = () => {
      setPhase("gateway")
      later(() => setPhase("resolving"), RESOLVE_MS)
      later(() => setPhase("hold"), HOLD_START_MS)
      later(() => setPhase("receding"), cycleMs - RECEDE_MS)
      later(() => setPhase("neutral"), cycleMs - NEUTRAL_MS)
      later(() => {
        advance()
        runCycle()
      }, cycleMs)
    }
    runCycle()

    return () => {
      cancelled = true
      clearPhaseTimers()
    }
  }, [isActive, shuffled.length, cycleMs, advance, clearPhaseTimers])

  useEffect(() => {
    if (!isActive || shuffled.length === 0) return
    const frame = requestAnimationFrame(() => overlayRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [isActive, shuffled.length])

  useEffect(() => {
    if (!videoRef.current || !isActive || reducedMotion) return
    videoRef.current.currentTime = 0
    videoRef.current.play().catch(() => {})
  }, [currentIdx, isActive, reducedMotion])

  const wakeFromKeyboard = useCallback((event) => {
    if (!isActive) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation?.()
    onWake?.()
  }, [isActive, onWake])

  // Capture phase is intentional: the wake event is consumed before Wheel's
  // normal Library shortcuts can navigate, open details, or launch.
  useEffect(() => {
    if (!isActive) return
    window.addEventListener("keydown", wakeFromKeyboard, true)
    return () => window.removeEventListener("keydown", wakeFromKeyboard, true)
  }, [isActive, wakeFromKeyboard])

  const wakeFromPointer = useCallback((event) => {
    if (!isActive) return
    event?.preventDefault?.()
    event?.stopPropagation?.()
    onWake?.()
  }, [isActive, onWake])

  const wakeFromController = useCallback(() => onWake?.(), [onWake])
  useGamepad({
    confirm: wakeFromController,
    back: wakeFromController,
    left: wakeFromController,
    right: wakeFromController,
    up: wakeFromController,
    down: wakeFromController,
    settings: wakeFromController,
    filterLeft: wakeFromController,
    filterRight: wakeFromController,
    random: wakeFromController,
    launch: wakeFromController,
    favorite: wakeFromController,
    detail: wakeFromController,
    enabled: isActive,
  })

  if (!isActive || shuffled.length === 0) return null

  const game = shuffled[currentIdx] || shuffled[0]
  const key = gameKey(game)
  const art = artwork?.[game.id || game.profile] || {}
  const errors = mediaErrors[key] || {}
  const reason = getAttractReason(game)
  const { mediaKind, videoUrl, heroUrl, capsuleUrl } = resolveAttractMedia({
    game,
    artwork: art,
    errors,
    reducedMotion,
  })
  const markMediaError = (kind) => {
    setMediaErrors((current) => ({
      ...current,
      [key]: { ...current[key], [kind]: true },
    }))
  }

  return (
    <section
      ref={overlayRef}
      className={styles.overlay}
      data-phase={phase}
      data-media-kind={mediaKind}
      tabIndex={-1}
      role="region"
      aria-label="Vespara Library discovery. Enter the Library to resume browsing."
      onClick={wakeFromPointer}
      onMouseMove={wakeFromPointer}
      onWheel={wakeFromPointer}
    >
      <div className={styles.sceneStack} aria-hidden="true">
        {ATTRACT_SCENES.map((scene, index) => (
          <img
            key={scene.id}
            src={scene.image}
            alt=""
            className={`${styles.scene} ${index === sceneIndex ? styles.sceneActive : ""}`}
          />
        ))}
      </div>

      <div className={styles.portalStage}>
        <div className={styles.portalFrame}>
          <div className={styles.portalEdge} aria-hidden="true" />
          <div className={styles.mediaViewport}>
              {mediaKind === "video" && (
                <video
                  key={videoUrl}
                  ref={videoRef}
                  className={styles.portalMedia}
                  src={videoUrl}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                  onError={() => markMediaError("video")}
                />
              )}
              {mediaKind === "hero" && (
                <img
                  src={heroUrl}
                  alt=""
                  className={styles.portalMedia}
                  onError={() => markMediaError("hero")}
                />
              )}
              {mediaKind === "capsule" && (
                <div className={styles.archivalImage}>
                  <img src={capsuleUrl} alt="" onError={() => markMediaError("capsule")} />
                </div>
              )}
              {mediaKind === "none" && (
                <div className={styles.noMediaGeometry}>
                  <img src={vesparaSymbol} alt="" />
                  <span>ARCHIVE RECORD</span>
                </div>
              )}
              <div className={styles.mediaShade} />
          </div>
        </div>

        <div className={styles.discoveryCopy}>
          <h1>{game.title}</h1>
          <p>{reason}</p>
        </div>
      </div>

      <div className={styles.invitation} aria-hidden="true">
        <span className={styles.invitationRule} />
        <span>ENTER THE LIBRARY</span>
        <span className={styles.invitationRule} />
      </div>
    </section>
  )
}
