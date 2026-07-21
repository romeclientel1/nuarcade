// originRestoration.test.js ------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency. resolveLaunchOriginRestoration is pure -- no storage, no
// shim needed.

import { test } from "node:test"
import assert from "node:assert/strict"

const { resolveLaunchOriginRestoration } = await import("./originRestoration.js")

test("exact origin + focused game restored when the game still resolves", () => {
  const checkpoint = { originDestination: "library", originContext: { focusedGameId: "g1" } }
  const result = resolveLaunchOriginRestoration(checkpoint, { gameStillResolves: true })
  assert.deepEqual(result, { destination: "library", focusGameId: "g1" })
})

test("origin restored with safe fallback (no focus) when the game no longer resolves", () => {
  const checkpoint = { originDestination: "library", originContext: { focusedGameId: "g1" } }
  const result = resolveLaunchOriginRestoration(checkpoint, { gameStillResolves: false })
  assert.deepEqual(result, { destination: "library", focusGameId: null })
})

test("origin unavailable -> falls back to Home, no focus", () => {
  const checkpoint = { originDestination: "library", originContext: { focusedGameId: "g1" } }
  const result = resolveLaunchOriginRestoration(checkpoint, {
    gameStillResolves: true, destinationRestorable: false,
  })
  assert.deepEqual(result, { destination: "home", focusGameId: null })
})

test("Home also unavailable -> falls back to Recovery", () => {
  const checkpoint = { originDestination: "library", originContext: { focusedGameId: "g1" } }
  const result = resolveLaunchOriginRestoration(checkpoint, {
    gameStillResolves: true, destinationRestorable: false, homeRestorable: false,
  })
  assert.deepEqual(result, { destination: "recovery", focusGameId: null })
})

test("missing checkpoint -> Recovery", () => {
  const result = resolveLaunchOriginRestoration(null, { gameStillResolves: true })
  assert.deepEqual(result, { destination: "recovery", focusGameId: null })
})

test("invalid checkpoint (unrecognized originDestination) -> Recovery", () => {
  const result = resolveLaunchOriginRestoration({ originDestination: "somewhere-else" }, {})
  assert.deepEqual(result, { destination: "recovery", focusGameId: null })
})

test("home origin with no availability object at all defaults to fully restorable", () => {
  const checkpoint = { originDestination: "home" }
  const result = resolveLaunchOriginRestoration(checkpoint, undefined)
  assert.deepEqual(result, { destination: "home", focusGameId: null })
})

test("profile mismatch prevents restoration of private origin context (Library), even though the game resolves and a focus target is recorded", () => {
  // Mirrors how reconciliation.js calls this: on a profile mismatch it
  // passes destinationRestorable: false regardless of gameStillResolves,
  // specifically so another profile's focusedGameId is never leaked
  // through a restored Library destination.
  const checkpoint = { originDestination: "library", originContext: { focusedGameId: "someone-elses-focus" } }
  const result = resolveLaunchOriginRestoration(checkpoint, {
    gameStillResolves: true, destinationRestorable: false, homeRestorable: true,
  })
  assert.equal(result.destination, "home")
  assert.equal(result.focusGameId, null)
})
