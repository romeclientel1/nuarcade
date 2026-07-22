// I18nProvider.jsx -- the JSX provider component. Kept separate from
// I18nContext.js so plain hook modules can depend on the context/useI18n
// without pulling JSX into a native `node --test` import chain. See
// I18nContext.js for why that split exists.
import { useState, useCallback, useEffect, useMemo } from "react"
import { I18nContext } from "./I18nContext.js"
import {
  SUPPORTED_LOCALES,
  normalizeLocale,
  resolveInitialLocale,
  writeSavedLocale,
  translate,
  getDirection,
  applyDocumentMetadata,
} from "./locale.js"

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
