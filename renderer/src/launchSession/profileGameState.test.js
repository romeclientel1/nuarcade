import { test, beforeEach } from "node:test"
import assert from "node:assert/strict"

function installLocalStorageShim() {
  const store = new Map()
  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
  }
}
installLocalStorageShim()

const { getProfileGameState, applyEligibleReturn } = await import("./profileGameState.js")

beforeEach(() => { global.localStorage.clear() })

test("default/migration: a profile+game with no record is 'discovered', not 'living'", () => {
  const s = getProfileGameState("pNew", "gAny")
  assert.equal(s.lifeState, "discovered")
  assert.equal(s.firstConfirmedPlayAt, undefined)
})

test("catalog availability alone never implies living -- getProfileGameState never writes", () => {
  getProfileGameState("pNew", "gAny")
  getProfileGameState("pNew", "gAny")
  // No record should have been created just by reading.
  const raw = global.localStorage.getItem("nuarcade_profile_game_state")
  assert.equal(raw, null)
})

test("first eligible return -> living, becameLivingJustNow true", () => {
  const { record, becameLivingJustNow } = applyEligibleReturn({
    profileId: "p1", gameId: "g1", launchSessionId: "s1", at: 1000,
  })
  assert.equal(record.lifeState, "living")
  assert.equal(becameLivingJustNow, true)
  assert.equal(record.firstConfirmedPlayAt, 1000)
  assert.equal(record.lastConfirmedPlayAt, 1000)
  assert.equal(record.firstLivingLaunchSessionId, "s1")
})

test("existing living game: first timestamp unchanged, becameLivingJustNow false on replay", () => {
  applyEligibleReturn({ profileId: "p1", gameId: "g1", launchSessionId: "s1", at: 1000 })
  const second = applyEligibleReturn({ profileId: "p1", gameId: "g1", launchSessionId: "s2", at: 5000 })
  assert.equal(second.becameLivingJustNow, false)
  assert.equal(second.record.firstConfirmedPlayAt, 1000) // unchanged
  assert.equal(second.record.firstLivingLaunchSessionId, "s1") // unchanged
  assert.equal(second.record.lastConfirmedPlayAt, 5000) // updated
  assert.equal(second.record.lastLaunchSessionId, "s2") // updated
})

test("profile isolation: the same game is independent across profiles", () => {
  applyEligibleReturn({ profileId: "pA", gameId: "gShared", launchSessionId: "s1", at: 1000 })
  const forB = getProfileGameState("pB", "gShared")
  assert.equal(forB.lifeState, "discovered")
  const forA = getProfileGameState("pA", "gShared")
  assert.equal(forA.lifeState, "living")
})

test("idempotent: calling applyEligibleReturn repeatedly never regresses to discovered", () => {
  applyEligibleReturn({ profileId: "p1", gameId: "g1", launchSessionId: "s1", at: 1000 })
  applyEligibleReturn({ profileId: "p1", gameId: "g1", launchSessionId: "s2", at: 2000 })
  applyEligibleReturn({ profileId: "p1", gameId: "g1", launchSessionId: "s3", at: 3000 })
  const final = getProfileGameState("p1", "g1")
  assert.equal(final.lifeState, "living")
  assert.equal(final.firstConfirmedPlayAt, 1000)
})

test("applyEligibleReturn defaults `at` to now when not provided", () => {
  const before = Date.now()
  const { record } = applyEligibleReturn({ profileId: "p1", gameId: "g1", launchSessionId: "s1" })
  const after = Date.now()
  assert.ok(record.firstConfirmedPlayAt >= before && record.firstConfirmedPlayAt <= after)
})
