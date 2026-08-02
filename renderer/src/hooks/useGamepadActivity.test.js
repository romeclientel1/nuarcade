import { test } from "node:test"
import assert from "node:assert/strict"
import { dispatchGamepadActivity } from "./useGamepad.js"

test("a genuine gamepad dispatch resets activity before performing navigation", () => {
  const events = []
  dispatchGamepadActivity(() => events.push("activity"), () => events.push("navigate"))
  assert.deepEqual(events, ["activity", "navigate"])
})

test("unmapped genuine gamepad activity still resets the idle window", () => {
  let resets = 0
  dispatchGamepadActivity(() => { resets += 1 }, undefined)
  assert.equal(resets, 1)
})

test("activity dispatch preserves handlers when no idle callback is supplied", () => {
  let handled = 0
  dispatchGamepadActivity(undefined, () => { handled += 1 })
  assert.equal(handled, 1)
})
