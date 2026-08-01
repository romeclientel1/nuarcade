// Wheel-local lifecycle for the dedicated Attract ambience. The controller
// owns at most one Howl, resumes that same instance if wake/idle transitions
// cross during a fade, and treats autoplay rejection as a silent decorative
// failure rather than a navigation error.
export function createAttractAmbienceController({
  HowlCtor,
  src,
  fadeInMs,
  fadeOutMs,
  schedule = setTimeout,
  cancelSchedule = clearTimeout,
}) {
  let howl = null
  let requested = false
  let playing = false
  let disposed = false
  let stopTimer = null
  let targetVolume = 0

  const cancelStop = () => {
    if (stopTimer == null) return
    cancelSchedule(stopTimer)
    stopTimer = null
  }

  const release = () => {
    cancelStop()
    const active = howl
    howl = null
    playing = false
    active?.stop?.()
    active?.unload?.()
  }

  const failQuietly = () => {
    requested = false
    release()
  }

  function enter(enabled, volumePercent) {
    if (disposed || !src || !enabled) {
      leave()
      return
    }
    targetVolume = Math.max(0, Math.min(1, (volumePercent ?? 35) / 100))
    if (targetVolume === 0) {
      leave()
      return
    }

    requested = true
    cancelStop()

    if (howl) {
      if (playing) howl.fade(howl.volume(), targetVolume, fadeInMs)
      return
    }

    howl = new HowlCtor({
      src: [src],
      volume: 0,
      loop: true,
      html5: true,
      preload: true,
      onload: () => {
        if (!requested || disposed || !howl) return
        howl.play()
      },
      onplay: () => {
        if (!requested || disposed || !howl || playing) return
        playing = true
        howl.fade(0, targetVolume, fadeInMs)
      },
      onloaderror: failQuietly,
      onplayerror: failQuietly,
    })
  }

  function leave() {
    requested = false
    if (!howl) return
    const active = howl
    if (!playing) {
      release()
      return
    }
    active.fade(active.volume(), 0, fadeOutMs)
    cancelStop()
    stopTimer = schedule(() => {
      stopTimer = null
      if (!requested && active === howl) release()
    }, fadeOutMs)
  }

  function cleanup() {
    if (disposed) return
    disposed = true
    requested = false
    release()
  }

  return { enter, leave, cleanup }
}
