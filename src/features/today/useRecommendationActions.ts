import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getRecommendationActionErrorMessage,
  isAbortError,
  parseActorUserId,
  parseDecisionTitle,
  parseRejectionComment,
  parseRejectionReason,
  type RecommendationRejectionReason,
} from '@/domain/recommendations/recommendationActions'
import { useCurrentBusiness } from '@/features/business/CurrentBusinessContext'
import { useCurrentUser } from '@/features/user/CurrentUserContext'
import {
  snoozeCustomDateUntil,
  snoozePresetUntil,
  type SnoozePresetKey,
} from '@/features/today/snoozePresets'
import { ru } from '@/i18n/ru'
import {
  acceptRecommendation,
  modifyRecommendation,
  rejectRecommendation,
  snoozeRecommendation,
} from '@/services/api/recommendationActions'

export type RecommendationActionAttempt =
  | { status: 'success' }
  | { status: 'busy' }
  | { status: 'ignored' }
  | { status: 'error'; message: string }

export type RecommendationActionApi = {
  acceptRecommendation: typeof acceptRecommendation
  snoozeRecommendation: typeof snoozeRecommendation
  modifyRecommendation: typeof modifyRecommendation
  rejectRecommendation: typeof rejectRecommendation
}

export function createRecommendationActionHandlers(deps: {
  getBusinessId: () => string | null
  getUserId: () => string | null
  getRecommendationId: () => string
  isCurrent: () => boolean
  api: RecommendationActionApi
  onSuccess: (businessId: string) => void
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

  function isCurrentGeneration(generation: number): boolean {
    return generation === requestGeneration
  }

  function isCurrentOutcome(
    generation: number,
    capturedBusinessId: string,
  ): boolean {
    return (
      isCurrentGeneration(generation) &&
      deps.isCurrent() &&
      deps.getBusinessId() === capturedBusinessId
    )
  }

  async function runRequest(
    capturedBusinessId: string,
    request: (signal: AbortSignal) => Promise<unknown>,
    started: { controller: AbortController; generation: number },
  ): Promise<RecommendationActionAttempt> {
    try {
      await request(started.controller.signal)

      if (!isCurrentOutcome(started.generation, capturedBusinessId)) {
        return { status: 'ignored' }
      }

      deps.onSuccess(capturedBusinessId)
      return { status: 'success' }
    } catch (error) {
      if (isAbortError(error) || !isCurrentOutcome(started.generation, capturedBusinessId)) {
        return { status: 'ignored' }
      }

      return {
        status: 'error',
        message: getRecommendationActionErrorMessage(error),
      }
    } finally {
      finish(started.generation)
    }
  }

  async function accept(): Promise<RecommendationActionAttempt> {
    const started = tryBegin()
    if (!started) {
      return { status: 'busy' }
    }

    const businessId = deps.getBusinessId()
    const userId = parseActorUserId(deps.getUserId())
    const recommendationId = deps.getRecommendationId()

    if (!businessId) {
      finish(started.generation)
      return { status: 'error', message: ru.today.actionFailed }
    }

    if (!userId) {
      finish(started.generation)
      return { status: 'error', message: ru.today.missingUser }
    }

    return runRequest(
      businessId,
      (signal) =>
        deps.api.acceptRecommendation({
          businessId,
          recommendationId,
          decidedById: userId,
          signal,
        }),
      started,
    )
  }

  async function snoozePreset(preset: SnoozePresetKey): Promise<RecommendationActionAttempt> {
    const snoozedUntil = snoozePresetUntil(preset)
    if (!snoozedUntil) {
      return { status: 'error', message: ru.today.invalidSnoozeDate }
    }

    return snoozeUntil(snoozedUntil)
  }

  async function snoozeDate(dateInput: string): Promise<RecommendationActionAttempt> {
    const snoozedUntil = snoozeCustomDateUntil(dateInput)
    if (!snoozedUntil) {
      return { status: 'error', message: ru.today.invalidSnoozeDate }
    }

    return snoozeUntil(snoozedUntil)
  }

  async function snoozeUntil(snoozedUntil: string): Promise<RecommendationActionAttempt> {
    const started = tryBegin()
    if (!started) {
      return { status: 'busy' }
    }

    const businessId = deps.getBusinessId()
    const recommendationId = deps.getRecommendationId()
    if (!businessId) {
      finish(started.generation)
      return { status: 'error', message: ru.today.actionFailed }
    }

    return runRequest(
      businessId,
      (signal) =>
        deps.api.snoozeRecommendation({
          businessId,
          recommendationId,
          snoozedUntil,
          signal,
        }),
      started,
    )
  }

  async function modify(decisionTitleInput: unknown): Promise<RecommendationActionAttempt> {
    const started = tryBegin()
    if (!started) {
      return { status: 'busy' }
    }

    const businessId = deps.getBusinessId()
    const userId = parseActorUserId(deps.getUserId())
    const recommendationId = deps.getRecommendationId()
    const decisionTitle = parseDecisionTitle(decisionTitleInput)

    if (!businessId) {
      finish(started.generation)
      return { status: 'error', message: ru.today.actionFailed }
    }

    if (!userId) {
      finish(started.generation)
      return { status: 'error', message: ru.today.missingUser }
    }

    if (!decisionTitle) {
      finish(started.generation)
      return { status: 'error', message: ru.today.invalidDecisionTitle }
    }

    return runRequest(
      businessId,
      (signal) =>
        deps.api.modifyRecommendation({
          businessId,
          recommendationId,
          decidedById: userId,
          decisionTitle,
          signal,
        }),
      started,
    )
  }

  async function reject(
    reasonInput: unknown,
    commentInput: unknown,
  ): Promise<RecommendationActionAttempt> {
    const started = tryBegin()
    if (!started) {
      return { status: 'busy' }
    }

    const businessId = deps.getBusinessId()
    const recommendationId = deps.getRecommendationId()
    const rejectionReason = parseRejectionReason(reasonInput)
    if (!businessId || !rejectionReason) {
      finish(started.generation)
      return {
        status: 'error',
        message: businessId
          ? ru.today.actionErrors.invalidRejectionReason
          : ru.today.actionFailed,
      }
    }

    const comment = parseRejectionComment(rejectionReason, commentInput)
    if (!comment.ok) {
      finish(started.generation)
      return { status: 'error', message: ru.today.invalidRejectionComment }
    }

    return runRequest(
      businessId,
      (signal) =>
        deps.api.rejectRecommendation({
          businessId,
          recommendationId,
          rejectionReason,
          ...(comment.comment === undefined
            ? {}
            : { rejectionComment: comment.comment }),
          signal,
        }),
      started,
    )
  }

  return {
    isSubmitting: () => inFlight,
    abort,
    accept,
    snoozePreset,
    snoozeDate,
    modify,
    reject,
  }
}

export function useRecommendationActions(input: {
  recommendationId: string
  onSuccess: () => void
}) {
  const { businessId } = useCurrentBusiness()
  const { userId } = useCurrentUser()
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const businessIdRef = useRef(businessId)
  const userIdRef = useRef(userId)
  const onSuccessRef = useRef(input.onSuccess)

  businessIdRef.current = businessId
  userIdRef.current = userId
  onSuccessRef.current = input.onSuccess

  const recommendationIdRef = useRef(input.recommendationId)
  recommendationIdRef.current = input.recommendationId

  const handlersRef = useRef(
    createRecommendationActionHandlers({
      getBusinessId: () => businessIdRef.current,
      getUserId: () => userIdRef.current,
      getRecommendationId: () => recommendationIdRef.current,
      isCurrent: () => mountedRef.current,
      api: {
        acceptRecommendation,
        snoozeRecommendation,
        modifyRecommendation,
        rejectRecommendation,
      },
      onSuccess: () => {
        onSuccessRef.current()
      },
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
  }, [businessId])

  const run = useCallback(
    async (
      action: () => Promise<RecommendationActionAttempt>,
    ): Promise<RecommendationActionAttempt> => {
      setActionError(null)
      setSubmitting(true)
      const result = await action()
      if (mountedRef.current && businessIdRef.current === businessId) {
        setSubmitting(handlersRef.current.isSubmitting())
        if (result.status === 'error') {
          setActionError(result.message)
        }
      }
      return result
    },
    [businessId],
  )

  return {
    submitting,
    actionError,
    accept: () => run(() => handlersRef.current.accept()),
    snoozePreset: (preset: SnoozePresetKey) =>
      run(() => handlersRef.current.snoozePreset(preset)),
    snoozeDate: (dateInput: string) =>
      run(() => handlersRef.current.snoozeDate(dateInput)),
    modify: (decisionTitle: string) =>
      run(() => handlersRef.current.modify(decisionTitle)),
    reject: (reason: RecommendationRejectionReason, comment: string) =>
      run(() => handlersRef.current.reject(reason, comment)),
    clearActionError: () => setActionError(null),
  }
}
