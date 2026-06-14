import { useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { NicheSuggestions } from '@/components/search/NicheSuggestions'
import { SearchNicheProvider, useSearchNiche } from '@/features/search/SearchNicheContext'
import { getSearchNichePresets } from '@/lib/nichePresets'
import { useSettingsStore } from '@/stores'
import { ru } from '@/i18n/ru'
import { cn } from '@/lib/utils'

function SearchLayoutContent() {
  const location = useLocation()
  const isAuto = location.pathname.includes('/search/auto')
  const { settings, fetchSettings } = useSettingsStore()
  const { selectedPresetId, selectPreset } = useSearchNiche()

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const presets = getSearchNichePresets(settings?.nichePresets ?? [])

  return (
    <AppShell
      title={isAuto ? ru.autoSearch.title : ru.search.title}
      subtitle={isAuto ? ru.autoSearch.subtitle : ru.search.subtitle}
    >
      <div className="space-y-6">
        <div className="inline-flex h-9 w-full max-w-md items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          <Link
            to="/search"
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
              !isAuto && 'bg-background text-foreground shadow',
            )}
          >
            {ru.search.tabManual}
          </Link>
          <Link
            to="/search/auto"
            className={cn(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all',
              isAuto && 'bg-background text-foreground shadow',
            )}
          >
            {ru.search.tabAuto}
          </Link>
        </div>

        <NicheSuggestions
          presets={presets}
          selectedPresetId={selectedPresetId}
          onSelect={selectPreset}
        />

        <Outlet />
      </div>
    </AppShell>
  )
}

export function SearchLayout() {
  return (
    <SearchNicheProvider>
      <SearchLayoutContent />
    </SearchNicheProvider>
  )
}
