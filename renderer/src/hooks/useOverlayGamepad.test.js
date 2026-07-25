import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createOverlayGamepadInputGate } from "./useOverlayGamepad.js"
import { isGamepadNeutral } from "./gamepadNeutral.js"

const HERE = dirname(fileURLToPath(import.meta.url))
const gamepadHook = readFileSync(join(HERE, "useGamepad.js"), "utf8")

function gamepad({ buttons = [], axes = [0, 0] } = {}) {
  const states = Array.from({ length: 16 }, (_, index) => ({
    pressed: buttons.includes(index),
  }))
  return { buttons: states, axes }
}

function counters() {
  const calls = { close: 0, confirm: 0, up: 0, down: 0, left: 0, right: 0 }
  return {
    calls,
    handlers: {
      onClose: () => { calls.close += 1 },
      onConfirm: () => { calls.confirm += 1 },
      onUp: () => { calls.up += 1 },
      onDown: () => { calls.down += 1 },
      onLeft: () => { calls.left += 1 },
      onRight: () => { calls.right += 1 },
    },
  }
}

test("an already-primed overlay is fully suppressed and reset while Depart is open", () => {
  const gate = createOverlayGamepadInputGate()
  const { calls, handlers } = counters()
  gate.process(gamepad(), handlers, 0)
  gate.process(gamepad({ buttons: [0] }), handlers, 200)
  assert.equal(calls.confirm, 1)

  gate.suppress(220)
  gate.suppress(240)
  assert.deepEqual(gate.snapshot(), {
    primed: false,
    lastInput: 240,
    waitingForNeutral: true,
  })
})

test("held A and B cannot reach the underlying action through cancellation", () => {
  for (const [button, call] of [[0, "confirm"], [1, "close"]]) {
    const gate = createOverlayGamepadInputGate()
    const { calls, handlers } = counters()
    gate.process(gamepad(), handlers, 0)
    gate.suppress(200)
    gate.process(gamepad({ buttons: [button] }), handlers, 220)
    gate.process(gamepad({ buttons: [button] }), handlers, 1000)
    assert.equal(calls[call], 0)
    assert.equal(gate.snapshot().waitingForNeutral, true)
  }
})

test("held START, directions, and shoulders prevent re-arming until neutral", () => {
  for (const held of [
    gamepad({ buttons: [9] }),
    gamepad({ buttons: [12] }),
    gamepad({ buttons: [4] }),
    gamepad({ axes: [0.8, 0] }),
  ]) {
    const gate = createOverlayGamepadInputGate()
    const { calls, handlers } = counters()
    gate.process(gamepad(), handlers, 0)
    gate.suppress(200)
    gate.process(held, handlers, 1000)
    assert.equal(gate.snapshot().waitingForNeutral, true)
    assert.deepEqual(calls, { close: 0, confirm: 0, up: 0, down: 0, left: 0, right: 0 })
  }
  assert.equal(isGamepadNeutral(gamepad({ buttons: [9] })), false)
})

test("one complete neutral frame re-primes input and the next fresh press works immediately", () => {
  const gate = createOverlayGamepadInputGate()
  const { calls, handlers } = counters()
  gate.process(gamepad(), handlers, 0)
  gate.suppress(200)
  gate.process(gamepad({ buttons: [0] }), handlers, 1000)
  gate.process(gamepad(), handlers, 1016)
  assert.deepEqual(gate.snapshot(), {
    primed: true,
    lastInput: 0,
    waitingForNeutral: false,
  })

  gate.process(gamepad({ buttons: [0] }), handlers, 1032)
  assert.equal(calls.confirm, 1)
})

test("the general useGamepad START path uses the same complete-neutral predicate", () => {
  assert.match(gamepadHook, /waitingForNeutralRef\.current = true/)
  assert.match(gamepadHook, /if \(isGamepadNeutral\(gp\)\) \{[\s\S]*?waitingForNeutralRef\.current = false[\s\S]*?primedRef\.current = true/)
  assert.equal(isGamepadNeutral(gamepad({ buttons: [9] })), false)
  assert.equal(isGamepadNeutral(gamepad()), true)
})
