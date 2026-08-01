import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const jsx = readFileSync(join(HERE, "Settings.jsx"), "utf8")

test("Media Restoration is accepted as a focused Settings station", () => {
  assert.match(
    jsx,
    /'section-media-restoration':\s*\{\s*labelKey:\s*'controlRoom\.station\.mediaRestorationLabel',\s*hintKey:\s*'controlRoom\.station\.mediaRestorationHint'\s*\}/,
  )
  assert.match(jsx, /stationSectionClass\('section-library', 'section-media-restoration'\)/)
})

test("Media Restoration keeps its exact anchor and isolates the existing controls", () => {
  assert.match(
    jsx,
    /className=\{stationSubsectionClass\('section-media-restoration'\)\}\s+id="section-media-restoration"/,
  )
  assert.match(jsx, /onClick=\{handleFindOrphans\}/)
  assert.match(jsx, /onClick=\{handleCleanupOrphans\}/)
  assert.match(jsx, /onClick=\{handleBackup\}/)
  assert.match(jsx, /onClick=\{handleRestore\}/)
})
