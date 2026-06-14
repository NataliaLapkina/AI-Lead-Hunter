import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { useSettingsStore } from '@/stores'

function AppBootstrap() {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  return <RouterProvider router={router} />
}

export function AppProviders() {
  return (
    <>
      <AppBootstrap />
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}
