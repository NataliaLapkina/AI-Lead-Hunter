import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '@/domain/recommendations/recommendationActions'
import { getStartTaskErrorMessage } from '@/domain/tasks/startTask'
import { startTask } from '@/services/api/startTask'

type StartAttempt = {
  id: number
  controller: AbortController
}

function isCurrentStartAttempt(
  attempts: Map<string, StartAttempt>,
  taskId: string,
  attemptId: number,
): boolean {
  return attempts.get(taskId)?.id === attemptId
}

function releaseStartAttempt(
  attempts: Map<string, StartAttempt>,
  taskId: string,
  attemptId: number,
): boolean {
  if (!isCurrentStartAttempt(attempts, taskId, attemptId)) {
    return false
  }

  attempts.delete(taskId)
  return true
}

export function useStartTodayTask(businessId: string | null, refetch: () => void) {
  const businessIdRef = useRef(businessId)
  const refetchRef = useRef(refetch)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)
  const nextAttemptIdRef = useRef(0)
  const attemptsRef = useRef(new Map<string, StartAttempt>())
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

  const start = useCallback((taskId: string) => {
    const capturedBusinessId = businessIdRef.current
    if (!capturedBusinessId || attemptsRef.current.has(taskId)) {
      return
    }

    const generation = generationRef.current
    nextAttemptIdRef.current += 1
    const attempt: StartAttempt = {
      id: nextAttemptIdRef.current,
      controller: new AbortController(),
    }
    const attemptId = attempt.id
    attemptsRef.current.set(taskId, attempt)
    publishPending()
    setErrors((current) => {
      if (!(taskId in current)) {
        return current
      }

      const next = { ...current }
      delete next[taskId]
      return next
    })

    void startTask(capturedBusinessId, taskId, { signal: attempt.controller.signal })
      .then(() => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          !isCurrentStartAttempt(attemptsRef.current, taskId, attemptId)
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
          !isCurrentStartAttempt(attemptsRef.current, taskId, attemptId) ||
          isAbortError(error)
        ) {
          return
        }

        if (businessIdRef.current !== capturedBusinessId) {
          return
        }

        setErrors((current) => ({
          ...current,
          [taskId]: getStartTaskErrorMessage(error),
        }))
      })
      .finally(() => {
        if (!releaseStartAttempt(attemptsRef.current, taskId, attemptId)) {
          return
        }

        if (!mountedRef.current || generation !== generationRef.current) {
          return
        }

        publishPending()
      })
  }, [publishPending])

  return {
    isPending: (taskId: string) => pendingIds.has(taskId),
    errorFor: (taskId: string) => errors[taskId] ?? null,
    start,
  }
}
