import { STORAGE_KEYS } from '@/lib/constants'
import { getStorageItem, setStorageItem } from '@/lib/storage'

export function readFirstVisit(): boolean {
  return getStorageItem<boolean>(STORAGE_KEYS.ACTIVATION_FIRST_VISIT, true)
}

export function completeOnboarding(): void {
  setStorageItem(STORAGE_KEYS.ACTIVATION_FIRST_VISIT, false)
}

export type ActivationPhase = 'onboarding' | 'empty' | 'active'

export function resolveActivationPhase(firstVisit: boolean, leadsCount: number): ActivationPhase {
  if (leadsCount > 0) return 'active'
  if (firstVisit) return 'onboarding'
  return 'empty'
}
