// I18nContext.js -- the context object and its consumer hook, deliberately
// kept JSX-free. useGameLauncher.js (a plain hook module imported directly
// by useGameLauncher.test.js under native `node --test`, no Vite/Babel
// transform available) imports useI18n from here, not from
// I18nProvider.jsx -- that file's JSX would fail to parse in that harness.
// I18nProvider.jsx imports the same I18nContext export from this module,
// so there is exactly one context instance shared by both.
import { createContext, useContext } from "react"

export const I18nContext = createContext(null)

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useI18n() must be called within an <I18nProvider>. Did you forget to wrap the app root in main.jsx?")
  }
  return ctx
}
