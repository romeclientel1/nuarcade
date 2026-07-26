import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "VesparaHome.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "VesparaHome.module.css"), "utf8").replace(/\r\n/g, "\n")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")

test("the Vespara world layer is decorative and non-focusable", () => {
  assert.match(jsx, /<div className=\{styles\.worldLayer\} aria-hidden="true">/)
  for (const className of ["sanctuaryPlate", "environmentVeil"]) {
    assert.match(jsx, new RegExp(`styles\\.${className}`))
  }
  assert.match(css, /\.worldLayer[\s\S]*pointer-events:\s*none/)
})

test("Home presents Vespara and the Sanctuary through localized keys", () => {
  assert.match(jsx, /t\("home\.worldName"\)/)
  assert.match(jsx, /t\("home\.sanctuary"\)/)
  assert.match(en, /"home\.worldName":\s*"VESPARA"/)
  assert.match(es, /"home\.worldName":\s*"VESPARA"/)
})

// Updated for Control Room Milestone C2, which adds "controlRoom" as a
// fourth, authorized Sanctuary destination between library and
// switchPlayer -- library/switchPlayer/depart's own IDs, order relative to
// each other, and handlers are otherwise unchanged.
test("existing action IDs and order remain unchanged, plus the new Control Room destination", () => {
  assert.match(jsx, /const ACTIONS = \["library", "controlRoom", "switchPlayer", "depart"\]/)
  assert.match(jsx, /ACTIONS\.map\(\(action, i\) =>/)
})

test("existing action handlers remain unchanged, plus the new Control Room handler", () => {
  assert.match(jsx, /if \(action === "library"\) onEnterLibrary\?\.\(\)/)
  assert.match(jsx, /else if \(action === "controlRoom"\) onEnterControlRoom\?\.\(\)/)
  assert.match(jsx, /else if \(action === "switchPlayer"\) onSwitchPlayer\?\.\(\)/)
  assert.match(jsx, /else if \(action === "depart"\) \{ setDepartChoice\(1\); setShowDepartConfirm\(true\) \}/)
})

test("Recently Played remains a direct launch surface", () => {
  assert.match(jsx, /displayedRecentGames\.map\(\(g, i\) =>/)
  assert.match(jsx, /onClick=\{\(\) => \{ acceptManualFocus\(\); setFocusZone\("recents"\); setRecentIndex\(i\); launch\(g\) \}\}/)
})

test("no Settings or Media destination is added", () => {
  const actions = jsx.match(/const ACTIONS = \[([^\]]+)\]/)?.[1] || ""
  assert.doesNotMatch(actions, /settings|media/i)
})

test("destination controls retain explicit focus-visible styling", () => {
  assert.match(css, /\.actionBtn:focus-visible\s*\{/)
  assert.match(css, /\.recentCard:focus-visible\s*\{/)
  assert.match(jsx, /className=\{styles\.actionBtn \+ " " \+ styles\[action \+ "Destination"\]/)
})

test("reduced motion neutralizes world animation without removing focus", () => {
  const reducedBlocks = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) || []
  const reduced = reducedBlocks.join("\n")
  assert.match(reduced, /\.home/)
  assert.match(reduced, /animation:\s*none/)
  assert.doesNotMatch(reduced, /outline:\s*none/)
})

test("Depart language is Vespara-facing in both locales", () => {
  assert.match(en, /"home\.confirmDepartTitle":\s*"LEAVE VESPARA\?"/)
  assert.match(es, /"home\.confirmDepartTitle":\s*"¿ABANDONAR VESPARA\?"/)
})
