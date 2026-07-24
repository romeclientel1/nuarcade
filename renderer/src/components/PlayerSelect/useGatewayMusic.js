// useGatewayMusic -- thin React wrapper around gatewayMusicEngine's
// framework-free controller (Milestone 1.2). Starts the gateway theme
// once when PlayerSelect mounts, reading the same musicEnabled/
// musicVolume config keys Wheel's useMusicPlayer already reads via
// window.nuarcade.getConfig() -- this is not a second global audio
// system, it's the existing mute/volume state, read directly rather
// than threaded down through new App.jsx props.
import { useEffect, useRef } from 'react'
import { Howl } from 'howler'
import { createGatewayMusicController } from './gatewayMusicEngine.js'

const FADE_IN_MS = 1200
const FADE_OUT_MS = 700

export function useGatewayMusic(src) {
  const controllerRef = useRef(null)

  useEffect(() => {
    const controller = createGatewayMusicController({
      HowlCtor: Howl, src, fadeInMs: FADE_IN_MS, fadeOutMs: FADE_OUT_MS,
    })
    controllerRef.current = controller

    let cancelled = false
    const begin = (enabled, volume) => { if (!cancelled) controller.start(enabled, volume) }

    if (window.nuarcade?.getConfig) {
      window.nuarcade.getConfig()
        .then(cfg => begin(cfg?.musicEnabled !== false, cfg?.musicVolume ?? 60))
        .catch(() => begin(true, 60))
    } else {
      begin(true, 60)
    }

    return () => {
      cancelled = true
      controller.cleanup()
    }
  }, [src])

  const fadeOutAndStop = () => { controllerRef.current?.fadeOutAndStop() }

  return { fadeOutAndStop }
}
