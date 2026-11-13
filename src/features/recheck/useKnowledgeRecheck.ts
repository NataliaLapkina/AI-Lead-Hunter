import { useCallback, useEffect, useState } from 'react'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import {
  beginKnowledgeRecheckQuery,
  createKnowledgeRecheckQuerySnapshot,
  failKnowledgeRecheckQuery,
  selectKnowledgeRecheckQueryView,
  succeedKnowledgeRecheckQuery,
} from '@/features/recheck/knowledgeRecheckQueryState'
import { listKnowledgeRecheck } from '@/services/api/listKnowledgeRecheck'

export function useKnowledgeRecheck() {
  const { businessId } = useCurrentBusiness()
  const [snapshot, setSnapshot] = useState(createKnowledgeRecheckQuerySnapshot)
  const [reloadSeq, setReloadSeq] = useState(0)

  const refetch = useCallback(() => {
    setReloadSeq((current) => current + 1)
  }, [])

  useEffect(() => {
    if (businessId === null) {
      setSnapshot(createKnowledgeRecheckQuerySnapshot())
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setSnapshot(beginKnowledgeRecheckQuery())

    void listKnowledgeRecheck(businessId, { signal: controller.signal })
      .then((result) => {
        if (cancelled) {
          return
        }

        setSnapshot(succeedKnowledgeRecheckQuery(businessId, result))
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return
        }

        if (caught instanceof Error && caught.name === 'AbortError') {
          return
        }

        setSnapshot(
          failKnowledgeRecheckQuery(
            businessId,
            caught instanceof Error ? caught : new Error('Failed to load knowledge recheck.'),
          ),
        )
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [businessId, reloadSeq])

  return {
    ...selectKnowledgeRecheckQueryView(snapshot, businessId),
    refetch,
  }
}
