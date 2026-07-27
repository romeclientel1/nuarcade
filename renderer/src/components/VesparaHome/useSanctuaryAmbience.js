import { useCallback, useEffect, useRef } from 'react'
import { Howl } from 'howler'
import { createSanctuaryAmbienceController } from './sanctuaryAmbienceEngine.js'
import sanctuaryAmbienceAsset from './assets/sanctuary-ambience.mp3'

const FADE_IN_MS = 1800
const FADE_OUT_MS = 700

// Approved Sanctuary room tone. This remains deliberately separate from the
// Traveler Recognition gateway theme and is emitted by Vite as a local,
// standalone production asset.
export const SANCTUARY_AMBIENCE_SRC = sanctuaryAmbienceAsset

export function useSanctuaryAmbience(src = SANCTUARY_AMBIENCE_SRC) {
  const controllerRef = useRef(null)

  useEffect(() => {
    const controller = createSanctuaryAmbienceController({
      HowlCtor: Howl,
      src,
      fadeInMs: FADE_IN_MS,
      fadeOutMs: FADE_OUT_MS,
    })
    controllerRef.current = controller

    let cancelled = false
    const begin = (enabled, volume) => {
      if (!cancelled) controller.start(enabled, volume)
    }

    if (window.nuarcade?.getConfig) {
      window.nuarcade.getConfig()
        .then(cfg => begin(cfg?.musicEnabled !== false, cfg?.ambientVolume ?? cfg?.musicVolume ?? 35))
        .catch(() => begin(true, 35))
    } else {
      begin(true, 35)
    }

    return () => {
      cancelled = true
      controller.cleanup()
    }
  }, [src])

  const fadeOutAndStop = useCallback(() => {
    controllerRef.current?.fadeOutAndStop()
  }, [])

  // Temporary pause for an external game launch (see sanctuaryAmbienceEngine's
  // pause()) -- distinct from fadeOutAndStop, which permanently releases the
  // Howl instance for navigation/Depart. No config read is needed here: pausing
  // only ever fades the current instance toward silence, never toward a target
  // volume.
  const pauseForLaunch = useCallback(() => {
    controllerRef.current?.pause()
  }, [])

  // Reverses pauseForLaunch once the external game exits and Home regains
  // focus. Re-reads the current config (mirroring the mount effect above) so
  // a music-enabled/volume change made while the Traveler was away is
  // respected on resume, rather than reusing whatever was true when Home
  // first mounted.
  const resumeFromLaunch = useCallback(() => {
    const controller = controllerRef.current
    if (!controller) return
    const applyResume = (enabled, volume) => controller.resume(enabled, volume)
    if (window.nuarcade?.getConfig) {
      window.nuarcade.getConfig()
        .then(cfg => applyResume(cfg?.musicEnabled !== false, cfg?.ambientVolume ?? cfg?.musicVolume ?? 35))
        .catch(() => applyResume(true, 35))
    } else {
      applyResume(true, 35)
    }
  }, [])

  return { fadeOutAndStop, pauseForLaunch, resumeFromLaunch }
}
