// gatewayMusicEngine.js -- plain, framework-free core of the Traveler
// Recognition gateway theme (Milestone 1.2; load-timing fix at Milestone
// 1.2 follow-up). No React/DOM import, so it's directly importable and
// testable under native `node --test` against a mocked Howl-like
// constructor, mirrored from the existing uiSoundEngine.js pattern of
// factoring real logic out of a hook into plain functions.
//
// Load-timing contract: start() creates the Howl and requests its load
// immediately, but playback and the fade-in are deferred to Howler's own
// `onload` callback -- the one lifecycle event the installed Howler
// version (2.2.4) already provides for "the audio is actually ready to
// play" (see useMusicPlayer.js's existing onload/onloaderror usage for
// precedent; this is the same mechanism, not a new one). Nothing here
// polls, retries, or opens a second network/audio path.
//
// Exit-before-ready contract: fadeOutAndStop()/cleanup() are terminal --
// once either has run, the `stopped` flag makes the onload callback a
// no-op even if Howler fires it later (e.g. a slow decode that finishes
// after the user already confirmed/Guested/Departed/unmounted). This is
// what guarantees "no late playback after unmount or after an exit path
// has already begun" regardless of how the load/fade race resolves.
//
// start() itself is a no-op after the first call (or after stopped) --
// this is what guarantees "begins once, never restarts on focus/selection
// changes" regardless of how many times a caller invokes it.
// fadeOutAndStop() fades a currently-playing Howl down and schedules its
// stop/unload on its own timer, deliberately not awaited by the caller --
// so confirming a Traveler, entering as Guest, or Departing never waits
// on the fade before navigating away, whether or not the audio had
// actually started playing yet.

export function createGatewayMusicController({ HowlCtor, src, fadeInMs, fadeOutMs }) {
  let howl = null
  let started = false
  let playing = false
  let stopped = false

  function start(enabled, volumePercent) {
    if (started || stopped) return
    if (!enabled) return
    started = true
    const targetVolume = Math.max(0, Math.min(1, (volumePercent ?? 60) / 100))

    howl = new HowlCtor({
      src: [src],
      volume: 0,
      html5: true,
      onload: () => {
        // Exit already happened (unmount, confirm, Guest, Depart) while
        // this was still loading -- never start playback after the
        // fact, no matter how late Howler's event fires. The `playing`
        // check guards against Howler ever firing onload more than once
        // for the same Howl -- playback must still only ever begin once.
        if (stopped || playing) return
        playing = true
        howl.play()
        howl.fade(0, targetVolume, fadeInMs)
      },
    })
  }

  function fadeOutAndStop() {
    if (stopped) return
    stopped = true
    if (!howl) return
    const active = howl
    howl = null

    if (!playing) {
      // Never actually started (still loading, or load hadn't resolved
      // yet) -- nothing audible to fade, just cancel the pending load.
      active.unload()
      return
    }

    const currentVolume = active.volume()
    active.fade(currentVolume, 0, fadeOutMs)
    setTimeout(() => {
      active.stop()
      active.unload()
    }, fadeOutMs)
  }

  function cleanup() {
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
