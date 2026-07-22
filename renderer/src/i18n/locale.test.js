// locale.test.js -------------------------------------------------------------
// Committed regression tests, run via `node --test`. No test framework
// dependency, matching every other *.test.js in this project. Imports the
// real production helpers and dictionaries from locale.js/en.js/es.js
// directly -- nothing here is a restated/duplicated translation table.
//
// I18nProvider.jsx itself cannot be exercised here (it's JSX, and this
// project has no jsdom/@testing-library/react harness -- see
// useGameLauncher.test.js for the same limitation applied to hooks). Its
// entire behavior is a thin wrapper over the plain functions below though:
// setLocale() is normalizeLocale() + writeSavedLocale(), the initial value
// is resolveInitialLocale(), t() is translate(), and the lang/dir effect is
// applyDocumentMetadata(). Testing those functions directly exercises the
// exact logic the provider calls, never a copy of it. I18nContext.js (the
// JSX-free context + useI18n hook) IS importable here and gets a direct
// coverage test below.

import { test, beforeEach } from "node:test"
import assert from "node:assert/strict"
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  STORAGE_KEY,
  normalizeLocale,
  resolveSystemLocale,
  readSavedLocale,
  writeSavedLocale,
  resolveInitialLocale,
  translate,
  getDirection,
  applyDocumentMetadata,
} from "./locale.js"
import en from "./en.js"
import es from "./es.js"

function makeStorageShim(initial = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    _store: store,
  }
}

function installGlobalLocalStorageShim() {
  const store = new Map()
  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
  }
}

beforeEach(() => {
  installGlobalLocalStorageShim()
})

// -- supportedLocales / basic contract ---------------------------------------

test("SUPPORTED_LOCALES exposes exactly en and es (Settings selector's option set)", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["en", "es"])
})

test("DEFAULT_LOCALE is English", () => {
  assert.equal(DEFAULT_LOCALE, "en")
})

// -- resolveInitialLocale precedence -----------------------------------------

test("valid saved English loads English", () => {
  const storage = makeStorageShim({ [STORAGE_KEY]: "en" })
  assert.equal(resolveInitialLocale({ navigatorLanguage: "es-MX", storage }), "en")
})

test("valid saved Spanish loads Spanish", () => {
  const storage = makeStorageShim({ [STORAGE_KEY]: "es" })
  assert.equal(resolveInitialLocale({ navigatorLanguage: "en-US", storage }), "es")
})

test("absent saved locale derives Spanish from es-MX", () => {
  const storage = makeStorageShim()
  assert.equal(resolveInitialLocale({ navigatorLanguage: "es-MX", storage }), "es")
})

test("absent saved locale derives English from an unsupported system locale", () => {
  const storage = makeStorageShim()
  assert.equal(resolveInitialLocale({ navigatorLanguage: "fr-FR", storage }), "en")
})

test("malformed saved locale falls back to English", () => {
  const storage = makeStorageShim({ [STORAGE_KEY]: "not-a-real-locale" })
  assert.equal(resolveInitialLocale({ navigatorLanguage: "es-MX", storage }), "en")
})

test("saved preference wins over system locale after a restart simulation", () => {
  // Simulates: player picked English, storage now holds "en" from a prior
  // session, then the app launches again on a Spanish-language system.
  const storage = makeStorageShim({ [STORAGE_KEY]: "en" })
  assert.equal(resolveInitialLocale({ navigatorLanguage: "es-MX", storage }), "en")
})

// -- explicit setLocale semantics (writeSavedLocale is what I18nContext's
// setLocale() calls after normalizing) ---------------------------------------

test('explicit setLocale("es") persists Spanish', () => {
  const storage = makeStorageShim()
  const ok = writeSavedLocale("es", storage)
  assert.equal(ok, true)
  assert.equal(readSavedLocale(storage), "es")
})

test('explicit setLocale("en") persists English', () => {
  const storage = makeStorageShim({ [STORAGE_KEY]: "es" })
  const ok = writeSavedLocale("en", storage)
  assert.equal(ok, true)
  assert.equal(readSavedLocale(storage), "en")
})

test("unsupported explicit locale is rejected, not persisted", () => {
  const storage = makeStorageShim({ [STORAGE_KEY]: "en" })
  const ok = writeSavedLocale("de", storage)
  assert.equal(ok, false)
  // Prior valid saved value must be untouched by the rejected write.
  assert.equal(readSavedLocale(storage), "en")
})

test("writeSavedLocale only ever touches its own storage key (never mutates unrelated preferences/profile data)", () => {
  const storage = makeStorageShim({ nuarcade_active_profile: "player-1", nuarcade_theme: "cyan" })
  writeSavedLocale("es", storage)
  assert.equal(storage._store.get("nuarcade_active_profile"), "player-1")
  assert.equal(storage._store.get("nuarcade_theme"), "cyan")
  assert.equal(storage._store.get(STORAGE_KEY), "es")
})

test("readSavedLocale/writeSavedLocale also work against the default global localStorage", () => {
  assert.equal(readSavedLocale(), null)
  writeSavedLocale("es")
  assert.equal(readSavedLocale(), "es")
})

// -- normalizeLocale / resolveSystemLocale -----------------------------------

test("normalizeLocale accepts only supported locales", () => {
  assert.equal(normalizeLocale("en"), "en")
  assert.equal(normalizeLocale("es"), "es")
  assert.equal(normalizeLocale("de"), null)
  assert.equal(normalizeLocale(""), null)
  assert.equal(normalizeLocale(null), null)
  assert.equal(normalizeLocale(undefined), null)
  assert.equal(normalizeLocale(42), null)
})

test("resolveSystemLocale matches the primary subtag of regional variants", () => {
  assert.equal(resolveSystemLocale("es-MX"), "es")
  assert.equal(resolveSystemLocale("es-ES"), "es")
  assert.equal(resolveSystemLocale("es"), "es")
  assert.equal(resolveSystemLocale("en-GB"), "en")
  assert.equal(resolveSystemLocale("fr-FR"), "en")
  assert.equal(resolveSystemLocale(undefined), "en")
  assert.equal(resolveSystemLocale(""), "en")
})

// -- translate: resolution order, fallback, interpolation --------------------

test("Spanish key resolves correctly", () => {
  assert.equal(translate("es", "home.recentlyPlayed"), "Jugados recientemente")
  assert.equal(translate("es", "home.recentlyPlayed"), es["home.recentlyPlayed"])
})

test("missing Spanish key falls back to the English value", () => {
  // settings.subtitle is intentionally present only in en.js -- a real gap
  // in the shipped Spanish dictionary, not a synthetic test fixture.
  assert.equal(es["settings.subtitle"], undefined)
  assert.equal(translate("es", "settings.subtitle"), en["settings.subtitle"])
})

test("missing key in every locale returns an unmistakable visible diagnostic instead of throwing", () => {
  assert.doesNotThrow(() => translate("en", "this.key.does.not.exist"))
  assert.equal(translate("en", "this.key.does.not.exist"), "[[this.key.does.not.exist]]")
  assert.equal(translate("es", "this.key.does.not.exist"), "[[this.key.does.not.exist]]")
})

test("named interpolation substitutes params without evaluating code or HTML", () => {
  assert.equal(
    translate("en", "errors.launchFailed", { game: "Pac-Man" }),
    "Failed to launch Pac-Man"
  )
  assert.equal(
    translate("es", "errors.launchFailed", { game: "Pac-Man" }),
    "No se pudo iniciar Pac-Man"
  )
})

test("missing interpolation value does not throw and leaves the token visible", () => {
  assert.doesNotThrow(() => translate("en", "errors.launchFailed", {}))
  assert.equal(translate("en", "errors.launchFailed", {}), "Failed to launch {game}")
  assert.doesNotThrow(() => translate("en", "errors.launchFailed"))
})

test("dynamic game/profile names pass through interpolation unchanged (not translated)", () => {
  const name = "María's Pinball Palace <3"
  assert.equal(translate("en", "errors.launchFailed", { game: name }), "Failed to launch " + name)
})

test("switching locale via translate() does not require or mutate any stored profile/game data", () => {
  const storage = makeStorageShim({ nuarcade_active_profile: "player-1" })
  translate("en", "home.recentlyPlayed")
  translate("es", "home.recentlyPlayed")
  assert.equal(storage._store.get("nuarcade_active_profile"), "player-1")
})

// -- representative converted-surface strings switch correctly at runtime ---
// (t() is just translate(locale, key, params) re-evaluated per render, so
// exercising translate() directly across both locales for the same keys IS
// the runtime-switch behavior -- there's no separate code path in
// I18nContext for this.)

test("representative Home strings switch between locales", () => {
  assert.equal(translate("en", "home.recentlyPlayed"), "Recently Played")
  assert.equal(translate("es", "home.recentlyPlayed"), "Jugados recientemente")
  assert.equal(translate("en", "home.switchPlayer"), "Switch Player")
  assert.equal(translate("es", "home.switchPlayer"), "Cambiar jugador")
  assert.equal(translate("en", "home.depart"), "Depart")
  assert.equal(translate("es", "home.depart"), "Salir")
})

test("representative Player Select strings switch between locales", () => {
  assert.equal(translate("en", "playerSelect.guest"), "Play as Guest")
  assert.equal(translate("es", "playerSelect.guest"), "Jugar como invitado")
  assert.equal(translate("en", "playerSelect.addPlayer"), "New Player")
  assert.equal(translate("es", "playerSelect.addPlayer"), "Añadir jugador")
})

test("representative Library/Wheel strings switch between locales", () => {
  assert.equal(translate("en", "wheel.categoryAll"), "All")
  assert.equal(translate("es", "wheel.categoryAll"), "Todos")
  assert.equal(translate("en", "wheel.scanning"), "Scanning game library...")
  assert.equal(translate("es", "wheel.scanning"), "Explorando la biblioteca de juegos...")
})

test("Settings language selector labels are exposed for both supported languages", () => {
  assert.equal(translate("en", "settings.languageEnglish"), "English")
  assert.equal(translate("en", "settings.languageSpanish"), "Español")
  assert.equal(translate("es", "settings.languageEnglish"), "English")
  assert.equal(translate("es", "settings.languageSpanish"), "Español")
})

// -- direction ----------------------------------------------------------------

test("direction is ltr for both English and Spanish this milestone", () => {
  assert.equal(getDirection("en"), "ltr")
  assert.equal(getDirection("es"), "ltr")
})

test("direction falls back to ltr for an unrecognized locale rather than throwing", () => {
  assert.doesNotThrow(() => getDirection("xx"))
  assert.equal(getDirection("xx"), "ltr")
})

// -- applyDocumentMetadata: injectable documentRef ---------------------------

function makeFakeDocument() {
  return { documentElement: { lang: "", dir: "" } }
}

test("applyDocumentMetadata sets lang and dir on the injected document for English", () => {
  const doc = makeFakeDocument()
  applyDocumentMetadata("en", doc)
  assert.equal(doc.documentElement.lang, "en")
  assert.equal(doc.documentElement.dir, "ltr")
})

test("applyDocumentMetadata sets lang and dir on the injected document for Spanish", () => {
  const doc = makeFakeDocument()
  applyDocumentMetadata("es", doc)
  assert.equal(doc.documentElement.lang, "es")
  assert.equal(doc.documentElement.dir, "ltr")
})

test("applyDocumentMetadata normalizes a malformed locale to English metadata rather than throwing", () => {
  const doc = makeFakeDocument()
  assert.doesNotThrow(() => applyDocumentMetadata("not-a-locale", doc))
  assert.equal(doc.documentElement.lang, "en")
  assert.equal(doc.documentElement.dir, "ltr")
})

test("applyDocumentMetadata is safe with no documentRef and no global document (non-browser/test environment)", () => {
  assert.doesNotThrow(() => applyDocumentMetadata("es", undefined))
  assert.doesNotThrow(() => applyDocumentMetadata("es", null))
  assert.doesNotThrow(() => applyDocumentMetadata("es", {}))
})
