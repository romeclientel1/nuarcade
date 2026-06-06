import { useState, useCallback } from "react"

const THEME_KEY = "nuarcade_theme"

export const THEMES = {
  cyan:   { name: "Cyan",   accent: "#00c8ff", dim: "rgba(0,200,255,0.15)" },
  green:  { name: "Green",  accent: "#00ff88", dim: "rgba(0,255,136,0.15)" },
  amber:  { name: "Amber",  accent: "#ffaa00", dim: "rgba(255,170,0,0.15)"  },
  purple: { name: "Purple", accent: "#aa44ff", dim: "rgba(170,68,255,0.15)" },
  red:    { name: "Red",    accent: "#ff4444", dim: "rgba(255,68,68,0.15)"  },
}

export function useTheme() {
  const [themeId, setThemeId] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "cyan" } catch { return "cyan" }
  })

  const setTheme = useCallback((id) => {
    setThemeId(id)
    localStorage.setItem(THEME_KEY, id)
    const theme = THEMES[id] || THEMES.cyan
    document.documentElement.style.setProperty("--accent", theme.accent)
    document.documentElement.style.setProperty("--accent-dim", theme.dim)
  }, [])

  // Apply on mount
  useState(() => {
    const theme = THEMES[themeId] || THEMES.cyan
    document.documentElement.style.setProperty("--accent", theme.accent)
    document.documentElement.style.setProperty("--accent-dim", theme.dim)
  })

  return { themeId, setTheme, theme: THEMES[themeId] || THEMES.cyan }
}
