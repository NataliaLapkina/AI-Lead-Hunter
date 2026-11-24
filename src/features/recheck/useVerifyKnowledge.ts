import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '@/domain/recommendations/recommendationActions'
import { getVerifyKnowledgeErrorMessage } from '@/domain/knowledge/verifyKnowledge'
import { verifyKnowledge } from '@/services/api/verifyKnowledge'

type VerifyAttempt = {
  id: number
  controller: AbortController
}

function isCurrentVerifyAttempt(
  attempts: Map<string, VerifyAttempt>,
  knowledgeId: string,
  attemptId: number,
): boolean {
  return attempts.get(knowledgeId)?.id === attemptId
}

function releaseVerifyAttempt(
  attempts: Map<string, VerifyAttempt>,
  knowledgeId: string,
  attemptId: number,
): boolean {
  if (!isCurrentVerifyAttempt(attempts, knowledgeId, attemptId)) {
    return false
  }

  attempts.delete(knowledgeId)
  return true
}

export function useVerifyKnowledge(businessId: string | null, refetch: () => void) {
  const businessIdRef = useRef(businessId)
  const refetchRef = useRef(refetch)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)
  const nextAttemptIdRef = useRef(0)
  const attemptsRef = useRef(new Map<string, VerifyAttempt>())
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  businessIdRef.current = businessId
  refetchRef.current = refetch

  const publishPending = useCallback(() => {
    setPendingIds(new Set(attemptsRef.current.keys()))
  }, [])

  const abortAll = useCallback(() => {
    for (const attempt of attemptsRef.current.values()) {
      attempt.controller.abort()
    }
    attemptsRef.current.clear()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      generationRef.current += 1
      abortAll()
    }
  }, [abortAll])

  useEffect(() => {
    generationRef.current += 1
    abortAll()
    setPendingIds(new Set())
    setErrors({})
  }, [abortAll, businessId])

  const verify = useCallback((knowledgeId: string) => {
    const capturedBusinessId = businessIdRef.current
    if (!capturedBusinessId || attemptsRef.current.has(knowledgeId)) {
      return
    }

    const generation = generationRef.current
    nextAttemptIdRef.current += 1
    const attempt: VerifyAttempt = {
      id: nextAttemptIdRef.current,
      controller: new AbortController(),
    }
    const attemptId = attempt.id
    attemptsRef.current.set(knowledgeId, attempt)
    publishPending()
    setErrors((current) => {
      if (!(knowledgeId in current)) {
        return current
      }

      const next = { ...current }
      delete next[knowledgeId]
      return next
    })

    void verifyKnowledge(capturedBusinessId, knowledgeId, {
      signal: attempt.controller.signal,
    })
      .then(() => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          !isCurrentVerifyAttempt(attemptsRef.current, knowledgeId, attemptId)
        ) {
          return
        }

        if (businessIdRef.current !== capturedBusinessId) {
          return
        }

        refetchRef.current()
      })
      .catch((error: unknown) => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          !isCurrentVerifyAttempt(attemptsRef.current, knowledgeId, attemptId) ||
          isAbortError(error)
        ) {
          return
        }

        if (businessIdRef.current !== capturedBusinessId) {
          return
        }

        setErrors((current) => ({
          ...current,
          [knowledgeId]: getVerifyKnowledgeErrorMessage(error),
        }))
      })
      .finally(() => {
        if (!releaseVerifyAttempt(attemptsRef.current, knowledgeId, attemptId)) {
          return
        }

        if (!mountedRef.current || generation !== generationRef.current) {
          return
        }

        publishPending()
      })
  }, [publishPending])

  return {
    isPending: (knowledgeId: string) => pendingIds.has(knowledgeId),
    errorFor: (knowledgeId: string) => errors[knowledgeId] ?? null,
    verify,
  }
}
