import { useCallback, useEffect, useState } from 'react'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import {
  beginNeedsDecisionQuery,
  createNeedsDecisionQuerySnapshot,
  failNeedsDecisionQuery,
  selectNeedsDecisionQueryView,
  succeedNeedsDecisionQuery,
} from '@/features/today/needsDecisionQueryState'
import { listNeedsDecisionRecommendations } from '@/services/api/listNeedsDecisionRecommendations'

export function useNeedsDecisionRecommendations() {
  const { businessId } = useCurrentBusiness()
  const [snapshot, setSnapshot] = useState(createNeedsDecisionQuerySnapshot)
  const [reloadSeq, setReloadSeq] = useState(0)

  const refetch = useCallback(() => {
    setReloadSeq((current) => current + 1)
  }, [])

  useEffect(() => {
    if (businessId === null) {
      setSnapshot(createNeedsDecisionQuerySnapshot())
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setSnapshot(beginNeedsDecisionQuery())

    void listNeedsDecisionRecommendations(businessId, { signal: controller.signal })
      .then((result) => {
        if (cancelled) {
          return
        }

        setSnapshot(succeedNeedsDecisionQuery(businessId, result))
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return
        }

        if (caught instanceof Error && caught.name === 'AbortError') {
          return
        }

        setSnapshot(
          failNeedsDecisionQuery(
            businessId,
            caught instanceof Error
              ? caught
              : new Error('Failed to load recommendations.'),
          ),
        )
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [businessId, reloadSeq])

  return {
    ...selectNeedsDecisionQueryView(snapshot, businessId),
    refetch,
  }
}
