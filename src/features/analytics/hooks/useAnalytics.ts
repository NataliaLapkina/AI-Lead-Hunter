import { useMemo } from 'react'
import { computeAnalytics } from '@/features/analytics/computeAnalytics'
import { useLeadStore } from '@/stores'

export function useAnalytics() {
  const { leads } = useLeadStore()

  const analytics = useMemo(() => computeAnalytics(leads), [leads])

  return analytics
}
