import { test } from "node:test"
import assert from "node:assert/strict"
import { createAttractAmbienceController } from "./attractAmbienceEngine.js"

function harness() {
  const howls = []
  const timers = new Map()
  let timerId = 0

  class FakeHowl {
    constructor(options) {
      this.options = options
      this.calls = []
      this.level = options.volume
      this.isPlaying = false
      howls.push(this)
    }
    play() { this.calls.push(["play"]); this.isPlaying = true }
    stop() { this.calls.push(["stop"]); this.isPlaying = false }
    unload() { this.calls.push(["unload"]) }
    fade(from, to, duration) { this.calls.push(["fade", from, to, duration]); this.level = to }
    volume() { return this.level }
    playing() { return this.isPlaying }
  }

  const schedule = (callback, delay) => {
    const id = ++timerId
    timers.set(id, { callback, delay })
    return id
  }
  const cancelSchedule = (id) => timers.delete(id)
  const flush = () => {
    const pending = [...timers.values()]
    timers.clear()
    pending.forEach(({ callback }) => callback())
  }
  const controller = createAttractAmbienceController({
    HowlCtor: FakeHowl,
    src: "vespara-attract-ambient.mp3",
    fadeInMs: 1800,
    fadeOutMs: 900,
    schedule,
    cancelSchedule,
  })
  return { controller, howls, timers, flush }
}

test("Attract ambience creates one looping HTML5 Howl only after active entry", () => {
  const { controller, howls } = harness()
  assert.equal(howls.length, 0)
  controller.enter(true, 35)
  assert.equal(howls.length, 1)
  assert.deepEqual(howls[0].options.src, ["vespara-attract-ambient.mp3"])
  assert.equal(howls[0].options.loop, true)
  assert.equal(howls[0].options.html5, true)
  assert.equal(howls[0].options.preload, true)
  assert.equal(howls[0].options.volume, 0)
})

test("load requests playback and confirmed playback fades to ambientVolume", () => {
  const { controller, howls } = harness()
  controller.enter(true, 35)
  const howl = howls[0]
  howl.options.onload()
  assert.deepEqual(howl.calls, [["play"]])
  howl.options.onplay()
  assert.deepEqual(howl.calls.at(-1), ["fade", 0, 0.35, 1800])
})

test("duplicate entry never creates a duplicate Howl", () => {
  const { controller, howls } = harness()
  controller.enter(true, 35)
  howls[0].options.onload()
  howls[0].options.onplay()
  controller.enter(true, 20)
  assert.equal(howls.length, 1)
  assert.deepEqual(howls[0].calls.at(-1), ["fade", 0.35, 0.2, 1800])
})

test("wake fades out then stops and unloads exactly once", () => {
  const { controller, howls, timers, flush } = harness()
  controller.enter(true, 35)
  const howl = howls[0]
  howl.options.onload()
  howl.options.onplay()
  controller.leave()
  assert.deepEqual(howl.calls.at(-1), ["fade", 0.35, 0, 900])
  assert.equal([...timers.values()][0].delay, 900)
  flush()
  assert.equal(howl.calls.filter(([name]) => name === "stop").length, 1)
  assert.equal(howl.calls.filter(([name]) => name === "unload").length, 1)
})

test("re-entry during fade cancels release and reuses the same Howl", () => {
  const { controller, howls, timers, flush } = harness()
  controller.enter(true, 35)
  const howl = howls[0]
  howl.options.onload()
  howl.options.onplay()
  controller.leave()
  assert.equal(timers.size, 1)
  controller.enter(true, 30)
  assert.equal(timers.size, 0)
  assert.equal(howls.length, 1)
  flush()
  assert.equal(howl.calls.filter(([name]) => name === "unload").length, 0)
})

test("global music disable and zero volume construct no audio instance", () => {
  const first = harness()
  first.controller.enter(false, 35)
  assert.equal(first.howls.length, 0)
  const second = harness()
  second.controller.enter(true, 0)
  assert.equal(second.howls.length, 0)
})

test("autoplay rejection is a quiet terminal cleanup, never a thrown console error", () => {
  const { controller, howls } = harness()
  controller.enter(true, 35)
  const howl = howls[0]
  assert.doesNotThrow(() => howl.options.onplayerror(1, "NotAllowedError"))
  assert.equal(howl.calls.filter(([name]) => name === "unload").length, 1)
})

test("unmount cancels pending release and late callbacks cannot revive audio", () => {
  const { controller, howls, timers, flush } = harness()
  controller.enter(true, 35)
  const howl = howls[0]
  howl.options.onload()
  howl.options.onplay()
  controller.leave()
  assert.equal(timers.size, 1)
  controller.cleanup()
  assert.equal(timers.size, 0)
  flush()
  howl.options.onload()
  howl.options.onplay()
  assert.equal(howl.calls.filter(([name]) => name === "play").length, 1)
  assert.equal(howl.calls.filter(([name]) => name === "unload").length, 1)
})
