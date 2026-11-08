import { useCallback, useEffect, useState } from 'react'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import {
  beginTodayDeferredQuery,
  createTodayDeferredQuerySnapshot,
  failTodayDeferredQuery,
  selectTodayDeferredQueryView,
  succeedTodayDeferredQuery,
} from '@/features/today/todayDeferredQueryState'
import { listTodayDeferred } from '@/services/api/listTodayDeferred'

export function useTodayDeferred() {
  const { businessId } = useCurrentBusiness()
  const [snapshot, setSnapshot] = useState(createTodayDeferredQuerySnapshot)
  const [reloadSeq, setReloadSeq] = useState(0)

  const refetch = useCallback(() => {
    setReloadSeq((current) => current + 1)
  }, [])

  useEffect(() => {
    if (businessId === null) {
      setSnapshot(createTodayDeferredQuerySnapshot())
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setSnapshot(beginTodayDeferredQuery())

    void listTodayDeferred(businessId, { signal: controller.signal })
      .then((result) => {
        if (cancelled) {
          return
        }

        setSnapshot(succeedTodayDeferredQuery(businessId, result))
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return
        }

        if (caught instanceof Error && caught.name === 'AbortError') {
          return
        }

        setSnapshot(
          failTodayDeferredQuery(
            businessId,
            caught instanceof Error ? caught : new Error('Failed to load today deferred.'),
          ),
        )
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [businessId, reloadSeq])

  return {
    ...selectTodayDeferredQueryView(snapshot, businessId),
    refetch,
  }
}
