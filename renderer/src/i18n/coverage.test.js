// coverage.test.js ------------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project. Imports the
// real production dictionaries (en.js/es.js) and the real translate()
// helper from locale.js -- nothing here is a duplicated/restated
// translation table.
//
// Covers the localization coverage-expansion milestone: dictionary
// integrity (no duplicate keys, no orphaned Spanish-only keys, Spanish
// coverage of every English key except the one documented fallback) and
// representative switching behavior for every surface converted in this
// pass (Wheel dialogs, Settings, Achievements, Stats, Collections, Help,
// GameCard, SortMenu). Component JSX itself is not rendered here (no
// jsdom/@testing-library/react in this project -- see locale.test.js and
// context.test.js for the same limitation and why translate(locale, key)
// is the correct level to test at: t() in every component is nothing
// more than translate(locale, key, params) re-evaluated per render).

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { translate } from "./locale.js"
import en from "./en.js"
import es from "./es.js"

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = join(HERE, "..")

// Keys intentionally present only in en.js -- a real, documented gap, not
// an oversight. Spanish falls back to the English value for these.
const DOCUMENTED_FALLBACK_KEYS = new Set(["settings.subtitle"])

function readSrc(relPath) {
  return readFileSync(join(SRC_ROOT, relPath), "utf8")
}

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, exts, out)
    else if (exts.some(ext => entry.endsWith(ext))) out.push(full)
  }
  return out
}

// -- dictionary integrity -----------------------------------------------------

test("no duplicate keys in en.js source (JS object literals silently drop earlier duplicates)", () => {
  const src = readSrc("i18n/en.js")
  const keys = [...src.matchAll(/^\s*"([a-zA-Z0-9.]+)":/gm)].map(m => m[1])
  const seen = new Set()
  const dupes = keys.filter(k => (seen.has(k) ? true : (seen.add(k), false)))
  assert.deepEqual(dupes, [])
})

test("no duplicate keys in es.js source", () => {
  const src = readSrc("i18n/es.js")
  const keys = [...src.matchAll(/^\s*"([a-zA-Z0-9.]+)":/gm)].map(m => m[1])
  const seen = new Set()
  const dupes = keys.filter(k => (seen.has(k) ? true : (seen.add(k), false)))
  assert.deepEqual(dupes, [])
})

test("every Spanish key exists in English (no orphaned es-only keys)", () => {
  const orphans = Object.keys(es).filter(k => !(k in en))
  assert.deepEqual(orphans, [])
})

test("every English key has a Spanish translation, except the documented fallback keys", () => {
  const missing = Object.keys(en).filter(k => !(k in es) && !DOCUMENTED_FALLBACK_KEYS.has(k))
  assert.deepEqual(missing, [])
})

test("documented fallback keys are still real, non-empty English strings", () => {
  for (const key of DOCUMENTED_FALLBACK_KEYS) {
    assert.equal(typeof en[key], "string")
    assert.ok(en[key].length > 0)
  }
})

test("no dictionary value is empty, and no key uses an English sentence as its own name", () => {
  for (const [key, value] of Object.entries(en)) {
    assert.ok(value.length > 0, key + " has an empty English value")
    assert.ok(!/^[A-Z][a-z]+ [a-z]+ /.test(key), key + " looks like an English sentence used as a key")
  }
})

// -- common.* shared vocabulary ------------------------------------------------

test("common Yes/No/Back/Close/Cancel/Confirm translate correctly in both locales", () => {
  const pairs = [
    ["common.yes", "Yes", "Sí"],
    ["common.no", "No", "No"],
    ["common.back", "Back", "Volver"],
    ["common.close", "Close", "Cerrar"],
    ["common.cancel", "Cancel", "Cancelar"],
    ["common.confirm", "Confirm", "Confirmar"],
  ]
  for (const [key, enVal, esVal] of pairs) {
    assert.equal(translate("en", key), enVal)
    assert.equal(translate("es", key), esVal)
  }
})

// -- Wheel and launch dialogs --------------------------------------------------

test("Wheel exit dialog switches language", () => {
  assert.equal(translate("en", "wheel.confirmExitTitle"), "LEAVE VESPARA?")
  assert.equal(translate("es", "wheel.confirmExitTitle"), "¿ABANDONAR VESPARA?")
  assert.notEqual(translate("en", "wheel.confirmExitHint"), translate("es", "wheel.confirmExitHint"))
})

test("RetroArch confirmation switches language", () => {
  assert.equal(translate("en", "wheel.confirmRetroArchTitle"), "Open RetroArch?")
  assert.equal(translate("es", "wheel.confirmRetroArchTitle"), "¿Abrir RetroArch?")
  assert.notEqual(translate("en", "wheel.confirmRetroArchBody"), translate("es", "wheel.confirmRetroArchBody"))
})

test("empty-library messaging switches language", () => {
  assert.equal(translate("en", "wheel.libraryEmptyTitle"), "Your library is empty")
  assert.equal(translate("es", "wheel.libraryEmptyTitle"), "Tu biblioteca está vacía")
  assert.notEqual(translate("en", "wheel.libraryEmptySub"), translate("es", "wheel.libraryEmptySub"))
})

test("no-results messaging switches language and preserves the search term unchanged", () => {
  assert.equal(translate("en", "wheel.noResultsFor", { search: "pac-man" }), "No results for pac-man")
  assert.equal(translate("es", "wheel.noResultsFor", { search: "pac-man" }), "Sin resultados para pac-man")
  assert.notEqual(translate("en", "wheel.noGamesInCategory"), translate("es", "wheel.noGamesInCategory"))
})

test("launch-failure and missing-path messaging preserve dynamic paths exactly", () => {
  const winPath = "F:\\ArcadeGames\\MissingGame\\game.exe"
  assert.equal(translate("en", "errors.pathMissing", { path: winPath }), "Game exe not found. Check if the file has moved: " + winPath)
  assert.equal(translate("es", "errors.pathMissing", { path: winPath }), "No se encontró el ejecutable del juego. Comprueba si el archivo se movió: " + winPath)
  assert.equal(translate("en", "errors.gameFileNotFound", { path: winPath }).includes(winPath), true)
  assert.equal(translate("es", "errors.gameFileNotFound", { path: winPath }).includes(winPath), true)
  assert.notEqual(translate("en", "errors.notConfigured"), translate("es", "errors.notConfigured"))
})

// -- Settings -------------------------------------------------------------------

test("Settings headings switch language", () => {
  // "Audio" and "Pixelcade" (a product/brand name) are identical loanwords
  // in Spanish -- correct, natural translations that happen to match the
  // English spelling, not missed conversions. Every other heading differs.
  const IDENTICAL_BY_DESIGN = new Set(["settings.sectionAudio", "settings.sectionPixelcade"])
  const sectionKeys = [
    "settings.sectionEmulators", "settings.sectionPaths", "settings.sectionTpFolderRenamer",
    "settings.sectionDisplay", "settings.sectionTheme", "settings.sectionAudio",
    "settings.sectionCardArt", "settings.sectionMusic", "settings.sectionAttract",
    "settings.sectionPixelcade", "settings.sectionLinks", "settings.sectionArtwork",
    "settings.sectionLibrary", "settings.sectionBios", "settings.sectionAbout",
  ]
  for (const key of sectionKeys) {
    const enVal = translate("en", key)
    const esVal = translate("es", key)
    assert.ok(enVal.length > 0 && esVal.length > 0, key + " must have real values in both locales")
    if (!IDENTICAL_BY_DESIGN.has(key)) {
      assert.notEqual(enVal, esVal, key + " should differ between locales")
    }
  }
})

test("Settings buttons and dialogs switch language", () => {
  assert.equal(translate("en", "settings.resetToDefaults"), "Reset to defaults")
  assert.equal(translate("es", "settings.resetToDefaults"), "Restablecer valores predeterminados")
  assert.equal(translate("en", "settings.restartNow"), "Restart Now")
  assert.equal(translate("es", "settings.restartNow"), "Reiniciar ahora")
  assert.equal(translate("en", "settings.updateAvailable", { version: "v6.0.0" }), "Vespara v6.0.0 is available!")
  assert.equal(translate("es", "settings.updateAvailable", { version: "v6.0.0" }), "¡Vespara v6.0.0 ya está disponible!")
})

// -- Secondary surfaces -----------------------------------------------------

test("Achievements title and empty state switch language", () => {
  assert.equal(translate("en", "achievements.title"), "Achievements")
  assert.equal(translate("es", "achievements.title"), "Logros")
  assert.notEqual(translate("en", "achievements.empty"), translate("es", "achievements.empty"))
  assert.equal(translate("en", "achievements.unlocked", { count: 3 }), "Unlocked (3)")
  assert.equal(translate("es", "achievements.unlocked", { count: 3 }), "Desbloqueados (3)")
})

test("Stats title and empty state switch language", () => {
  assert.equal(translate("en", "stats.title"), "My Stats")
  assert.equal(translate("es", "stats.title"), "Mis estadísticas")
  assert.notEqual(translate("en", "stats.empty"), translate("es", "stats.empty"))
})

test("Collections controls switch language", () => {
  assert.equal(translate("en", "collections.title"), "Collections")
  assert.equal(translate("es", "collections.title"), "Colecciones")
  assert.equal(
    translate("en", "collections.addToCollection", { game: "Ms. Pac-Man" }),
    'Add "Ms. Pac-Man" to collection'
  )
  assert.equal(
    translate("es", "collections.addToCollection", { game: "Ms. Pac-Man" }),
    'Añadir "Ms. Pac-Man" a la colección'
  )
})

test("Help heading/navigation switches language", () => {
  assert.equal(translate("en", "help.title"), "Vespara Help")
  assert.equal(translate("es", "help.title"), "Ayuda de Vespara")
  assert.equal(translate("en", "help.sectionEmulators", { count: 18 }), "Supported Emulators (18)")
  assert.equal(translate("es", "help.sectionEmulators", { count: 18 }), "Emuladores compatibles (18)")
})

test("Game Card application-owned labels switch language", () => {
  assert.equal(translate("en", "gameCard.play"), "PLAY")
  assert.equal(translate("es", "gameCard.play"), "JUGAR")
  assert.equal(translate("en", "gameCard.launch"), "LAUNCH")
  assert.equal(translate("es", "gameCard.launch"), "INICIAR")
})

test("Sort Menu labels switch language", () => {
  const keys = ["sortMenu.title", "sortMenu.default", "sortMenu.mostPlayed", "sortMenu.topRated", "sortMenu.nameAZ"]
  for (const key of keys) {
    assert.notEqual(translate("en", key), translate("es", key), key + " should differ between locales")
  }
})

// -- dynamic content passes through unchanged ---------------------------------

test("dynamic game/profile/category names remain unchanged through interpolation", () => {
  const name = "Wario's Woods (USA) [Rev 1]"
  assert.ok(translate("en", "wheel.noResultsFor", { search: name }).includes(name))
  assert.ok(translate("es", "wheel.noResultsFor", { search: name }).includes(name))
  assert.ok(translate("en", "collections.removeFromCollection", { game: name }).includes(name))
  assert.ok(translate("es", "collections.removeFromCollection", { game: name }).includes(name))
})

// -- no component reads dictionaries directly ----------------------------------

test("no component or hook imports en.js or es.js directly -- only locale.js/I18nContext.js may", () => {
  const files = walk(join(SRC_ROOT, "components"), [".jsx", ".js"])
    .concat(walk(join(SRC_ROOT, "hooks"), [".jsx", ".js"]))
    .concat([join(SRC_ROOT, "App.jsx")])
    .filter(f => !f.endsWith(".test.js"))

  for (const file of files) {
    const src = readFileSync(file, "utf8")
    assert.doesNotMatch(src, /from\s*["'][^"']*\/i18n\/en(\.js)?["']/, file + " must not import en.js directly")
    assert.doesNotMatch(src, /from\s*["'][^"']*\/i18n\/es(\.js)?["']/, file + " must not import es.js directly")
  }
})
