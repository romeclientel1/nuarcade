// scannerCategoryRepair.test.js -----------------------------------------------
// Functional regression coverage for the fix/library-system-tabs repair:
// Pinball scanning (previously a call to an undefined scanPinballTables) and
// the Original Xbox scanner's system field (previously bare 'Xbox', with no
// matching Library tab at all).
//
// Unlike the source-string checks in the Wheel test files (Wheel.jsx is JSX
// and can't be imported under plain `node --test`), scanner.js is a plain
// CommonJS module and CAN be required directly here -- its only obstacle is
// that config.js does `require('electron')` at module load time. This test
// stubs 'electron' via the same Module._load interception index.test.js
// already uses, then requires the real scanner.js and calls the real
// scanPinballTables/scanXboxGames against real temp-directory fixtures, so
// these assertions are actual behavior, not just a source-text match.

const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const Module = require("node:module")

function loadScanner() {
  const electronMock = { app: { getPath: () => os.tmpdir() } }
  const originalLoad = Module._load
  Module._load = function(request, parent, isMain) {
    if (request === "electron") return electronMock
    return originalLoad.apply(this, arguments)
  }
  try {
    delete require.cache[require.resolve("./scanner.js")]
    delete require.cache[require.resolve("./config.js")]
    return require("./scanner.js")
  } finally {
    Module._load = originalLoad
  }
}

const scanner = loadScanner()

function makeTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

// -- Pinball ------------------------------------------------------------

test("scanPinballTables is exported and is a function", () => {
  assert.equal(typeof scanner.scanPinballTables, "function")
})

test("scanPinballTables finds .vpx files and tags them system/genre 'Pinball', emulator 'vpx'", async () => {
  const dir = makeTmpDir("vespara-pinball-")
  try {
    fs.writeFileSync(path.join(dir, "Medieval Madness.vpx"), "")
    fs.writeFileSync(path.join(dir, "Attack From Mars.vpx"), "")
    fs.writeFileSync(path.join(dir, "readme.txt"), "not a table")

    const result = await scanner.scanPinballTables(dir)
    assert.equal(result.count, 2)
    assert.equal(result.games.length, 2)
    for (const game of result.games) {
      assert.equal(game.system, "Pinball")
      assert.equal(game.genre, "Pinball")
      assert.equal(game.emulator, "vpx")
      assert.ok(game.path.endsWith(".vpx"))
      assert.ok(fs.existsSync(game.path), "game.path should point at the real file scanPinballTables found")
    }
    assert.deepEqual(result.games.map(g => g.title).sort(), ["Attack From Mars", "Medieval Madness"])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("scanPinballTables ignores non-.vpx files and reports 0 for an empty/missing folder", async () => {
  const dir = makeTmpDir("vespara-pinball-empty-")
  try {
    fs.writeFileSync(path.join(dir, "notes.txt"), "")
    const result = await scanner.scanPinballTables(dir)
    assert.equal(result.count, 0)
    assert.deepEqual(result.games, [])

    const missing = await scanner.scanPinballTables(path.join(dir, "does-not-exist"))
    assert.equal(missing.count, 0)
    assert.ok(missing.error)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// -- Original Xbox --------------------------------------------------------

test("scanXboxGames tags both disc-image (Xemu) and extracted (Cxbx-Reloaded) titles system: 'Original Xbox'", async () => {
  const dir = makeTmpDir("vespara-xbox-")
  try {
    // Disc image -> Xemu
    fs.writeFileSync(path.join(dir, "Halo.iso"), "")
    // Extracted game folder with its own .xbe -> Cxbx-Reloaded
    const extractedDir = path.join(dir, "Jet Set Radio Future")
    fs.mkdirSync(extractedDir)
    fs.writeFileSync(path.join(extractedDir, "default.xbe"), "")

    const result = await scanner.scanXboxGames(dir)
    assert.equal(result.games.length, 2)

    const halo = result.games.find(g => g.title === "Halo")
    const jsrf = result.games.find(g => g.title === "Jet Set Radio Future")
    assert.ok(halo, "expected the .iso title to be scanned")
    assert.ok(jsrf, "expected the extracted .xbe title to be scanned")

    // Both share one system/category value -- this is the actual fix: prior
    // to it, both were 'Xbox', which has no CATEGORIES entry in Wheel.jsx
    // at all, so neither ever appeared in a Library tab.
    assert.equal(halo.system, "Original Xbox")
    assert.equal(jsrf.system, "Original Xbox")

    // Launch-routing distinction is untouched: still keyed off `emulator`,
    // still xemu for disc images and cxbx for extracted games.
    assert.equal(halo.emulator, "xemu")
    assert.equal(jsrf.emulator, "cxbx")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
