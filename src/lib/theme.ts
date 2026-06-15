export type ThemeMode = 'light' | 'dark' | 'system'

export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'alh_theme'

export const THEME_MODE_EMOJI: Record<ThemeMode, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
}

const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system']

export function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && VALID_MODES.includes(value as ThemeMode)
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function writeStoredThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // ignore quota / private mode errors
  }
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemTheme()
  return mode
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
}

export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode)
  applyResolvedTheme(resolved)
  return resolved
}

export function initTheme(): ThemeMode {
  const mode = readStoredThemeMode()
  applyTheme(mode)
  return mode
}
