import { useEffect, useRef } from "react"
import { Howl } from "howler"
import attractAmbient from "./assets/vespara-attract-ambient.mp3"
import { createAttractAmbienceController } from "./attractAmbienceEngine.js"

const FADE_IN_MS = 1800
const FADE_OUT_MS = 900

export function useAttractAmbience({ active, enabled, volume }) {
  const controllerRef = useRef(null)

  useEffect(() => {
    const controller = createAttractAmbienceController({
      HowlCtor: Howl,
      src: attractAmbient,
      fadeInMs: FADE_IN_MS,
      fadeOutMs: FADE_OUT_MS,
    })
    controllerRef.current = controller
    return () => {
      controller.cleanup()
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return
    if (active) controller.enter(enabled, volume)
    else controller.leave()
  }, [active, enabled, volume])
}
