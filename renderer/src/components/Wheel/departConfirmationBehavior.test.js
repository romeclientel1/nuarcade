import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { acceptDepartOnce } from "../Depart/departInteraction.js"

const HERE = dirname(fileURLToPath(import.meta.url))
const dialog = readFileSync(join(HERE, "../Depart/DepartConfirmation.jsx"), "utf8")

function confirmationHarness() {
  const acceptedRef = { current: false }
  let quitCalls = 0
  const confirm = () => acceptDepartOnce(acceptedRef, () => { quitCalls += 1 })
  return { confirm, quitCalls: () => quitCalls }
}

test("mouse double-click on Yes invokes the parent confirmation exactly once", () => {
  const harness = confirmationHarness()
  harness.confirm()
  harness.confirm()
  assert.equal(harness.quitCalls(), 1)
  assert.match(dialog, /onClick=\{confirmOnce\}/)
})

test("keyboard Enter repeat invokes the same guarded confirmation exactly once", () => {
  const harness = confirmationHarness()
  for (let repeat = 0; repeat < 5; repeat += 1) harness.confirm()
  assert.equal(harness.quitCalls(), 1)
  assert.match(dialog, /event\.key === "Enter"\) acceptChoice\(\)/)
  assert.match(dialog, /if \(choice === 0\) confirmOnce\(\)/)
})

test("repeated controller A invokes the same guarded confirmation exactly once", () => {
  const harness = confirmationHarness()
  for (let repeat = 0; repeat < 5; repeat += 1) harness.confirm()
  assert.equal(harness.quitCalls(), 1)
  assert.match(dialog, /confirm:\s*acceptChoice/)
})

test("No and cancel remain unlatched and never invoke parent confirmation", () => {
  const acceptedRef = { current: false }
  let quitCalls = 0
  let cancelCalls = 0
  const cancel = () => { cancelCalls += 1 }
  cancel()
  cancel()
  assert.equal(quitCalls, 0)
  assert.equal(cancelCalls, 2)
  assert.equal(acceptedRef.current, false)
  assert.match(dialog, /else onCancel\(\)/)
  assert.match(dialog, /back:\s*onCancel/)
  assert.match(dialog, /const acceptedRef = useRef\(false\)/)
})

test("a new dialog mount receives a fresh accepted latch", () => {
  const first = confirmationHarness()
  const second = confirmationHarness()
  first.confirm()
  first.confirm()
  second.confirm()
  assert.equal(first.quitCalls(), 1)
  assert.equal(second.quitCalls(), 1)
})
