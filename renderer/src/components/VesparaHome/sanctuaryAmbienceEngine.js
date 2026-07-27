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
  cancelSchedule = clearTimeout,
}) {
  let howl = null
  let started = false
  let playRequested = false
  let playing = false
  let stopped = false
  // Distinct from `stopped`: pause()/resume() are for a temporary,
  // reversible external-game launch, never unloading the Howl instance.
  // `stopped` remains the one-way latch used by fadeOutAndStop()/cleanup()
  // for navigation/Depart/unmount, which permanently release the instance.
  let paused = false
  let pauseTimer = null

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
    if (pauseTimer != null) {
      cancelSchedule(pauseTimer)
      pauseTimer = null
    }
    if (!howl) return
    const active = howl
    howl = null
    if (playing) active.stop()
    active.unload()
  }

  // Temporary, reversible pause for an external game launch -- fades the
  // ambience out and pauses playback (after the fade completes) without
  // ever unloading the Howl instance, so resume() can bring the exact same
  // instance back. A no-op if ambience was never started, was already
  // permanently stopped (route/Depart/unmount), or is already paused --
  // this last guard is what prevents a rapid double-launch (or a launch
  // firing while a previous pause is still fading) from scheduling two
  // overlapping pause timers.
  function pause() {
    if (stopped || paused || !howl || !playing) return
    paused = true
    const active = howl
    active.fade(active.volume(), 0, fadeOutMs)
    pauseTimer = schedule(() => {
      pauseTimer = null
      // Resumed before the fade finished, or permanently stopped in the
      // meantime -- either way, this stale timer must not act.
      if (stopped || !paused) return
      active.pause()
    }, fadeOutMs)
  }

  // Reverses pause() once the external game exits and Home regains focus.
  // A no-op if ambience was never started, was permanently stopped, or is
  // not currently paused -- the last guard is what prevents a duplicate
  // ambience instance (or an overlapping fade-in) if onReturn ever fires
  // more than once for the same launch (e.g. a stray focus + visibilitychange
  // pair both resolving to the same return).
  function resume(enabled, volumePercent) {
    if (stopped || !paused || !howl || !enabled) return
    const targetVolume = Math.max(0, Math.min(1, (volumePercent ?? 35) / 100))
    paused = false
    const active = howl
    if (pauseTimer != null) {
      // The fade-out hadn't finished (and active.pause() never actually
      // ran) -- the instance is still technically playing at whatever
      // volume the fade reached, so just fade back up from there.
      cancelSchedule(pauseTimer)
      pauseTimer = null
    } else {
      // The fade-out already completed and active.pause() already ran --
      // genuinely resume playback before fading back in.
      active.play()
    }
    if (targetVolume > 0) active.fade(active.volume(), targetVolume, fadeInMs)
  }

  return { start, fadeOutAndStop, pause, resume, cleanup }
}
