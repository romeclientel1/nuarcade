// coverage3.test.js -----------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project. Imports the
// real production dictionaries and translate() helper -- nothing here is a
// duplicated/restated translation table.
//
// Covers the two new Settings labels added by the Sound & Tactile Feedback
// milestone (UI sounds on/off, UI sound volume). Generic dictionary
// integrity (no duplicate keys, full Spanish coverage except documented
// fallbacks, no direct en.js/es.js imports anywhere) is already covered by
// coverage.test.js's walk-based checks, which apply to the whole dictionary
// regardless of which milestone added a given key -- not repeated here.

import { test } from "node:test"
import assert from "node:assert/strict"
import { translate } from "./locale.js"

test("settings.uiSounds switches language and is a real, non-empty label in both locales", () => {
  const en = translate("en", "settings.uiSounds")
  const es = translate("es", "settings.uiSounds")
  assert.ok(en.length > 0 && !en.startsWith("[["))
  assert.ok(es.length > 0 && !es.startsWith("[["))
  assert.notEqual(en, es)
})

test("settings.uiSoundVolume switches language and is a real, non-empty label in both locales", () => {
  const en = translate("en", "settings.uiSoundVolume")
  const es = translate("es", "settings.uiSoundVolume")
  assert.ok(en.length > 0 && !en.startsWith("[["))
  assert.ok(es.length > 0 && !es.startsWith("[["))
  assert.notEqual(en, es)
})
