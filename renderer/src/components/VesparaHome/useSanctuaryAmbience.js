import { useCallback, useEffect, useRef } from 'react'
import { Howl } from 'howler'
import { createSanctuaryAmbienceController } from './sanctuaryAmbienceEngine.js'

const FADE_IN_MS = 1800
const FADE_OUT_MS = 700

// Asset handoff point. There is no approved Sanctuary room-tone asset in
// the repository yet, and the user-produced gateway theme must not be
// repurposed. Keeping this null makes production safely silent while the
// full lifecycle remains wired and testable. Replace only with a bundled
// local import after the ambience source is approved.
export const SANCTUARY_AMBIENCE_SRC = null

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

  return { fadeOutAndStop }
}
