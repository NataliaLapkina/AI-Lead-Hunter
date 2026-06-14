import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { NichePreset } from '@/domain/lead'
import { nicheMatches, normalizeNicheName } from '@/lib/nicheDisplay'

interface SearchNicheContextValue {
  niche: string
  city: string
  selectedPresetId: string | null
  setNiche: (value: string) => void
  setCity: (value: string) => void
  selectPreset: (preset: NichePreset) => void
  syncPresetFromNiche: (value: string, presets: NichePreset[]) => void
}

const SearchNicheContext = createContext<SearchNicheContextValue | null>(null)

export function SearchNicheProvider({ children }: { children: ReactNode }) {
  const [niche, setNicheState] = useState('')
  const [city, setCity] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)

  const setNiche = useCallback((value: string) => {
    setNicheState(value)
  }, [])

  const selectPreset = useCallback((preset: NichePreset) => {
    setNicheState(normalizeNicheName(preset.name))
    setSelectedPresetId(preset.id)
  }, [])

  const syncPresetFromNiche = useCallback((value: string, presets: NichePreset[]) => {
    setNicheState(value)
    const match = presets.find((preset) => nicheMatches(preset.name, value.trim()))
    setSelectedPresetId(match?.id ?? null)
  }, [])

  const value = useMemo(
    () => ({
      niche,
      city,
      selectedPresetId,
      setNiche,
      setCity,
      selectPreset,
      syncPresetFromNiche,
    }),
    [niche, city, selectedPresetId, setNiche, selectPreset, syncPresetFromNiche],
  )

  return (
    <SearchNicheContext.Provider value={value}>{children}</SearchNicheContext.Provider>
  )
}

export function useSearchNiche() {
  const ctx = useContext(SearchNicheContext)
  if (!ctx) {
    throw new Error('useSearchNiche must be used within SearchNicheProvider')
  }
  return ctx
}
