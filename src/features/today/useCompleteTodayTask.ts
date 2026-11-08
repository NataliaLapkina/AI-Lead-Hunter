import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '@/domain/recommendations/recommendationActions'
import { getCompleteTaskErrorMessage, type TaskCompletionOutcome } from '@/domain/tasks/completeTask'
import { completeTask } from '@/services/api/completeTask'

type CompleteAttempt = {
  id: number
  controller: AbortController
}

function isCurrentAttempt(
  attempt: CompleteAttempt | null,
  attemptId: number,
  generation: number,
  generationNow: number,
  mounted: boolean,
  businessId: string | null,
  capturedBusinessId: string,
): boolean {
  return (
    mounted &&
    generation === generationNow &&
    attempt?.id === attemptId &&
    businessId === capturedBusinessId
  )
}

export function useCompleteTodayTask(businessId: string | null, refetch: () => void) {
  const businessIdRef = useRef(businessId)
  const refetchRef = useRef(refetch)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)
  const nextAttemptIdRef = useRef(0)
  const attemptRef = useRef<CompleteAttempt | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  businessIdRef.current = businessId
  refetchRef.current = refetch

  const abortCurrent = useCallback(() => {
    attemptRef.current?.controller.abort()
    attemptRef.current = null
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      generationRef.current += 1
      abortCurrent()
    }
  }, [abortCurrent])

  useEffect(() => {
    generationRef.current += 1
    abortCurrent()
    setPending(false)
    setError(null)
  }, [abortCurrent, businessId])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const complete = useCallback(
    (taskId: string, outcome: TaskCompletionOutcome, comment: string, onSuccess: () => void) => {
      const capturedBusinessId = businessIdRef.current
      if (!capturedBusinessId || taskId.length === 0 || attemptRef.current) {
        return
      }

      const generation = generationRef.current
      nextAttemptIdRef.current += 1
      const attemptId = nextAttemptIdRef.current
      const attempt: CompleteAttempt = {
        id: attemptId,
        controller: new AbortController(),
      }
      attemptRef.current = attempt
      setPending(true)
      setError(null)

      void completeTask(capturedBusinessId, taskId, outcome, comment, {
        signal: attempt.controller.signal,
      })
        .then(() => {
          if (
            !isCurrentAttempt(
              attemptRef.current,
              attemptId,
              generation,
              generationRef.current,
              mountedRef.current,
              businessIdRef.current,
              capturedBusinessId,
            )
          ) {
            return
          }

          onSuccess()
          refetchRef.current()
        })
        .catch((caught: unknown) => {
          if (
            !isCurrentAttempt(
              attemptRef.current,
              attemptId,
              generation,
              generationRef.current,
              mountedRef.current,
              businessIdRef.current,
              capturedBusinessId,
            ) ||
            isAbortError(caught)
          ) {
            return
          }

          setError(getCompleteTaskErrorMessage(caught))
        })
        .finally(() => {
          if (attemptRef.current?.id !== attemptId) {
            return
          }

          attemptRef.current = null
          if (!mountedRef.current || generation !== generationRef.current) {
            return
          }

          setPending(false)
        })
    },
    [],
  )

  return {
    pending,
    error,
    clearError,
    complete,
  }
}
