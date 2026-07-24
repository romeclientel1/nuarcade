// gatewayMusicEngine.test.js -------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// gatewayMusicEngine.js is plain, framework-free JS (see uiSoundEngine.js
// for the established pattern this mirrors), so unlike PlayerSelect.jsx it
// CAN be imported and actually executed here against a fake Howl-like
// double -- these are real behavioral tests, not source-text regex
// assertions. They lock the Traveler Recognition Milestone 1.2.1 gateway
// music contract: starts once, never restarts, respects the enabled flag,
// converts 0-100 volume percent the same way the rest of the app does,
// requests playback from onload but defers the fade-in to onplay (the
// actual fix for the HTML5 play-lock queue-order defect -- fade() used to
// be queued immediately after play() inside onload, landing before
// Howler's Promise-based play lock resolved, so it silently completed
// against audio that hadn't started playing yet), cancels safely if an
// exit path (unmount/confirm/Guest/Depart) begins before onplay confirms
// playback, fades out without blocking the caller once actually playing,
// handles onloaderror/onplayerror without reviving or leaking a stopped
// Howl, and never leaves an orphaned Howl instance behind.

import { test } from "node:test"
import assert from "node:assert/strict"
import { createGatewayMusicController } from "./gatewayMusicEngine.js"

// FakeHowl models the real Howler(html5: true) lifecycle closely enough to
// reproduce the Milestone 1.2 defect and prove the 1.2.1 fix:
//   - onload and onplay are separate, independently-triggerable events
//     (real Howler does not call either synchronously from the
//     constructor or from play()).
//   - play() only records that playback was *requested* -- it does NOT
//     synchronously resolve to "now playing" the way the buggy Milestone
//     1.2 code implicitly assumed. This is the play-lock: in real
//     Howler(html5: true), play() kicks off a Promise-based lock and
//     onplay only fires once that lock resolves, which can be one or
//     more microtask/task turns later. Tests simulate that resolution
//     explicitly via triggerPlay(), which refuses to fire if play() was
//     never actually called -- so a test cannot accidentally prove the
//     fix by triggering onplay without a real play() request in between,
//     the same way a real premature fade() could never legitimately run
//     before Howler's own play lock resolved.
//   - fade() captures its duration (not just from/to), so tests can prove
//     the exact 1200ms/700ms contract values, not just that *a* fade
//     happened.
//   - onloaderror/onplayerror are separately triggerable, modeling
//     Howler's real (id, error) callback signature.
class FakeHowl {
  constructor(opts) {
    this.opts = opts
    this._volume = opts.volume ?? 1
    this.playCalls = 0
    this.fadeCalls = []
    this.stopCalls = 0
    this.unloadCalls = 0
    this._playRequested = false
    FakeHowl.instances.push(this)
  }
  triggerLoad() { this.opts.onload?.() }
  triggerLoadError(err = "decode failed") { this.opts.onloaderror?.(1, err) }
  triggerPlayError(err = "play blocked") { this.opts.onplayerror?.(1, err) }
  play() { this.playCalls += 1; this._playRequested = true; return 1 }
  // Simulates Howler's play-lock resolving and firing the real onplay
  // event. Refuses to fire if play() was never requested, so it cannot
  // be used to fake playback that was never actually asked for.
  triggerPlay() {
    if (!this._playRequested) return
    this.opts.onplay?.()
  }
  fade(from, to, duration) { this.fadeCalls.push([from, to, duration]); this._volume = to }
  volume(v) {
    if (v === undefined) return this._volume
    this._volume = v
    return this
  }
  stop() { this.stopCalls += 1 }
  unload() { this.unloadCalls += 1 }
}
FakeHowl.instances = []

const makeController = (overrides = {}) => {
  FakeHowl.instances = []
  return createGatewayMusicController({
    HowlCtor: FakeHowl,
    src: "vespara-gateway-theme.mp3",
    fadeInMs: 1200,
    fadeOutMs: 700,
    ...overrides,
  })
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// -- 1. onload requests play() but does not start the fade -----------------

test("start() creates the Howl and requests its load immediately, but does NOT play or fade before onload fires at all", () => {
  const controller = makeController()
  controller.start(true, 80)
  assert.equal(FakeHowl.instances.length, 1)
  const howl = FakeHowl.instances[0]
  assert.equal(howl.opts.src[0], "vespara-gateway-theme.mp3")
  assert.equal(howl.opts.volume, 0, "must be constructed silent")
  assert.equal(howl.opts.html5, true, "must preserve html5: true")
  assert.equal(howl.playCalls, 0, "play() must not fire before onload")
  assert.deepEqual(howl.fadeCalls, [], "fade() must not fire before onload")
})

test("1. onload requests play() but does NOT start the fade -- fade only begins from onplay, never queued right after play()", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  assert.equal(howl.playCalls, 1, "onload must request play()")
  assert.deepEqual(howl.fadeCalls, [], "onload must NOT call fade() -- this is the exact defect being fixed")
})

// -- 2, 3, 4. Fade starts only after onplay, targets configured volume, 1200ms

test("2, 3 & 4. fade starts only after the onplay confirmation event, targets the configured volume, over the configured 1200ms duration", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  assert.deepEqual(howl.fadeCalls, [], "fade must still not have fired -- onplay has not happened yet")
  howl.triggerPlay()
  assert.deepEqual(howl.fadeCalls, [[0, 0.8, 1200]], "fade must fire from onplay, to the configured 80% volume, over 1200ms")
})

test("volume percent (0-100) is converted the same way the rest of the app converts it, and clamped to 0-1, once onplay confirms playback", () => {
  const overVolume = makeController()
  overVolume.start(true, 150)
  FakeHowl.instances[0].triggerLoad()
  FakeHowl.instances[0].triggerPlay()
  assert.deepEqual(FakeHowl.instances[0].fadeCalls, [[0, 1, 1200]], "150% must clamp to 1.0")

  const underVolume = makeController()
  underVolume.start(true, -20)
  FakeHowl.instances[0].triggerLoad()
  FakeHowl.instances[0].triggerPlay()
  assert.deepEqual(FakeHowl.instances[0].fadeCalls, [[0, 0, 1200]], "negative percent must clamp to 0")

  const defaultVolume = makeController()
  defaultVolume.start(true, undefined)
  FakeHowl.instances[0].triggerLoad()
  FakeHowl.instances[0].triggerPlay()
  assert.deepEqual(FakeHowl.instances[0].fadeCalls, [[0, 0.6, 1200]], "an unspecified volume must default to 60%, matching Wheel's useMusicPlayer default")
})

test("start(false, ...) never creates a Howl at all -- an explicitly disabled preference must not autoplay, even once ready", () => {
  const controller = makeController()
  controller.start(false, 80)
  assert.equal(FakeHowl.instances.length, 0)
})

test("start() called a second time is a no-op -- focus movement or Traveler selection changes must never restart the theme", () => {
  const controller = makeController()
  controller.start(true, 80)
  controller.start(true, 80)
  controller.start(true, 50)
  assert.equal(FakeHowl.instances.length, 1, "only one Howl instance may ever be created for this controller's lifetime")
  FakeHowl.instances[0].triggerLoad()
  FakeHowl.instances[0].triggerPlay()
  assert.equal(FakeHowl.instances[0].playCalls, 1, "play() must only ever be requested once")
})

// -- 5. onplay can trigger the fade only once -------------------------------

test("5. a second, spurious onplay firing (defensive against a real Howler quirk) must not double-trigger the fade", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  howl.triggerPlay()
  howl.triggerPlay()
  assert.equal(howl.fadeCalls.length, 1, "fade must only ever fire once, even if onplay fires more than once")
})

test("a late/duplicate onload firing after playback was already requested must not call play() a second time", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  howl.triggerLoad()
  assert.equal(howl.playCalls, 1, "play() must only ever be requested once, even if onload fires more than once")
})

// -- 6, 7, 8, 9. Exit before onplay prevents a later fade -------------------
// Two sub-cases per exit path: before onload has even fired, and after
// onload (play requested) but before onplay confirms it -- the race the
// 1.2.1 fix is actually about.

test("6a. Traveler confirmation (fadeOutAndStop()) before onload prevents any later playback or fade, even if onload/onplay fire later", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  controller.fadeOutAndStop()
  howl.triggerLoad()
  howl.triggerPlay()
  assert.equal(howl.playCalls, 0, "a late onload after confirming a Traveler must never request playback")
  assert.equal(howl.unloadCalls, 1, "the pending load must still be cancelled/unloaded")
  assert.deepEqual(howl.fadeCalls, [], "no fade is needed for audio that was never actually playing")
})

test("6b. Traveler confirmation (fadeOutAndStop()) after onload but before onplay prevents the fade from ever starting", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad() // play() requested
  controller.fadeOutAndStop() // confirm happens before Howler's play lock resolves
  howl.triggerPlay() // late onplay
  assert.deepEqual(howl.fadeCalls, [], "onplay firing after confirmation must never start the fade")
  assert.equal(howl.unloadCalls, 1, "the requested-but-unconfirmed playback must be unloaded, not left dangling")
})

test("7a. Guest entry (fadeOutAndStop()) before onload prevents any later playback or fade", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  controller.fadeOutAndStop() // Guest and confirm both route through fadeOutAndStop() -- see gatewayMusicIntegration.test.js
  howl.triggerLoad()
  howl.triggerPlay()
  assert.equal(howl.playCalls, 0)
  assert.deepEqual(howl.fadeCalls, [])
  assert.equal(howl.unloadCalls, 1)
})

test("7b. Guest entry (fadeOutAndStop()) after onload but before onplay prevents the fade from ever starting", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  controller.fadeOutAndStop()
  howl.triggerPlay()
  assert.deepEqual(howl.fadeCalls, [])
  assert.equal(howl.unloadCalls, 1)
})

test("8a. Depart (fadeOutAndStop()) before onload prevents any later playback or fade", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  controller.fadeOutAndStop() // Depart's confirm-then-quit branch also routes through fadeOutAndStop()
  howl.triggerLoad()
  howl.triggerPlay()
  assert.equal(howl.playCalls, 0)
  assert.deepEqual(howl.fadeCalls, [])
  assert.equal(howl.unloadCalls, 1)
})

test("8b. Depart (fadeOutAndStop()) after onload but before onplay prevents the fade from ever starting", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  controller.fadeOutAndStop()
  howl.triggerPlay()
  assert.deepEqual(howl.fadeCalls, [])
  assert.equal(howl.unloadCalls, 1)
})

test("9a. unmount (cleanup()) before onload prevents any later playback or fade", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  controller.cleanup()
  howl.triggerLoad()
  howl.triggerPlay()
  assert.equal(howl.playCalls, 0, "a late onload after unmount must never request playback")
  assert.equal(howl.unloadCalls, 1)
})

test("9b. unmount (cleanup()) after onload but before onplay prevents the fade from ever starting", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  controller.cleanup()
  howl.triggerPlay()
  assert.deepEqual(howl.fadeCalls, [])
  assert.equal(howl.unloadCalls, 1)
})

// -- 10. Active playback still fades out over 700ms -------------------------

test("10. audio that has actually started (onplay confirmed) still fades out over the configured 700ms duration, immediately (non-blocking), then stops/unloads after that duration elapses", async () => {
  const controller = makeController({ fadeOutMs: 20 })
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  howl.triggerPlay()

  const before = Date.now()
  controller.fadeOutAndStop()
  const elapsed = Date.now() - before
  assert.ok(elapsed < 10, "fadeOutAndStop must return synchronously, not await the fade duration")

  assert.deepEqual(howl.fadeCalls[howl.fadeCalls.length - 1], [0.8, 0, 20])
  assert.equal(howl.stopCalls, 0, "stop() must not fire until the fade-out duration has actually elapsed")

  await wait(40)
  assert.equal(howl.stopCalls, 1)
  assert.equal(howl.unloadCalls, 1)
})

test("fadeOutAndStop() returns synchronously whether or not onplay has confirmed playback yet", () => {
  const notReady = makeController()
  notReady.start(true, 80)
  const before1 = Date.now()
  notReady.fadeOutAndStop()
  assert.ok(Date.now() - before1 < 10)

  const ready = makeController({ fadeOutMs: 500 })
  ready.start(true, 80)
  FakeHowl.instances[0].triggerLoad()
  FakeHowl.instances[0].triggerPlay()
  const before2 = Date.now()
  ready.fadeOutAndStop()
  assert.ok(Date.now() - before2 < 10)
})

// -- 11. Disabled music never constructs or plays a Howl ---------------------

test("11. start(false, ...) never constructs a Howl, so nothing can ever load, play, or fade", () => {
  const controller = makeController()
  controller.start(false, 80)
  assert.equal(FakeHowl.instances.length, 0)
  assert.doesNotThrow(() => controller.fadeOutAndStop())
  assert.doesNotThrow(() => controller.cleanup())
})

// -- 12. Zero configured volume remains intentionally silent ----------------

test("12. volume 0 still plays (silently, intentionally) once onplay confirms -- disabling audio entirely is start(false, ...)'s job, not a volume=0 special case", () => {
  const controller = makeController()
  controller.start(true, 0)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  howl.triggerPlay()
  assert.equal(howl.playCalls, 1)
  assert.deepEqual(howl.fadeCalls, [[0, 0, 1200]])
})

// -- 13. onloaderror cleans up safely ---------------------------------------

test("13. onloaderror stops the controller, unloads the Howl, and never requests playback -- no revival, no leak", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoadError("network error")
  assert.equal(howl.unloadCalls, 1, "a failed load must still be unloaded")
  // Even if Howler somehow fires onload/onplay after its own error event,
  // the controller must already be terminally stopped.
  howl.triggerLoad()
  howl.triggerPlay()
  assert.equal(howl.playCalls, 0)
  assert.deepEqual(howl.fadeCalls, [])
  // Exit paths called afterward must be safe no-ops, not double-unload.
  assert.doesNotThrow(() => controller.fadeOutAndStop())
  assert.doesNotThrow(() => controller.cleanup())
  assert.equal(howl.unloadCalls, 1, "cleanup/fadeOutAndStop after onloaderror must not unload a second time")
})

test("13b. onloaderror does not throw and does not surface a user-facing dialog contract (only logs) -- start()/fadeOutAndStop()/cleanup() remain the only public surface", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  assert.doesNotThrow(() => howl.triggerLoadError("decode failed"))
})

// -- 14. onplayerror cleans up safely ----------------------------------------

test("14. onplayerror stops the controller, unloads the Howl, and never starts the fade -- no revival, no leak", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  howl.triggerPlayError("autoplay blocked")
  assert.equal(howl.unloadCalls, 1, "a failed play must still be unloaded")
  howl.triggerPlay()
  assert.deepEqual(howl.fadeCalls, [], "a late/spurious onplay after onplayerror must never start the fade")
  assert.doesNotThrow(() => controller.fadeOutAndStop())
  assert.doesNotThrow(() => controller.cleanup())
  assert.equal(howl.unloadCalls, 1, "cleanup/fadeOutAndStop after onplayerror must not unload a second time")
})

test("14b. an onloaderror/onplayerror pair firing back-to-back (defensive) only unloads once", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoadError("network error")
  howl.triggerPlayError("should be ignored -- already stopped")
  assert.equal(howl.unloadCalls, 1)
})

// -- 15. No orphaned Howl instance after cleanup in any state ---------------

test("15a. cleanup() immediately stops and unloads a Howl whose playback onplay already confirmed -- prevents orphaned playback on unmount", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  howl.triggerPlay()
  controller.cleanup()
  assert.equal(howl.stopCalls, 1)
  assert.equal(howl.unloadCalls, 1)
})

test("15b. cleanup() on a Howl that was still loading (onload never fired) unloads without calling stop() on a never-played sound", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  controller.cleanup()
  assert.equal(howl.stopCalls, 0)
  assert.equal(howl.unloadCalls, 1)
})

test("15c. cleanup() on a Howl whose play() was requested but never onplay-confirmed unloads without calling stop()", () => {
  const controller = makeController()
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  controller.cleanup()
  assert.equal(howl.stopCalls, 0, "stop() is only meaningful once onplay actually confirmed playback")
  assert.equal(howl.unloadCalls, 1)
})

test("15d. cleanup() after fadeOutAndStop() already ran is a no-op -- no double stop/unload on the same Howl", async () => {
  const controller = makeController({ fadeOutMs: 5 })
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  howl.triggerPlay()
  controller.fadeOutAndStop()
  await wait(15)
  assert.equal(howl.stopCalls, 1)
  controller.cleanup()
  assert.equal(howl.stopCalls, 1, "cleanup() must not stop() a Howl the fade-out timer already stopped")
  assert.equal(howl.unloadCalls, 1, "cleanup() must not unload() a Howl already unloaded")
})

test("15e. cleanup() with no Howl ever started is a safe no-op", () => {
  const controller = makeController()
  assert.doesNotThrow(() => controller.cleanup())
})

test("15f. fadeOutAndStop() with no active Howl (never started) is a safe no-op", () => {
  const controller = makeController()
  assert.doesNotThrow(() => controller.fadeOutAndStop())
})

test("15g. a second fadeOutAndStop() call never double-fades or double-unloads the same Howl", async () => {
  const controller = makeController({ fadeOutMs: 5 })
  controller.start(true, 80)
  const howl = FakeHowl.instances[0]
  howl.triggerLoad()
  howl.triggerPlay()
  controller.fadeOutAndStop()
  assert.equal(howl.fadeCalls.length, 2) // fade-in + fade-out
  assert.doesNotThrow(() => controller.fadeOutAndStop())
  assert.equal(howl.fadeCalls.length, 2, "a second fadeOutAndStop() call must not fade the same Howl again")
})

test("15h. start() after fadeOutAndStop() does not resurrect the theme (Guest/Depart/confirm must be a one-way trip for this screen instance)", () => {
  const controller = makeController({ fadeOutMs: 5 })
  controller.start(true, 80)
  controller.fadeOutAndStop()
  controller.start(true, 80)
  assert.equal(FakeHowl.instances.length, 1)
})

// -- 16. Navigation remains immediate ----------------------------------------
// (covered directly by the synchronous-return assertions above: 6b, 7b, 8b,
// 9b, and the two fadeOutAndStop()-returns-synchronously tests -- none of
// them ever await before returning control to the caller.)

test("16. every exit path (confirm/Guest/Depart/unmount) returns control to the caller synchronously, both before and after onplay", () => {
  const beforeOnplay = makeController()
  beforeOnplay.start(true, 80)
  FakeHowl.instances[0].triggerLoad()
  const t0 = Date.now()
  beforeOnplay.fadeOutAndStop()
  assert.ok(Date.now() - t0 < 10)

  const afterOnplay = makeController({ fadeOutMs: 500 })
  afterOnplay.start(true, 80)
  FakeHowl.instances[0].triggerLoad()
  FakeHowl.instances[0].triggerPlay()
  const t1 = Date.now()
  afterOnplay.fadeOutAndStop()
  assert.ok(Date.now() - t1 < 10)

  const unmountController = makeController()
  unmountController.start(true, 80)
  const t2 = Date.now()
  unmountController.cleanup()
  assert.ok(Date.now() - t2 < 10)
})

// 17. existing integration tests remain green -- see gatewayMusicIntegration.test.js,
// which is unaffected by this fix since useGatewayMusic.js's public
// interface (start/fadeOutAndStop/cleanup) is unchanged.
