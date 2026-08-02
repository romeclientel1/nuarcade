import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const wheel = readFileSync(join(HERE, "Wheel.jsx"), "utf8").replace(/\r\n/g, "\n")

test("Archive media becoming ready during Attract remains paused and muted", () => {
  const ready = wheel.slice(
    wheel.indexOf("const handleArchiveVideoReady"),
    wheel.indexOf("const [showVirtualKeyboard"),
  )
  const suspendedGuard = ready.indexOf("holdArchivePreviewWhileAttract")
  const playRequest = ready.indexOf("pending.playRequested = true")
  assert.ok(suspendedGuard >= 0 && suspendedGuard < playRequest)
  assert.match(ready, /if \(holdArchivePreviewWhileAttract\(attractPreviewMixRef\.current, element\)\) return/)
  assert.match(wheel, /autoPlay=\{!attractMode\}\s*\n\s*muted=\{attractMode\}/)
})

test("wake restores the captured Archive preview before retrying only the current pending request", () => {
  const mixEffect = wheel.slice(
    wheel.indexOf("// Attract Mode owns the Library soundscape"),
    wheel.indexOf("// Stop decoding and release both"),
  )
  assert.match(mixEffect, /controller\?\.leave\(\)[\s\S]*const pending = bgPendingRef\.current/)
  assert.match(mixEffect, /element\?\.readyState >= 3[\s\S]*handleArchiveVideoReady\(pending\.slot, pending\.requestId, pending\.source\)/)
  assert.match(wheel, /suspended: attractMode/)
})

test("late or replaced Archive readiness cannot revive a stale source", () => {
  const ready = wheel.slice(
    wheel.indexOf("const handleArchiveVideoReady"),
    wheel.indexOf("const [showVirtualKeyboard"),
  )
  assert.match(ready, /latest\.slot !== slot/)
  assert.match(ready, /latest\.requestId !== requestId/)
  assert.match(ready, /latest\.source !== source/)
  assert.match(ready, /element\.dataset\.archiveRequest !== String\(requestId\)/)
  assert.match(ready, /if \(element\.dataset\.archiveRequest === String\(requestId\)\) element\.pause\(\)/)
})
