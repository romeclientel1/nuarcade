import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Settings.jsx"), "utf8").replace(/\r\n/g, "\n")
const controlRoomJsx = readFileSync(join(HERE, "../ControlRoom/ControlRoom.jsx"), "utf8").replace(/\r\n/g, "\n")

test("Settings moves native focus to its visible Close control once content mounts", () => {
  assert.match(jsx, /const closeBtnRef = useRef\(null\)/)
  assert.match(jsx, /if \(!config \|\| hasFocusedOverlayRef\.current\) return/)
  assert.match(jsx, /closeBtnRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
  assert.match(jsx, /return \(\) => cancelAnimationFrame\(frame\)/)
  assert.match(jsx, /<button ref=\{closeBtnRef\} className=\{styles\.closeBtn\}/)
})

test("Settings Escape invokes the existing close callback without saving", () => {
  const effect = jsx.slice(
    jsx.indexOf("const handleEscape = (event) => {"),
    jsx.indexOf("}, [])", jsx.indexOf("const handleEscape = (event) => {")),
  )
  assert.match(effect, /event\.key !== "Escape"/)
  assert.match(effect, /event\.preventDefault\(\)/)
  assert.match(effect, /event\.stopPropagation\(\)/)
  assert.match(effect, /onCloseRef\.current\?\.\(\)/)
  assert.doesNotMatch(effect, /handleSave|saveRef|setConfig|loadConfig/)
})

test("Settings Escape listener is registered once and cleaned up with the same handler", () => {
  assert.match(jsx, /window\.addEventListener\("keydown", handleEscape\)\s*\n\s*return \(\) => window\.removeEventListener\("keydown", handleEscape\)\s*\n\s*\}, \[\]\)/)
  assert.match(jsx, /const onCloseRef = useRef\(onClose\)\s*\n\s*onCloseRef\.current = onClose/)
})

test("Settings does not bypass its restart, controller-test, or artwork child overlay", () => {
  assert.match(jsx, /nestedOverlayRef\.current = showRestartConfirm \|\| showControllerTest \|\| showArtworkMgr/)
  assert.match(jsx, /event\.defaultPrevented \|\| nestedOverlayRef\.current/)
})

test("Settings still closes through Control Room's existing focus-restoring parent path", () => {
  assert.match(controlRoomJsx, /<Settings[\s\S]*?onClose=\{closeStation\}/)
  assert.match(controlRoomJsx, /const closeStation = \(\) => \{\s*setActiveModule\(null\)\s*setActiveStationId\(null\)\s*const restore = restoreFocusRef\.current\s*if \(restore\) \{ setFocusZone\(restore\.zone\); setColumn\(restore\.column\) \}/)
})
