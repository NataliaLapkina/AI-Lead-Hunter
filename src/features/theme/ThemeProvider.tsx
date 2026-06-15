import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  applyTheme,
  initTheme,
  readStoredThemeMode,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
  writeStoredThemeMode,
} from '@/lib/theme'
import { ru } from '@/i18n/ru'

function getThemeChangeToastMessage(mode: ThemeMode): string {
  switch (mode) {
    case 'light':
      return ru.settings.themeLightEnabled
    case 'dark':
      return ru.settings.themeDarkEnabled
    case 'system':
      return ru.settings.themeSystemEnabled
  }
}

interface ThemeContextValue {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => initTheme())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(mode))

  const setMode = useCallback((nextMode: ThemeMode) => {
    if (nextMode === mode) return

    writeStoredThemeMode(nextMode)
    setModeState(nextMode)
    setResolvedTheme(applyTheme(nextMode))
    toast.success(getThemeChangeToastMessage(nextMode))
  }, [mode])

  useEffect(() => {
    setResolvedTheme(applyTheme(mode))
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const resolved = applyTheme('system')
      setResolvedTheme(resolved)
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [mode])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== 'alh_theme') return
      const stored = readStoredThemeMode()
      setModeState(stored)
      setResolvedTheme(applyTheme(stored))
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
