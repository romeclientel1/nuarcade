import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { resolveDepartInvoker, restoreDepartFocus } from "../Depart/departInteraction.js"

const HERE = dirname(fileURLToPath(import.meta.url))
const wheel = readFileSync(join(HERE, "Wheel.jsx"), "utf8")

function focusable(name) {
  return {
    name,
    focusCalls: 0,
    focus() { this.focusCalls += 1 },
  }
}

function restore(element) {
  const queued = []
  restoreDepartFocus(element, (callback) => queued.push(callback))
  assert.equal(element.focusCalls, 0)
  queued.shift()()
}

test("Console mouse cancellation restores the exact clicked Depart button", () => {
  const clicked = focusable("console Depart")
  const fixed = focusable("fixed Depart")
  const resolved = resolveDepartInvoker({ currentTarget: clicked }, null, fixed)
  restore(resolved)
  assert.equal(clicked.focusCalls, 1)
  assert.equal(fixed.focusCalls, 0)
})

test("Console keyboard cancellation restores the exact activated Depart button", () => {
  const activated = focusable("console Depart")
  const fixed = focusable("fixed Depart")
  const resolved = resolveDepartInvoker({ currentTarget: activated }, null, fixed)
  restore(resolved)
  assert.equal(activated.focusCalls, 1)
  assert.equal(fixed.focusCalls, 0)
})

test("Console controller cancellation resolves its dedicated ref without fixed-plaque fallback", () => {
  const consoleDepart = focusable("console Depart")
  const fixed = focusable("fixed Depart")
  const resolved = resolveDepartInvoker(undefined, consoleDepart, fixed)
  restore(resolved)
  assert.equal(consoleDepart.focusCalls, 1)
  assert.equal(fixed.focusCalls, 0)
})

test("Wheel wires controller Console activation to the dedicated ref and leaves Console state intact", () => {
  assert.match(wheel, /const consoleDepartRef = useRef\(null\)/)
  assert.match(wheel, /ref=\{consoleDepartRef\}[\s\S]*?className=\{styles\.consoleDepartBtn/)
  assert.match(wheel, /\(\) => openDepart\(consoleDepartRef\.current\),\s*\/\/ 11 Depart/)
  assert.match(wheel, /consoleVisible \? consoleDepartRef\.current : null/)
  assert.match(wheel, /restoreDepartFocus\(departInvokerRef\.current\)/)

  const cancelBlock = wheel.slice(
    wheel.indexOf("const cancelDepart = useCallback"),
    wheel.indexOf("const chooseDepart = useCallback")
  )
  assert.doesNotMatch(cancelBlock, /setConsoleOpen\(false\)|setFocusZone/)
})
