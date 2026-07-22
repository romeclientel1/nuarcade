// launchLabel.test.js -----------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Wheel.jsx/GameDetail.jsx cannot be imported here (JSX, no DOM/React-hook
// harness -- see Wheel.test.js's own limitations note for the same
// constraint). These are source-level structural assertions proving the
// player-facing launch-button label correction: every game -- RetroArch,
// other emulators, native executables -- shows the same generic "Launch
// Game" label (wheel.launchGame), never a RetroArch-specific label or a
// raw English literal. RetroArch dispatch, confirmation, and the
// launch-payload emulator-selection logic are proven untouched.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const wheelJsx = readFileSync(join(HERE, "components/Wheel/Wheel.jsx"), "utf8")
const gameDetailJsx = readFileSync(join(HERE, "components/GameDetail/GameDetail.jsx"), "utf8")
const gameLauncherSrc = readFileSync(join(HERE, "hooks/useGameLauncher.js"), "utf8")
const en = readFileSync(join(HERE, "i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "i18n/es.js"), "utf8")

// -- the label itself: generic key, no RetroArch branch, no raw literal --------

test("Wheel's primary launch label no longer branches on emulator === retroarch -- a RetroArch-backed game uses the same wheel.launchGame key as every other game", () => {
  assert.match(wheelJsx, /\{launching \? t\("wheel\.launching"\) : current\.isPinball \? t\("wheel\.launchTable"\) : t\("wheel\.launchGame"\)\}/)
  assert.doesNotMatch(wheelJsx, /current\.emulator === "retroarch" \? t\("wheel\.launchRetroArch"\)/)
})

test("GameDetail's primary launch label no longer branches on emulator === retroarch -- same generic wheel.launchGame key", () => {
  assert.match(gameDetailJsx, /\{launching \? t\("wheel\.launching"\) : game\.isPinball \? t\("wheel\.launchTable"\) : t\("wheel\.launchGame"\)\}/)
  assert.doesNotMatch(gameDetailJsx, /game\.emulator === "retroarch" \? t\("wheel\.launchRetroArch"\)/)
})

test("neither launch-label call site references the removed wheel.launchRetroArch key at all", () => {
  assert.doesNotMatch(wheelJsx, /wheel\.launchRetroArch/)
  assert.doesNotMatch(gameDetailJsx, /wheel\.launchRetroArch/)
})

test("no raw English literal was introduced for the launch label -- both sites route through t(...)", () => {
  assert.doesNotMatch(wheelJsx, />Launch Game</)
  assert.doesNotMatch(gameDetailJsx, />Launch Game</)
})

// -- the removed key has no remaining consumer, in either locale ---------------

test("wheel.launchRetroArch is removed from both locale files -- no remaining valid consumer", () => {
  assert.doesNotMatch(en, /"wheel\.launchRetroArch"/)
  assert.doesNotMatch(es, /"wheel\.launchRetroArch"/)
})

// -- English and Spanish both resolve the generic key correctly ----------------

test("wheel.launchGame is exactly \"Launch Game\" (en) and \"Iniciar juego\" (es)", () => {
  assert.match(en, /"wheel\.launchGame": "Launch Game"/)
  assert.match(es, /"wheel\.launchGame": "Iniciar juego"/)
})

// -- RetroArch dispatch, confirmation, and launch-payload logic are untouched --

test("RetroArch confirmation dialog copy (wheel.confirmRetroArchTitle/Body) still names RetroArch -- that's a technical confirmation, not the primary label, and is explicitly out of scope for this correction", () => {
  assert.match(en, /"wheel\.confirmRetroArchTitle": "Open RetroArch\?"/)
  assert.match(es, /"wheel\.confirmRetroArchTitle": "¿Abrir RetroArch\?"/)
})

test("RetroArch launch dispatch (window.nuarcade.launchRetroArch) is unchanged in Wheel.jsx", () => {
  assert.match(wheelJsx, /if \(retroArchChoiceRef\.current === 0\) \{ sounds\.launch\(\); window\.nuarcade\?\.launchRetroArch\?\.\(\) \}/)
})

test("useGameLauncher's emulator-selection/launch-payload branch for retroarch is unchanged", () => {
  assert.match(gameLauncherSrc, /else if \(emu === "retroarch"\)\s+launchResult = await window\.nuarcade\.launchRetroArchGame\(gamePath, game\.core, session\.id\)/)
})
