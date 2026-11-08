import { useCallback, useEffect, useState } from 'react'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import {
  beginTodayAttentionQuery,
  createTodayAttentionQuerySnapshot,
  failTodayAttentionQuery,
  selectTodayAttentionQueryView,
  succeedTodayAttentionQuery,
} from '@/features/today/todayAttentionQueryState'
import { listTodayAttention } from '@/services/api/listTodayAttention'

export function useTodayAttention() {
  const { businessId } = useCurrentBusiness()
  const [snapshot, setSnapshot] = useState(createTodayAttentionQuerySnapshot)
  const [reloadSeq, setReloadSeq] = useState(0)

  const refetch = useCallback(() => {
    setReloadSeq((current) => current + 1)
  }, [])

  useEffect(() => {
    if (businessId === null) {
      setSnapshot(createTodayAttentionQuerySnapshot())
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setSnapshot(beginTodayAttentionQuery())

    void listTodayAttention(businessId, { signal: controller.signal })
      .then((result) => {
        if (cancelled) {
          return
        }

        setSnapshot(succeedTodayAttentionQuery(businessId, result))
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return
        }

        if (caught instanceof Error && caught.name === 'AbortError') {
          return
        }

        setSnapshot(
          failTodayAttentionQuery(
            businessId,
            caught instanceof Error ? caught : new Error('Failed to load today attention.'),
          ),
        )
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [businessId, reloadSeq])

  return {
    ...selectTodayAttentionQueryView(snapshot, businessId),
    refetch,
  }
}
