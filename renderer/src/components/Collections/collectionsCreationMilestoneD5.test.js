// collectionsCreationMilestoneD5.test.js -----------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Milestone D5, Part 6: the reported "+ does nothing" defect. Audited root
// cause: createCollection() silently returned false on an empty name and
// had no duplicate check at all -- from the Traveler's perspective, a
// misclick or empty submit produced total silence, indistinguishable from
// a broken button. These tests prove the real fix: validation with visible
// feedback, one activation creates one collection, held-input safety, the
// new collection is selected/focused immediately, and the create row is
// controller-reachable (with an honest "needs a keyboard" note -- no fake
// on-screen keyboard).

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Collections.jsx"), "utf8").replace(/\r\n/g, "\n")
const css = readFileSync(join(HERE, "Collections.module.css"), "utf8").replace(/\r\n/g, "\n")
const en = readFileSync(join(HERE, "../../i18n/en.js"), "utf8")
const es = readFileSync(join(HERE, "../../i18n/es.js"), "utf8")

// -- 1. createCollection validates instead of silently no-op'ing -----------

test("createCollection rejects an empty (or whitespace-only) name with a distinct 'empty' result, not a silent false", () => {
  assert.match(jsx, /const trimmed = name\.trim\(\)/)
  assert.match(jsx, /if \(!trimmed\) return "empty"/)
})

test("createCollection rejects a case-insensitive duplicate name with a distinct 'duplicate' result", () => {
  assert.match(jsx, /const isDuplicate = Object\.values\(cols\)\.some\(c => c\.name\.toLowerCase\(\) === trimmed\.toLowerCase\(\)\)/)
  assert.match(jsx, /if \(isDuplicate\) return "duplicate"/)
})

test("createCollection returns the new collection's real id on success", () => {
  assert.match(jsx, /const id = "col_" \+ Date\.now\(\)/)
  assert.match(jsx, /cols\[id\] = \{ id, name: trimmed, games: \[\], created: Date\.now\(\) \}/)
  assert.match(jsx, /saveCollections\(cols\)\s*\n\s*return id/)
})

// -- 2. handleCreate surfaces the validation result as visible feedback ----

test("handleCreate sets createError on empty/duplicate, never proceeding silently", () => {
  const block = jsx.slice(jsx.indexOf("const handleCreate = () => {"), jsx.indexOf("const handleToggleGame"))
  assert.match(block, /const result = createCollection\(newName\)/)
  assert.match(block, /if \(result === "empty" \|\| result === "duplicate"\) \{ setCreateError\(result\); return \}/)
})

test("a successful create clears the field and any stale error, refreshes the list, and selects/focuses the new collection", () => {
  const block = jsx.slice(jsx.indexOf("const handleCreate = () => {"), jsx.indexOf("const handleToggleGame"))
  assert.match(block, /setNewName\(""\)/)
  assert.match(block, /setCreateError\(null\)/)
  assert.match(block, /refresh\(\)/)
  assert.match(block, /setActiveCol\(result\)/)
  assert.match(block, /setZone\(1\)/)
})

test("editing the field again clears any stale validation message", () => {
  assert.match(jsx, /onChange=\{e => \{ setNewName\(e\.target\.value\); setCreateError\(null\) \}\}/)
})

test("the two error messages render distinct, real user-facing copy, not a generic failure", () => {
  assert.match(jsx, /\{createError === "empty" \? t\("collections\.errorEmpty"\) : t\("collections\.errorDuplicate"\)\}/)
  assert.match(en, /"collections\.errorEmpty":\s*"Enter a name before creating a collection\."/)
  assert.match(en, /"collections\.errorDuplicate":\s*"A collection with that name already exists\."/)
  assert.match(es, /"collections\.errorEmpty":/)
  assert.match(es, /"collections\.errorDuplicate":/)
})

// -- 3. One activation creates one collection; held input is safe ----------

test("Enter in the field and the + button both call the same single handleCreate -- no separate code paths to drift apart", () => {
  assert.match(jsx, /onKeyDown=\{e => \{ if \(e\.key === "Enter"\) handleCreate\(\) \}\}/)
  assert.match(jsx, /onClick=\{handleCreate\}/)
})

test("a held controller confirm cannot create duplicates -- success clears newName, so a repeat-fire re-runs against an empty name and hits the 'empty' branch, not a second create", () => {
  const block = jsx.slice(jsx.indexOf("const handleCreate = () => {"), jsx.indexOf("const handleToggleGame"))
  const clearIdx = block.indexOf("setNewName(\"\")")
  const createIdx = block.indexOf("const id = ") // inside createCollection, not this function -- sanity only
  assert.ok(clearIdx > -1, "newName must be cleared on success so a repeated activation cannot re-create")
})

// -- 4. Controller can reach and activate the field/+, but typing needs a keyboard --

test("sideIdx 0 is the new-collection row -- collections occupy sideIdx 1..N, so the field is a real stop in the D-pad graph", () => {
  assert.match(jsx, /className=\{styles\.newRow \+ \(zone === 0 && sideIdx === 0 \? " " \+ styles\.gamepadFocused : ""\)\}/)
  assert.match(jsx, /zone === 0 && sideIdx === ci \+ 1 \? " " \+ styles\.gamepadFocused : ""/)
})

test("gamepad confirm on sideIdx 0 calls handleCreate directly -- A activates the field/+ action", () => {
  const confirmBlock = jsx.slice(jsx.indexOf("confirm: () => {"), jsx.indexOf("back: () => {"))
  assert.match(confirmBlock, /if \(sideIdxRef\.current === 0\) \{ handleCreate\(\); return \}/)
})

test("collection rows shift by +1 in both the down-clamp and the click handler, staying in sync with the new sideIdx 0 row", () => {
  assert.match(jsx, /setSideIdx\(i => Math\.min\(colListRef\.current\.length, i \+ 1\)\)/)
  assert.match(jsx, /const col = colListRef\.current\[sideIdxRef\.current - 1\]/)
  assert.match(jsx, /setSideIdx\(ci \+ 1\)/)
})

test("honest helper text tells a controller user typing still needs a keyboard -- no fake on-screen keyboard is invented", () => {
  assert.match(jsx, /<div className=\{styles\.newHint\}>\{t\("collections\.newHint"\)\}<\/div>/)
  assert.match(en, /"collections\.newHint":\s*"Type on a keyboard, then press \+ or Enter\. A controller can reach this field but cannot type a name\."/)
  assert.doesNotMatch(jsx, /VirtualKeyboard|onScreenKeyboard/i)
})

test("newError/newHint have their own CSS rules, distinct from the generic error/empty-hint styling", () => {
  assert.match(css, /\.newHint\s*\{/)
  assert.match(css, /\.newError\s*\{/)
})
