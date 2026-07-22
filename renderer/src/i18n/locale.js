// locale.js -- plain, framework-free localization core. No React, no
// direct component access to localStorage/document elsewhere in the app --
// everything about locale resolution, persistence, translation and
// document metadata lives here so it can be unit tested with node --test
// and reused identically by I18nContext.jsx.
import en from "./en.js"
import es from "./es.js"

export const SUPPORTED_LOCALES = ["en", "es"]
export const DEFAULT_LOCALE = "en"
export const STORAGE_KEY = "nuarcade_locale"

const DICTIONARIES = { en, es }

const DIRECTIONS = { en: "ltr", es: "ltr" }

// Every future locale must be registered here explicitly -- there is no
// implicit "assume ltr" default baked into the lookup itself.
export function getDirection(locale) {
  return DIRECTIONS[locale] || "ltr"
}

// Returns the input unchanged if it's one of SUPPORTED_LOCALES, else null.
// This is the single gate malformed/unsupported values must pass through
// before they're trusted anywhere (persistence, active state, etc).
export function normalizeLocale(input) {
  return typeof input === "string" && SUPPORTED_LOCALES.includes(input) ? input : null
}

// Derives a supported locale from a raw BCP-47-ish tag like "es-MX" or
// "en-US" -- matches on the primary subtag only, defaults to English for
// anything unrecognized.
export function resolveSystemLocale(navigatorLanguage) {
  if (typeof navigatorLanguage !== "string" || !navigatorLanguage) return DEFAULT_LOCALE
  const primary = navigatorLanguage.split("-")[0].toLowerCase()
  return normalizeLocale(primary) || DEFAULT_LOCALE
}

function safeStorage(storage) {
  try {
    if (storage) return storage
    if (typeof localStorage !== "undefined") return localStorage
  } catch {}
  return null
}

// Raw read, no normalization -- distinguishes "nothing saved" (null) from
// "saved but malformed/unsupported" (a truthy, non-normalizable string).
// resolveInitialLocale needs that distinction: absent falls through to the
// system-derived locale, malformed goes straight to English regardless of
// system locale. readSavedLocale() below collapses both cases to null
// since most callers only care "is there a valid saved locale to use".
function readRawSavedLocale(storage) {
  const s = safeStorage(storage)
  if (!s) return null
  try {
    return s.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// Malformed/unsupported saved values resolve to null here (not English
// directly) so callers can distinguish "nothing saved" from "saved but
// invalid" if they ever need to.
export function readSavedLocale(storage) {
  return normalizeLocale(readRawSavedLocale(storage))
}

// Only ever called for an explicit player choice -- never to persist a
// system-derived default, so storage isn't rewritten just because English
// happened to be picked automatically.
export function writeSavedLocale(locale, storage) {
  const normalized = normalizeLocale(locale)
  if (!normalized) return false
  const s = safeStorage(storage)
  if (!s) return false
  try {
    s.setItem(STORAGE_KEY, normalized)
    return true
  } catch {
    return false
  }
}

// Precedence: valid saved preference > system-derived locale (only when
// nothing was saved at all) > English (when a saved value exists but is
// malformed/unsupported -- that case does NOT fall through to the system
// locale, it goes straight to English per the product contract).
export function resolveInitialLocale({ navigatorLanguage, storage } = {}) {
  const raw = readRawSavedLocale(storage)
  if (raw === null || raw === undefined) {
    return resolveSystemLocale(navigatorLanguage)
  }
  return normalizeLocale(raw) || DEFAULT_LOCALE
}

// Named interpolation only -- no code/HTML evaluation. Missing param
// values leave the `{token}` placeholder in place instead of throwing or
// silently vanishing, so a missing value stays visible/debuggable.
function interpolate(text, params) {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ))
}

// Resolution order: requested locale's dictionary -> English dictionary ->
// `[[key]]` as an unmistakable, visible, non-throwing diagnostic fallback
// (distinct from any real translated string, so a missing key can never be
// mistaken for legitimate copy).
export function translate(locale, key, params) {
  const dict = DICTIONARIES[normalizeLocale(locale) || DEFAULT_LOCALE] || DICTIONARIES[DEFAULT_LOCALE]
  const value = dict[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? `[[${key}]]`
  return interpolate(value, params)
}

// documentRef is injectable so this stays testable without a real DOM --
// production callers rely on the default (globalThis.document) and never
// pass it explicitly.
export function applyDocumentMetadata(locale, documentRef = globalThis.document) {
  if (!documentRef || !documentRef.documentElement) return
  const normalized = normalizeLocale(locale) || DEFAULT_LOCALE
  documentRef.documentElement.lang = normalized
  documentRef.documentElement.dir = getDirection(normalized)
}
