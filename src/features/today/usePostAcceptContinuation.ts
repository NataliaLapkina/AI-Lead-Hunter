import { useCallback, useEffect, useRef, useState } from 'react'
import type { AcceptedDecision } from '@/domain/decisions/decision'
import type { NeedsDecisionRecommendation } from '@/domain/recommendations/needsDecision'

export type PostAcceptContinuation = {
  identity: number
  recommendationId: string
  businessId: string
  decision: AcceptedDecision
  recommendation: NeedsDecisionRecommendation
}

export type NewPostAcceptContinuation = Omit<PostAcceptContinuation, 'identity'>

export function isCurrentContinuationIdentity(
  item: Pick<PostAcceptContinuation, 'recommendationId' | 'identity'>,
  recommendationId: string,
  identity: number,
): boolean {
  return item.recommendationId === recommendationId && item.identity === identity
}

export function selectVisibleContinuations(
  items: PostAcceptContinuation[],
  businessId: string | null,
): PostAcceptContinuation[] {
  if (businessId === null) {
    return []
  }

  return items.filter((item) => item.businessId === businessId)
}

export function usePostAcceptContinuations(businessId: string | null) {
  const [items, setItems] = useState<PostAcceptContinuation[]>([])
  const nextIdentityRef = useRef(0)

  useEffect(() => {
    setItems([])
  }, [businessId])

  const add = useCallback(
    (item: NewPostAcceptContinuation) => {
      if (businessId === null || item.businessId !== businessId) {
        return
      }

      nextIdentityRef.current += 1
      const continuation = { ...item, identity: nextIdentityRef.current }
      setItems((current) => [
        ...current.filter(
          (existing) => existing.recommendationId !== item.recommendationId,
        ),
        continuation,
      ])
    },
    [businessId],
  )

  const remove = useCallback((recommendationId: string, identity: number) => {
    setItems((current) =>
      current.filter(
        (item) => !isCurrentContinuationIdentity(item, recommendationId, identity),
      ),
    )
  }, [])

  return {
    continuations: selectVisibleContinuations(items, businessId),
    add,
    remove,
  }
}
