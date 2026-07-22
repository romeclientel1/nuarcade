// context.test.js ------------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project.
//
// Proves the specific property this module split exists for: I18nContext.js
// (the context object + useI18n hook) is plain JS with zero JSX, so a
// native `node --test` process -- with no Vite/Babel transform available --
// can import it directly, including transitively through plain hook
// modules like useGameLauncher.js. I18nProvider.jsx (the actual JSX
// provider component) is NOT imported here for the same reason
// useGameLauncher.jsx itself never is elsewhere in this suite: Node's
// native loader cannot parse JSX. Its behavior is covered indirectly --
// I18nProvider.jsx's own logic (locale resolution, persistence, t())
// is the same plain locale.js machinery already covered directly in
// locale.test.js.
//
// Some assertions below are static source scans rather than live imports
// specifically so "no duplicate context instance" and "no JSX-file import"
// are provable without needing React installed at all -- they hold on this
// exact committed source regardless of the local sandbox's dependency
// state, and would fail loudly if a future edit reintroduced the bug this
// split fixes.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_SRC = join(HERE, "..")

function read(relPath) {
  return readFileSync(join(REPO_SRC, relPath), "utf8")
}

// -- I18nContext.js is real, importable, JSX-free ----------------------------

test("I18nContext.js is importable directly by Node with React installed (JSX-free) -- Node's own parser is the authoritative JSX check: this import throws if the file (or anything it imports) contains real JSX", async () => {
  const mod = await import("./I18nContext.js")
  assert.equal(typeof mod.I18nContext, "object")
  assert.equal(typeof mod.useI18n, "function")
})

// -- exactly one context instance, shared by provider and consumers ---------

test("exactly one createContext(...) call exists across the i18n module set -- no duplicate context instance", () => {
  const files = ["i18n/I18nContext.js", "i18n/I18nProvider.jsx", "i18n/locale.js"]
  const occurrences = files.flatMap(f => {
    const src = read(f)
    return (src.match(/createContext\(/g) || []).map(() => f)
  })
  assert.deepEqual(occurrences, ["i18n/I18nContext.js"])
})

test("I18nProvider.jsx imports the shared I18nContext from I18nContext.js instead of defining its own", () => {
  const src = read("i18n/I18nProvider.jsx")
  assert.match(src, /import\s*\{\s*I18nContext\s*\}\s*from\s*["']\.\/I18nContext\.js["']/)
})

// -- consumers import useI18n from the JSX-free module -----------------------

test("useGameLauncher.js and every i18n-consuming component import useI18n from the JSX-free I18nContext.js, never from I18nProvider.jsx", () => {
  const consumers = [
    "hooks/useGameLauncher.js",
    "components/Settings/Settings.jsx",
    "components/PlayerSelect/PlayerSelect.jsx",
    "components/VesparaHome/VesparaHome.jsx",
    "components/Wheel/Wheel.jsx",
  ]
  for (const file of consumers) {
    const src = read(file)
    assert.match(src, /from\s*["'][^"']*I18nContext\.js["']/, file + " must import useI18n from I18nContext.js")
    assert.doesNotMatch(src, /I18nProvider/, file + " must not reference I18nProvider directly -- only main.jsx wraps the tree")
  }
})

test("useGameLauncher.js has no transitive .jsx import in its own import statements", () => {
  const src = read("hooks/useGameLauncher.js")
  const importLines = src.match(/^import .*$/gm) || []
  for (const line of importLines) {
    assert.doesNotMatch(line, /\.jsx["']/, "useGameLauncher.js must not import a .jsx file: " + line)
  }
})

test("main.jsx imports I18nProvider from the JSX provider module", () => {
  const src = read("main.jsx")
  assert.match(src, /import\s*\{\s*I18nProvider\s*\}\s*from\s*["']\.\/i18n\/I18nProvider\.jsx["']/)
})
