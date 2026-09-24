import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { parseUserId, type CurrentUser } from '@/domain/user'

const CurrentUserContext = createContext<CurrentUser | null>(null)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const value = useMemo<CurrentUser>(
    () => ({
      userId: parseUserId(import.meta.env.VITE_DEV_USER_ID),
    }),
    [],
  )

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUser {
  const context = useContext(CurrentUserContext)
  if (!context) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider')
  }
  return context
}
