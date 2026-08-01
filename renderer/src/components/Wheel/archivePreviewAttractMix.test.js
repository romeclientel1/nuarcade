import { test } from "node:test"
import assert from "node:assert/strict"
import { createArchivePreviewAttractMixController } from "./archivePreviewAttractMix.js"

function makeVideo({ source, requestId, currentTime, paused = false, muted = false, volume = 0.35 }) {
  return {
    currentSrc: source,
    dataset: { archiveRequest: String(requestId) },
    currentTime,
    paused,
    ended: false,
    muted,
    volume,
    pauseCalls: 0,
    playCalls: 0,
    pause() { this.pauseCalls += 1; this.paused = true },
    play() { this.playCalls += 1; this.paused = false; return Promise.resolve() },
  }
}

test("Attract entry pauses and silences both Archive View slots while preserving the active preview", () => {
  const a = makeVideo({ source: "game-a.mp4", requestId: 1, currentTime: 42.5 })
  const b = makeVideo({ source: "game-b.mp4", requestId: 2, currentTime: 7 })
  const controller = createArchivePreviewAttractMixController({
    getActiveSlot: () => "a",
    getVideo: slot => slot === "a" ? a : b,
  })

  controller.enter()

  assert.equal(controller.isSuspended(), true)
  assert.equal(a.paused, true)
  assert.equal(b.paused, true)
  assert.equal(a.muted, true)
  assert.equal(b.muted, true)
  assert.equal(a.currentSrc, "game-a.mp4")
  assert.equal(a.currentTime, 42.5)
})

test("Attract wake restores only the exact previously active preview and its playback state", async () => {
  const a = makeVideo({ source: "game-a.mp4", requestId: 1, currentTime: 42.5, muted: false, volume: 0.35 })
  const b = makeVideo({ source: "game-b.mp4", requestId: 2, currentTime: 7 })
  const controller = createArchivePreviewAttractMixController({
    getActiveSlot: () => "a",
    getVideo: slot => slot === "a" ? a : b,
  })

  controller.enter()
  a.currentTime = 0
  controller.leave()
  await Promise.resolve()

  assert.equal(controller.isSuspended(), false)
  assert.equal(a.currentTime, 42.5)
  assert.equal(a.volume, 0.35)
  assert.equal(a.muted, false)
  assert.equal(a.playCalls, 1)
  assert.equal(b.playCalls, 0)
  assert.equal(b.paused, true)
  assert.equal(b.muted, true)
})

test("Attract wake never revives a replaced source or a preview that was already paused", async () => {
  const original = makeVideo({ source: "game-a.mp4", requestId: 1, currentTime: 10 })
  let a = original
  const controller = createArchivePreviewAttractMixController({
    getActiveSlot: () => "a",
    getVideo: slot => slot === "a" ? a : null,
  })

  controller.enter()
  a = makeVideo({ source: "replacement.mp4", requestId: 3, currentTime: 0 })
  controller.leave()
  await Promise.resolve()
  assert.equal(original.playCalls, 0)
  assert.equal(a.playCalls, 0)

  const paused = makeVideo({ source: "paused.mp4", requestId: 4, currentTime: 18, paused: true })
  const pausedController = createArchivePreviewAttractMixController({
    getActiveSlot: () => "a",
    getVideo: () => paused,
  })
  pausedController.enter()
  pausedController.leave()
  await Promise.resolve()
  assert.equal(paused.playCalls, 0)
  assert.equal(paused.paused, true)
})

test("cleanup discards restoration state and leaves every preview silent", async () => {
  const a = makeVideo({ source: "game-a.mp4", requestId: 1, currentTime: 24 })
  const b = makeVideo({ source: "game-b.mp4", requestId: 2, currentTime: 9 })
  const controller = createArchivePreviewAttractMixController({
    getActiveSlot: () => "a",
    getVideo: slot => slot === "a" ? a : b,
  })

  controller.enter()
  controller.cleanup()
  controller.leave()
  await Promise.resolve()

  assert.equal(controller.isSuspended(), false)
  assert.equal(a.playCalls, 0)
  assert.equal(b.playCalls, 0)
  assert.equal(a.paused, true)
  assert.equal(b.paused, true)
  assert.equal(a.muted, true)
  assert.equal(b.muted, true)
})
