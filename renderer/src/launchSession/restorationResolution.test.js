// restorationResolution.test.js --------------------------------------------
// Committed regression tests, run via `node --test`. Tests the real
// production resolution helpers Wheel.jsx and VesparaHome.jsx call --
// no duplicated test-only logic.

import { test } from "node:test"
import assert from "node:assert/strict"

const {
  shouldConsumeRestoration, clampIndex, resolveHomeFocus, resolveLibraryRestoration,
} = await import("./restorationResolution.js")

function request(overrides = {}) {
  return {
    restorationId: "rr-1", profileId: "p1", destination: "library",
    focusGameId: "g2", sectionId: "Racing", selectedIndex: 1, ...overrides,
  }
}

const RACING = [{ id: "g1" }, { id: "g2" }, { id: "g3" }]
const ALL = [{ id: "g0" }, { id: "g1" }, { id: "g2" }, { id: "g3" }, { id: "g9" }]

// -- consumption gate -------------------------------------------------------

test("a loading catalog keeps restoration pending -- not consumable until catalogReady", () => {
  assert.equal(shouldConsumeRestoration(request(), { catalogReady: false }), false)
  assert.equal(shouldConsumeRestoration(request(), {}), false)
  assert.equal(shouldConsumeRestoration(request(), { catalogReady: true }), true)
})

test("a null or malformed request is never consumable", () => {
  assert.equal(shouldConsumeRestoration(null, { catalogReady: true }), false)
  assert.equal(shouldConsumeRestoration({}, { catalogReady: true }), false)
})

// -- Home ------------------------------------------------------------------

test("matching Home restoration resolves the same Recently Played game by stable id", () => {
  const focus = resolveHomeFocus(request({ destination: "home" }), {
    recentGames: [{ id: "g5" }, { id: "g2" }, { id: "g7" }],
  })
  assert.deepEqual(focus, { recentIndex: 1 })
})

test("a Recently Played entry that resolves by profile key (g.profile) still matches", () => {
  const focus = resolveHomeFocus(request({ focusGameId: "SomeGame.xml" }), {
    recentGames: [{ profile: "SomeGame.xml" }],
  })
  assert.deepEqual(focus, { recentIndex: 0 })
})

test("a missing Home game degrades to Home without focus (null), never a fabricated entry", () => {
  assert.equal(resolveHomeFocus(request(), { recentGames: [{ id: "other" }] }), null)
  assert.equal(resolveHomeFocus(request(), { recentGames: [] }), null)
  assert.equal(resolveHomeFocus(request({ focusGameId: null }), { recentGames: [{ id: "g2" }] }), null)
  assert.equal(resolveHomeFocus(null, { recentGames: [{ id: "g2" }] }), null)
})

// -- Library ---------------------------------------------------------------

test("matching Library restoration resolves by game id inside the still-valid saved section", () => {
  const r = resolveLibraryRestoration(request(), {
    sectionExists: true, sectionGames: RACING, allGames: ALL,
  })
  assert.deepEqual(r, { category: "Racing", index: 1, resolvedGame: true })
})

test("the game id outranks a stale saved index -- the saved index is ignored when the game resolves", () => {
  // Saved index says 0, but g2 now sits at index 2 after reordering.
  const reordered = [{ id: "g3" }, { id: "g1" }, { id: "g2" }]
  const r = resolveLibraryRestoration(request({ selectedIndex: 0 }), {
    sectionExists: true, sectionGames: reordered, allGames: ALL,
  })
  assert.deepEqual(r, { category: "Racing", index: 2, resolvedGame: true })
})

test("a game moved out of its saved section resolves in a current valid category ('All') at its real index", () => {
  const r = resolveLibraryRestoration(request(), {
    sectionExists: true, sectionGames: [{ id: "g1" }, { id: "g3" }], allGames: ALL,
  })
  assert.deepEqual(r, { category: "All", index: 2, resolvedGame: true })
})

test("a removed/renamed section with the game still in the catalog resolves via 'All'", () => {
  const r = resolveLibraryRestoration(request(), {
    sectionExists: false, sectionGames: [], allGames: ALL,
  })
  assert.deepEqual(r, { category: "All", index: 2, resolvedGame: true })
})

test("game gone but section still valid: the saved section is restored with the saved index as fallback", () => {
  const r = resolveLibraryRestoration(request({ focusGameId: "deleted-game" }), {
    sectionExists: true, sectionGames: RACING, allGames: ALL.filter(g => g.id !== "g2"),
  })
  assert.deepEqual(r, { category: "Racing", index: 1, resolvedGame: false })
})

test("a fallback index beyond the current list bounds is clamped; negative and non-numeric indexes clamp to 0", () => {
  const past = resolveLibraryRestoration(request({ focusGameId: null, selectedIndex: 99 }), {
    sectionExists: true, sectionGames: RACING, allGames: ALL,
  })
  assert.deepEqual(past, { category: "Racing", index: 2, resolvedGame: false })

  const negative = resolveLibraryRestoration(request({ focusGameId: null, selectedIndex: -4 }), {
    sectionExists: true, sectionGames: RACING, allGames: ALL,
  })
  assert.equal(negative.index, 0)

  const nonNumeric = resolveLibraryRestoration(request({ focusGameId: null, selectedIndex: null }), {
    sectionExists: true, sectionGames: RACING, allGames: ALL,
  })
  assert.equal(nonNumeric.index, 0)

  assert.equal(clampIndex(5, 3), 2)
  assert.equal(clampIndex(-1, 3), 0)
  assert.equal(clampIndex(undefined, 3), 0)
  assert.equal(clampIndex(2.9, 3), 2)
})

test("an empty catalog does not crash -- destination-only fallback to 'All' at index 0", () => {
  const r = resolveLibraryRestoration(request(), {
    sectionExists: false, sectionGames: [], allGames: [],
  })
  assert.deepEqual(r, { category: "All", index: 0, resolvedGame: false })
})

test("a request with no usable fields at all degrades to the destination-only fallback", () => {
  const r = resolveLibraryRestoration(request({ focusGameId: null, sectionId: null, selectedIndex: null }), {
    sectionExists: false, sectionGames: [], allGames: ALL,
  })
  assert.deepEqual(r, { category: "All", index: 0, resolvedGame: false })
})

test("resolution is pure and deterministic -- repeated calls with the same inputs produce identical results", () => {
  const view = { sectionExists: true, sectionGames: RACING, allGames: ALL }
  const first = resolveLibraryRestoration(request(), view)
  const second = resolveLibraryRestoration(request(), view)
  assert.deepEqual(first, second)
})
