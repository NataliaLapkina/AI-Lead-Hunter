import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { parseBusinessId, type CurrentBusiness } from '@/domain/business'

const CurrentBusinessContext = createContext<CurrentBusiness | null>(null)

export function CurrentBusinessProvider({ children }: { children: ReactNode }) {
  const value = useMemo<CurrentBusiness>(
    () => ({
      businessId: parseBusinessId(import.meta.env.VITE_DEV_BUSINESS_ID),
    }),
    [],
  )

  return (
    <CurrentBusinessContext.Provider value={value}>
      {children}
    </CurrentBusinessContext.Provider>
  )
}

export function useCurrentBusiness(): CurrentBusiness {
  const context = useContext(CurrentBusinessContext)
  if (!context) {
    throw new Error('useCurrentBusiness must be used within CurrentBusinessProvider')
  }
  return context
}
