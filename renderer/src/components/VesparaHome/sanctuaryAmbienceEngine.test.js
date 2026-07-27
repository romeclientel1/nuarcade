import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSanctuaryAmbienceController } from './sanctuaryAmbienceEngine.js'

class FakeHowl {
  static instances = []

  constructor(options) {
    this.options = options
    this.playCalls = 0
    this.fadeCalls = []
    this.stopCalls = 0
    this.pauseCalls = 0
    this.unloadCalls = 0
    this.currentVolume = options.volume
    FakeHowl.instances.push(this)
  }

  play() { this.playCalls += 1 }
  fade(from, to, duration) {
    this.fadeCalls.push([from, to, duration])
    this.currentVolume = to
  }
  volume() { return this.currentVolume }
  stop() { this.stopCalls += 1 }
  pause() { this.pauseCalls += 1 }
  unload() { this.unloadCalls += 1 }
  load() { this.options.onload?.() }
  playing() { this.options.onplay?.() }
  loadError(error = 'decode failed') { this.options.onloaderror?.(1, error) }
  playError(error = 'play failed') { this.options.onplayerror?.(1, error) }
}

function makeController(overrides = {}) {
  FakeHowl.instances = []
  const scheduled = []
  const cancelled = []
  const controller = createSanctuaryAmbienceController({
    HowlCtor: FakeHowl,
    src: '/assets/sanctuary-ambience.mp3',
    fadeInMs: 1800,
    fadeOutMs: 700,
    schedule: (fn, ms) => { scheduled.push({ fn, ms }); return scheduled.length },
    cancelSchedule: (id) => { cancelled.push(id) },
    ...overrides,
  })
  return { controller, scheduled, cancelled }
}

test('starts exactly one looping HTML5 Howl at volume zero', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  controller.start(true, 35)
  assert.equal(FakeHowl.instances.length, 1)
  assert.deepEqual(FakeHowl.instances[0].options.src, ['/assets/sanctuary-ambience.mp3'])
  assert.equal(FakeHowl.instances[0].options.loop, true)
  assert.equal(FakeHowl.instances[0].options.html5, true)
  assert.equal(FakeHowl.instances[0].options.volume, 0)
})

test('onload requests play but does not begin the fade', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load()
  assert.equal(howl.playCalls, 1)
  assert.deepEqual(howl.fadeCalls, [])
})

test('onplay begins the configured fade only after playback readiness', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load()
  howl.playing()
  assert.deepEqual(howl.fadeCalls, [[0, 0.35, 1800]])
})

test('duplicate load and play callbacks cannot restart playback or fade', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.load(); howl.playing(); howl.playing()
  assert.equal(howl.playCalls, 1)
  assert.equal(howl.fadeCalls.length, 1)
})

test('disabled, zero-volume, and missing-source paths construct no Howl', () => {
  makeController().controller.start(false, 35)
  assert.equal(FakeHowl.instances.length, 0)
  makeController().controller.start(true, 0)
  assert.equal(FakeHowl.instances.length, 0)
  makeController({ src: null }).controller.start(true, 35)
  assert.equal(FakeHowl.instances.length, 0)
})

test('exit before load unloads immediately and makes late callbacks inert', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  controller.fadeOutAndStop()
  howl.load()
  howl.playing()
  assert.equal(howl.unloadCalls, 1)
  assert.equal(howl.playCalls, 0)
  assert.deepEqual(howl.fadeCalls, [])
})

test('exit during playback fades, then stops and unloads once', () => {
  const { controller, scheduled } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.fadeOutAndStop()
  assert.deepEqual(howl.fadeCalls.at(-1), [0.35, 0, 700])
  assert.equal(scheduled.length, 1)
  assert.equal(scheduled[0].ms, 700)
  scheduled[0].fn()
  assert.equal(howl.stopCalls, 1)
  assert.equal(howl.unloadCalls, 1)
})

test('repeated exit calls cannot schedule duplicate stop timers', () => {
  const { controller, scheduled } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.fadeOutAndStop()
  controller.fadeOutAndStop()
  assert.equal(scheduled.length, 1)
})

test('unmount cleanup before readiness prevents late playback and orphaned audio', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  controller.cleanup()
  howl.load(); howl.playing()
  assert.equal(howl.unloadCalls, 1)
  assert.equal(howl.playCalls, 0)
})

test('unmount cleanup during playback stops and unloads immediately', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.cleanup()
  assert.equal(howl.stopCalls, 1)
  assert.equal(howl.unloadCalls, 1)
})

test('load error is terminal and cannot revive the Howl', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.loadError()
  howl.load(); howl.playing()
  assert.equal(howl.unloadCalls, 1)
  assert.equal(howl.playCalls, 0)
})

test('play error is terminal and cannot begin a late fade', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load()
  howl.playError()
  howl.playing()
  assert.equal(howl.unloadCalls, 1)
  assert.deepEqual(howl.fadeCalls, [])
})

// -- VES-R0-001: pause()/resume() for an external game launch ---------------
// Distinct from fadeOutAndStop()/cleanup(): these must be reversible and
// must never unload() the Howl instance, so ambience can come back without
// re-creating the engine.

test('pause fades to zero and, once the fade completes, actually pauses the Howl without unloading it', () => {
  const { controller, scheduled } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()

  controller.pause()
  assert.deepEqual(howl.fadeCalls.at(-1), [0.35, 0, 700])
  assert.equal(howl.stopCalls, 0)
  assert.equal(howl.unloadCalls, 0)

  assert.equal(scheduled.length, 1)
  scheduled[0].fn()
  assert.equal(howl.pauseCalls, 1)
  assert.equal(howl.unloadCalls, 0)
})

test('pause before ambience is actually playing is a safe no-op (nothing to pause yet)', () => {
  const { controller, scheduled } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load() // onload fired, but onplay has not -- `playing` is still false
  controller.pause()
  assert.deepEqual(howl.fadeCalls, [])
  assert.equal(scheduled.length, 0)
})

test('repeated pause calls cannot schedule more than one pending pause', () => {
  const { controller, scheduled } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.pause()
  controller.pause()
  controller.pause()
  assert.equal(scheduled.length, 1)
})

test('resume called before the pause fade completes cancels the pending pause and fades back up instead', () => {
  const { controller, scheduled, cancelled } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.pause()
  assert.equal(scheduled.length, 1)

  controller.resume(true, 35)
  assert.deepEqual(cancelled, [1])
  assert.deepEqual(howl.fadeCalls.at(-1), [0, 0.35, 1800])
  // The Howl instance was never actually paused (the timer never fired),
  // so resume must not call play() on an already-playing instance --
  // that would risk a second, overlapping playback instance.
  assert.equal(howl.pauseCalls, 0)
  assert.equal(howl.playCalls, 1) // only the original start()-driven play

  // The stale scheduled callback firing late (as if the real timer had
  // not actually been cancelled) must still be inert.
  scheduled[0].fn()
  assert.equal(howl.pauseCalls, 0)
})

test('resume called after the pause fade has already completed genuinely un-pauses playback before fading in', () => {
  const { controller, scheduled } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.pause()
  scheduled[0].fn() // let the pause timer actually fire
  assert.equal(howl.pauseCalls, 1)

  controller.resume(true, 35)
  assert.equal(howl.playCalls, 2) // original start() play + resume's play()
  assert.deepEqual(howl.fadeCalls.at(-1), [0, 0.35, 1800])
})

test('resume is a no-op if ambience was never paused -- prevents a duplicate/overlapping instance from a stray extra onReturn', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.resume(true, 35) // never paused
  assert.equal(howl.playCalls, 1)
  assert.deepEqual(howl.fadeCalls, [[0, 0.35, 1800]]) // only the original start() fade-in
})

test('resume with music disabled leaves ambience paused rather than force-resuming it', () => {
  const { controller, scheduled } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.pause()
  scheduled[0].fn()
  controller.resume(false, 35)
  assert.equal(howl.playCalls, 1) // resume did not call play again
})

test('pause is permanently inert once fadeOutAndStop/cleanup has already run', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.fadeOutAndStop()
  controller.pause()
  assert.equal(howl.fadeCalls.at(-1)[1], 0) // only fadeOutAndStop's own fade-to-zero
})

test('resume is permanently inert once fadeOutAndStop/cleanup has already run', () => {
  const { controller } = makeController()
  controller.start(true, 35)
  const howl = FakeHowl.instances[0]
  howl.load(); howl.playing()
  controller.pause()
  controller.cleanup()
  controller.resume(true, 35)
  assert.equal(howl.playCalls, 1) // never resumed after cleanup
})
