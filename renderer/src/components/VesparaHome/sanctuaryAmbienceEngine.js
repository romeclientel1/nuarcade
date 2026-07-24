// Framework-free Sanctuary ambience lifecycle.
//
// This mirrors the proven Traveler Recognition Howler ordering contract:
// onload requests playback, while onplay begins the fade only after HTML5
// playback is genuinely active. The controller is intentionally source-
// agnostic so an approved local ambience asset can be connected without
// changing Home navigation or introducing another audio system.

export function createSanctuaryAmbienceController({
  HowlCtor,
  src,
  fadeInMs,
  fadeOutMs,
  schedule = setTimeout,
}) {
  let howl = null
  let started = false
  let playRequested = false
  let playing = false
  let stopped = false

  function terminateOnError(tag, err) {
    if (stopped) return
    stopped = true
    console.warn(`[SanctuaryAmbience] ${tag}`, err)
    const active = howl
    howl = null
    active?.unload()
  }

  function start(enabled, volumePercent) {
    if (started || stopped || !src || !enabled) return
    const targetVolume = Math.max(0, Math.min(1, (volumePercent ?? 35) / 100))
    if (targetVolume === 0) return
    started = true

    howl = new HowlCtor({
      src: [src],
      volume: 0,
      loop: true,
      html5: true,
      onload: () => {
        if (stopped || playRequested || !howl) return
        playRequested = true
        howl.play()
      },
      onplay: () => {
        if (stopped || playing || !howl) return
        playing = true
        howl.fade(0, targetVolume, fadeInMs)
      },
      onloaderror: (id, err) => terminateOnError('onloaderror -- ambience failed to load', err),
      onplayerror: (id, err) => terminateOnError('onplayerror -- ambience failed to start playback', err),
    })
  }

  function fadeOutAndStop() {
    if (stopped) return
    stopped = true
    if (!howl) return
    const active = howl
    howl = null

    if (!playing) {
      active.unload()
      return
    }

    active.fade(active.volume(), 0, fadeOutMs)
    schedule(() => {
      active.stop()
      active.unload()
    }, fadeOutMs)
  }

  function cleanup() {
    // A route action may have initiated the intentional short fade just
    // before React unmounts Home. In that case the scheduled stop owns the
    // final release; callbacks are already inert because stopped is true.
    if (stopped) return
    stopped = true
    if (!howl) return
    const active = howl
    howl = null
    if (playing) active.stop()
    active.unload()
  }

  return { start, fadeOutAndStop, cleanup }
}
