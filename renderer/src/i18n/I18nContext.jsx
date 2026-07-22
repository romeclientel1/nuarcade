import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react"
import {
  SUPPORTED_LOCALES,
  normalizeLocale,
  resolveInitialLocale,
  writeSavedLocale,
  translate,
  getDirection,
  applyDocumentMetadata,
} from "./locale.js"

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => resolveInitialLocale({
    navigatorLanguage: typeof navigator !== "undefined" ? navigator.language : undefined,
  }))

  useEffect(() => {
    applyDocumentMetadata(locale)
  }, [locale])

  // Only an explicit player choice reaches here (and therefore ever
  // writes to storage) -- the system-derived initial value above never
  // calls this itself, so launching in English on an English system
  // doesn't spuriously persist "en".
  const setLocale = useCallback((next) => {
    const normalized = normalizeLocale(next)
    if (!normalized) return
    writeSavedLocale(normalized)
    setLocaleState(normalized)
  }, [])

  const t = useCallback((key, params) => translate(locale, key, params), [locale])

  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
    direction: getDirection(locale),
    supportedLocales: SUPPORTED_LOCALES,
  }), [locale, setLocale, t])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useI18n() must be called within an <I18nProvider>. Did you forget to wrap the app root in main.jsx?")
  }
  return ctx
}
