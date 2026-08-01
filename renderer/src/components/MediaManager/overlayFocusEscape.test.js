import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "MediaManager.jsx"), "utf8").replace(/\r\n/g, "\n")
const controlRoomJsx = readFileSync(join(HERE, "../ControlRoom/ControlRoom.jsx"), "utf8").replace(/\r\n/g, "\n")

test("Media Manager moves native focus to its visible Close control on open", () => {
  assert.match(jsx, /const closeBtnRef = useRef\(null\)/)
  assert.match(jsx, /closeBtnRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
  assert.match(jsx, /return \(\) => cancelAnimationFrame\(frame\)/)
  assert.match(jsx, /<button ref=\{closeBtnRef\} className=\{styles\.closeBtn\}/)
})

test("Media Manager Escape invokes the same close callback as the visible Close control", () => {
  const effect = jsx.slice(
    jsx.indexOf("const handleEscape = (event) => {"),
    jsx.indexOf("}, [])", jsx.indexOf("const handleEscape = (event) => {")),
  )
  assert.match(effect, /event\.key !== "Escape"/)
  assert.match(effect, /event\.preventDefault\(\)/)
  assert.match(effect, /event\.stopPropagation\(\)/)
  assert.match(effect, /onCloseRef\.current\?\.\(\)/)
  assert.doesNotMatch(effect, /setTab|setFilter|bulkCancelRef|scanLibrary/)
})

test("Media Manager Escape listener is registered once and cleaned up", () => {
  assert.match(jsx, /window\.addEventListener\("keydown", handleEscape\)\s*\n\s*return \(\) => window\.removeEventListener\("keydown", handleEscape\)\s*\n\s*\}, \[\]\)/)
  assert.match(jsx, /const onCloseRef = useRef\(onClose\)\s*\n\s*onCloseRef\.current = onClose/)
})

test("Media Manager Escape cannot bypass nested confirmation or active operations", () => {
  for (const state of [
    "showRestartConfirm", "showArtworkMgr", "bulkRunning", "autoFilling",
    "importingAll", "bezelFetching", "emScanning", "creatingFolders",
  ]) {
    assert.match(jsx, new RegExp(`escapeBlockedRef\\.current =[\\s\\S]*?${state}`))
  }
  assert.match(jsx, /Object\.values\(ytDownloading\)\.includes\('downloading'\)/)
  assert.match(jsx, /event\.defaultPrevented \|\| escapeBlockedRef\.current/)
})

test("Media Manager still closes through Control Room's exact origin-restoration path", () => {
  assert.match(controlRoomJsx, /<MediaManager[\s\S]*?onClose=\{closeStation\}/)
  assert.match(controlRoomJsx, /const closeStation = \(\) => \{\s*setActiveModule\(null\)\s*setActiveStationId\(null\)\s*const restore = restoreFocusRef\.current\s*if \(restore\) \{ setFocusZone\(restore\.zone\); setColumn\(restore\.column\) \}/)
})
