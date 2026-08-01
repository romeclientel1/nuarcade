import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const homeJsx = fs.readFileSync(path.join(ROOT, "VesparaHome.jsx"), "utf8").replace(/\r\n/g, "\n")
const appJsx = fs.readFileSync(path.join(ROOT, "../../App.jsx"), "utf8").replace(/\r\n/g, "\n")

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex)
  assert.ok(startIndex >= 0, `missing start anchor: ${start}`)
  assert.ok(endIndex > startIndex, `missing end anchor after start: ${end}`)
  return source.slice(startIndex, endIndex)
}

test("Sanctuary registers every destination in a stable action ref map while retaining Depart's restoration ref", () => {
  assert.match(homeJsx, /const actionRefs = useRef\(\{\}\)/)
  assert.match(homeJsx, /const setActionRef = useCallback\(\(action, node\) => \{/)
  assert.match(homeJsx, /actionRefs\.current\[action\] = node/)
  assert.match(homeJsx, /ref=\{action === "depart" \? departTriggerRef : undefined\}/)
  assert.match(homeJsx, /ref=\{\(node\) => setActionRef\(action, node\?\.parentElement \|\| null\)\}/)
  assert.match(homeJsx, /const ACTIONS = \["library", "controlRoom", "switchPlayer", "depart"\]/)
})

test("the existing Sanctuary selection state is projected onto real DOM focus", () => {
  const effect = sliceBetween(
    homeJsx,
    "// Keep the browser's real focus synchronized",
    "  const runAction = useCallback",
  )

  assert.match(effect, /if \(loading \|\| showDepartConfirm \|\| needsControllerPrompt\) return/)
  assert.match(effect, /focusZone === "actions"/)
  assert.match(effect, /const action = ACTIONS\[actionIndex\]/)
  assert.match(effect, /actionRefs\.current\[action\]/)
  assert.match(effect, /focusedRecentCardRef\.current/)
  assert.match(effect, /if \(!target \|\| target\.disabled \|\| document\.activeElement === target\) return/)
  assert.match(effect, /target\.focus\(\{ preventScroll: true \}\)/)
  assert.match(effect, /requestAnimationFrame/)
  assert.match(effect, /cancelAnimationFrame\(frame\)/)
  assert.match(effect, /\[focusZone, recentIndex, actionIndex, loading, showDepartConfirm, needsControllerPrompt\]/)
  assert.doesNotMatch(effect, /querySelector/, "focus must resolve from the selected ref, not a broad DOM query")
})

test("the selected Recent or destination button is the sole current semantic", () => {
  const currentBindings = homeJsx.match(/aria-current=\{focused \? "true" : undefined\}/g) || []
  assert.equal(currentBindings.length, 2, "Recent and destination buttons must share the same selected-state semantic")
  assert.match(homeJsx, /const focused = focusZone === "recents" && i === recentIndex/)
  assert.match(homeJsx, /const focused = focusZone === "actions" && i === actionIndex/)
})

test("existing Traveler and Guest arrival preserve the same Sanctuary-derived focus path", () => {
  const playerSelect = sliceBetween(appJsx, "const handlePlayerSelect", "  const handleGuest")
  const guestSelect = sliceBetween(appJsx, "const handleGuest", "  const handleAddProfile")
  assert.match(playerSelect, /selectProfile\(player\.id\)/)
  assert.match(playerSelect, /setPhase\("main"\)/)
  assert.match(guestSelect, /selectGuest\(\)/)
  assert.match(guestSelect, /setPhase\("main"\)/)
  assert.doesNotMatch(playerSelect + guestSelect, /setActionIndex|focus\(/)
  assert.match(homeJsx, /if \(initialFocus\.type === "setup-connection"\)[\s\S]*?ACTIONS\.indexOf\("controlRoom"\)/)
})

test("Library and Control Room returns provide exact one-shot Sanctuary focus hints", () => {
  const libraryReturn = sliceBetween(appJsx, "const handleReturnHomeFromWheel", "  // Same-session destination returns")
  const controlRoomReturn = sliceBetween(appJsx, "const handleReturnHomeFromControlRoom", "\n\n  return (")
  assert.match(libraryReturn, /setHomeFocusHint\("library"\)/)
  assert.match(libraryReturn, /goToSurfaceRoot\(\)/)
  assert.match(controlRoomReturn, /setHomeFocusHint\("controlRoom"\)/)
  assert.match(controlRoomReturn, /goToSurfaceRoot\(\)/)
  assert.match(appJsx, /initialFocusHint=\{homeFocusHint\}/)
  assert.match(homeJsx, /const idx = ACTIONS\.indexOf\(initialFocusHint\)/)
  assert.match(homeJsx, /onFocusHintConsumed\?\.\(\)/)
})

test("Depart cancellation retains its exact trigger while nested prompts retain focus ownership", () => {
  assert.match(homeJsx, /ref=\{action === "depart" \? departTriggerRef : undefined\}/)
  assert.match(homeJsx, /departTriggerRef\.current\?\.focus\(\)/)
  assert.match(homeJsx, /if \(loading \|\| showDepartConfirm \|\| needsControllerPrompt\) return/)
  assert.match(homeJsx, /enabled: !showDepartConfirm && !needsControllerPrompt/)
})
