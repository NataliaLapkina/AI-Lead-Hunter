import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { CurrentBusinessProvider } from '@/features/business/CurrentBusinessContext'
import { ThemeProvider, useTheme } from '@/features/theme/ThemeProvider'
import { useSettingsStore } from '@/stores'

function AppBootstrap() {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  return <RouterProvider router={router} />
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return <Toaster position="top-right" richColors closeButton theme={resolvedTheme} />
}

export function AppProviders() {
  return (
    <ThemeProvider>
      <CurrentBusinessProvider>
        <AppBootstrap />
        <ThemedToaster />
      </CurrentBusinessProvider>
    </ThemeProvider>
  )
}
