// gatewayMusicEngine.js -- plain, framework-free core of the Traveler
// Recognition gateway theme (Milestone 1.2; onplay-timing fix at
// Milestone 1.2.1). No React/DOM import, so it's directly importable and
// testable under native `node --test` against a mocked Howl-like
// constructor, mirrored from the existing uiSoundEngine.js pattern of
// factoring real logic out of a hook into plain functions.
//
// Milestone 1.2.1 fix -- the HTML5 play-lock queue-order defect: with
// html5: true, howl.play() activates Howler's internal Promise-based
// play lock. Milestone 1.2 called fade() immediately after play() from
// inside onload, which queued the fade *before* that lock's matching
// play task, so fade() stayed queued behind the unresolved play lock and
// never actually executed -- the MP3 played, but at the constructor's
// volume: 0, forever. The fix splits the two steps across
// the two lifecycle events Howler actually provides for them: onload
// only requests playback (howl.play()), and the fade-in is deferred to
// onplay -- the event Howler fires once that play lock has genuinely
// resolved and audio is really flowing. Nothing here polls, retries, or
// opens a second network/audio path.
//
// Exit-before-ready contract: fadeOutAndStop()/cleanup() are terminal --
// once either has run, the `stopped` flag makes both onload and onplay
// no-ops even if Howler fires them later (e.g. a slow decode/play lock
// that resolves after the user already confirmed/Guested/Departed/
// unmounted). This is what guarantees "no late playback or fade after
// unmount or after an exit path has already begun" regardless of how the
// load/play/onplay race resolves. The `playRequested` flag separately
// guards onload against ever calling play() more than once, and the
// `playing` flag guards onplay against ever starting the fade-in more
// than once -- these are Howler-quirk defenses, not part of the normal
// path.
//
// start() itself is a no-op after the first call (or after stopped) --
// this is what guarantees "begins once, never restarts on focus/selection
// changes" regardless of how many times a caller invokes it.
// fadeOutAndStop() fades a currently-playing Howl down and schedules its
// stop/unload on its own timer, deliberately not awaited by the caller --
// so confirming a Traveler, entering as Guest, or Departing never waits
// on the fade before navigating away, whether or not the audio had
// actually started playing yet.
//
// Error handling: onloaderror/onplayerror are terminal, mirroring
// fadeOutAndStop()/cleanup() -- they log via the repository's existing
// bracket-tagged console.warn convention (see useGameLibrary.js,
// useMediaFolders.js, SecurityScreen.jsx for precedent), mark the
// controller stopped, and unload/drop the Howl reference so a failed
// load or failed play can never be revived or leak a dangling instance.
// There is no retry and no user-facing dialog -- gateway music is
// decorative, not load-bearing for navigation.

export function createGatewayMusicController({ HowlCtor, src, fadeInMs, fadeOutMs }) {
  let howl = null
  let started = false
  let playRequested = false
  let playing = false
  let stopped = false

  function terminateOnError(tag, err) {
    if (stopped) return
    stopped = true
    console.warn(`[GatewayMusic] ${tag}`, err)
    const active = howl
    howl = null
    active?.unload()
  }

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
        // this was still loading -- never request playback after the
        // fact, no matter how late Howler's event fires. The
        // `playRequested` check guards against Howler ever firing onload
        // more than once for the same Howl -- play() must still only
        // ever be requested once.
        if (stopped || playRequested) return
        playRequested = true
        howl.play()
      },
      onplay: () => {
        // The actual Milestone 1.2.1 fix: fade-in only begins here, once
        // Howler confirms playback is genuinely active -- never queued
        // straight after play() the way onload used to. Guards against
        // both a late onplay after an exit path began, and Howler ever
        // firing onplay more than once for the same play() request.
        if (stopped || playing) return
        playing = true
        howl.fade(0, targetVolume, fadeInMs)
      },
      onloaderror: (id, err) => terminateOnError('onloaderror -- gateway theme failed to load', err),
      onplayerror: (id, err) => terminateOnError('onplayerror -- gateway theme failed to start playback', err),
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
