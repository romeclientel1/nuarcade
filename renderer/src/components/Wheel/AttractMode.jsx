import { useState, useEffect, useRef, useCallback } from "react"
import styles from "./AttractMode.module.css"
import { useGamepad } from "../../hooks/useGamepad"
import { useAttractAmbience } from "./useAttractAmbience.js"
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
  const [videoErrors, setVideoErrors] = useState({})
  const [shuffled, setShuffled] = useState([])
  const overlayRef = useRef(null)
  const videoRef = useRef(null)
  const timersRef = useRef([])
  const orderRef = useRef([])
  const indexRef = useRef(0)
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
    setVideoErrors({})
  }, [games, artwork, attractConfig.preferArt])

  const advance = useCallback(() => {
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
    if (!videoRef.current || !isActive) return
    videoRef.current.currentTime = 0
    videoRef.current.play().catch(() => {})
  }, [currentIdx, isActive])

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
  const id = game.id || game.profile?.replace(".xml", "").replace(".vpx", "")
  const art = artwork?.[game.id || game.profile] || {}
  const legacyVideo = window.nuarcade?.platform === "win32" && id
    ? `file:///F:/Media/Videos/${id}.mp4`
    : null
  const videoUrl = game.videoPath || legacyVideo
  const hasVideo = !!videoUrl && !videoErrors[key]
  const heroUrl = art.hero || game.heroPath || null
  const capsuleUrl = art.capsule || game.boxArtPath || null
  const mediaKind = hasVideo ? "video" : heroUrl ? "hero" : capsuleUrl ? "capsule" : "none"

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
    >
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.reflection} aria-hidden="true" />

      <header className={styles.identity} aria-hidden="true">
        <img src={vesparaSymbol} alt="" />
        <div>
          <span className={styles.wordmark}>VESPARA</span>
          <span className={styles.context}>FROM THE LIBRARY</span>
        </div>
      </header>

      <div className={styles.gatewayStage} aria-hidden="true">
        <div className={styles.gatewayCrown} />
        <div className={styles.gatewayOuter}>
          <div className={styles.gatewayInner}>
            <div className={styles.thresholdGlow} />
            <div className={styles.mediaViewport}>
              {hasVideo && (
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
                  onError={() => setVideoErrors((errors) => ({ ...errors, [key]: true }))}
                />
              )}
              {!hasVideo && heroUrl && (
                <img src={heroUrl} alt="" className={styles.portalMedia} />
              )}
              {!hasVideo && !heroUrl && capsuleUrl && (
                <div className={styles.archivalImage}>
                  <img src={capsuleUrl} alt="" />
                </div>
              )}
              {!hasVideo && !heroUrl && !capsuleUrl && (
                <div className={styles.noMediaGeometry}>
                  <img src={vesparaSymbol} alt="" />
                  <span>ARCHIVE RECORD</span>
                </div>
              )}
              <div className={styles.mediaShade} />
            </div>

            <div className={styles.destinationLabel}>
              <span className={styles.system}>{game.system || game.genre || "Library collection"}</span>
              <h1>{game.title}</h1>
            </div>
          </div>
        </div>
        <div className={styles.gatewayFoot} />
      </div>

      <div className={styles.invitation} aria-hidden="true">
        <span className={styles.invitationRule} />
        <span>ENTER THE LIBRARY</span>
        <span className={styles.invitationRule} />
      </div>
    </section>
  )
}
