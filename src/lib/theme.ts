export type ThemeMode = "light" | "dark"

const STORAGE_KEY = "erp-theme"

export function getStoredTheme(): ThemeMode | null {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === "light" || v === "dark" ? v : null
}

export function applyTheme(mode: ThemeMode | null) {
  if (mode) {
    document.documentElement.setAttribute("data-theme", mode)
  } else {
    document.documentElement.removeAttribute("data-theme")
  }
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode)
  applyTheme(mode)
}

export function currentEffectiveTheme(): ThemeMode {
  const stored = getStoredTheme()
  if (stored) return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}
