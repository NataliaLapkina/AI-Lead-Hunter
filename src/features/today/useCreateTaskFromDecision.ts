import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError, parseActorUserId } from '@/domain/recommendations/recommendationActions'
import {
  getCreateTaskErrorMessage,
  parseTaskTitle,
  type CreatedTask,
  type TaskPriority,
} from '@/domain/tasks/task'
import {
  dueAtCustomDate,
  dueAtToday,
  dueAtTomorrow,
} from '@/domain/tasks/taskDueAt'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { useCurrentUser } from '@/features/user/CurrentUserContext'
import { ru } from '@/i18n/ru'
import { createTaskFromDecision } from '@/services/api/createTaskFromDecision'

export type CreateTaskAttempt =
  | { status: 'success'; task: CreatedTask }
  | { status: 'busy' }
  | { status: 'ignored' }
  | { status: 'error'; message: string }

export type CreateTaskDueOption = 'today' | 'tomorrow' | 'custom'

export type CreateTaskApi = {
  createTaskFromDecision: typeof createTaskFromDecision
}

export function resolveCreateTaskDueAt(
  option: CreateTaskDueOption | null,
  customDate: string,
  now = new Date(),
): string | null {
  if (option === 'today') {
    return dueAtToday(now)
  }

  if (option === 'tomorrow') {
    return dueAtTomorrow(now)
  }

  if (option === 'custom') {
    return dueAtCustomDate(customDate, now)
  }

  return null
}

export function createCreateTaskFromDecisionHandlers(deps: {
  getBusinessId: () => string | null
  getUserId: () => string | null
  getDecisionId: () => string
  getContinuationIdentity: () => number
  isCurrent: () => boolean
  api: CreateTaskApi
}) {
  let inFlight = false
  let requestGeneration = 0
  let abortController: AbortController | null = null

  function abort(): void {
    abortController?.abort()
    abortController = null
    requestGeneration += 1
    inFlight = false
  }

  function tryBegin(): { controller: AbortController; generation: number } | null {
    if (inFlight) {
      return null
    }

    inFlight = true
    requestGeneration += 1
    abortController = new AbortController()
    return { controller: abortController, generation: requestGeneration }
  }

  function finish(generation: number): void {
    if (generation === requestGeneration) {
      inFlight = false
    }
  }

  function isCurrentOutcome(
    generation: number,
    capturedBusinessId: string,
    capturedDecisionId: string,
    capturedContinuationIdentity: number,
  ): boolean {
    return (
      generation === requestGeneration &&
      deps.isCurrent() &&
      deps.getBusinessId() === capturedBusinessId &&
      deps.getDecisionId() === capturedDecisionId &&
      deps.getContinuationIdentity() === capturedContinuationIdentity
    )
  }

  async function submit(input: {
    title: unknown
    dueOption: CreateTaskDueOption | null
    customDate: string
    priority: TaskPriority
  }): Promise<CreateTaskAttempt> {
    const started = tryBegin()
    if (!started) {
      return { status: 'busy' }
    }

    const businessId = deps.getBusinessId()
    const userId = parseActorUserId(deps.getUserId())
    const decisionId = deps.getDecisionId()
    const continuationIdentity = deps.getContinuationIdentity()
    const title = parseTaskTitle(input.title)
    const dueAt = resolveCreateTaskDueAt(input.dueOption, input.customDate)

    if (!businessId) {
      finish(started.generation)
      return { status: 'error', message: ru.today.actionFailed }
    }

    if (!userId) {
      finish(started.generation)
      return { status: 'error', message: ru.today.missingUser }
    }

    if (!title) {
      finish(started.generation)
      return { status: 'error', message: ru.today.invalidTaskTitle }
    }

    if (!dueAt) {
      finish(started.generation)
      return { status: 'error', message: ru.today.invalidTaskDueAt }
    }

    try {
      const result = await deps.api.createTaskFromDecision({
        businessId,
        decisionId,
        command: {
          createdById: userId,
          title,
          dueAt,
          priority: input.priority,
        },
        signal: started.controller.signal,
      })

      if (!isCurrentOutcome(started.generation, businessId, decisionId, continuationIdentity)) {
        return { status: 'ignored' }
      }

      return { status: 'success', task: result.task }
    } catch (error) {
      if (
        isAbortError(error) ||
        !isCurrentOutcome(started.generation, businessId, decisionId, continuationIdentity)
      ) {
        return { status: 'ignored' }
      }

      return {
        status: 'error',
        message: getCreateTaskErrorMessage(error),
      }
    } finally {
      finish(started.generation)
    }
  }

  return {
    isSubmitting: () => inFlight,
    abort,
    submit,
  }
}

export function useCreateTaskFromDecision(
  decisionId: string,
  continuationIdentity: number,
) {
  const { businessId } = useCurrentBusiness()
  const { userId } = useCurrentUser()
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const businessIdRef = useRef(businessId)
  const userIdRef = useRef(userId)
  const decisionIdRef = useRef(decisionId)
  const continuationIdentityRef = useRef(continuationIdentity)

  businessIdRef.current = businessId
  userIdRef.current = userId
  decisionIdRef.current = decisionId
  continuationIdentityRef.current = continuationIdentity

  const handlersRef = useRef(
    createCreateTaskFromDecisionHandlers({
      getBusinessId: () => businessIdRef.current,
      getUserId: () => userIdRef.current,
      getDecisionId: () => decisionIdRef.current,
      getContinuationIdentity: () => continuationIdentityRef.current,
      isCurrent: () => mountedRef.current,
      api: { createTaskFromDecision },
    }),
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      handlersRef.current.abort()
    }
  }, [])

  useEffect(() => {
    handlersRef.current.abort()
    setActionError(null)
    setSubmitting(false)
  }, [businessId, decisionId, continuationIdentity])

  const submit = useCallback(
    async (input: {
      title: unknown
      dueOption: CreateTaskDueOption | null
      customDate: string
      priority: TaskPriority
    }): Promise<CreateTaskAttempt> => {
      setActionError(null)
      setSubmitting(true)
      const result = await handlersRef.current.submit(input)
      if (
        mountedRef.current &&
        businessIdRef.current === businessId &&
        decisionIdRef.current === decisionId &&
        continuationIdentityRef.current === continuationIdentity
      ) {
        setSubmitting(handlersRef.current.isSubmitting())
        if (result.status === 'error') {
          setActionError(result.message)
        }
      }
      return result
    },
    [businessId, decisionId, continuationIdentity],
  )

  return {
    submitting,
    actionError,
    submit,
    clearActionError: () => setActionError(null),
  }
}
