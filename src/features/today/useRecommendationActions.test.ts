import { describe, expect, it, vi } from 'vitest'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import {
  createRecommendationActionHandlers,
  type RecommendationActionApi,
} from './useRecommendationActions'

function createApi(overrides: Partial<RecommendationActionApi> = {}): RecommendationActionApi {
  return {
    acceptRecommendation: vi.fn().mockResolvedValue({}),
    snoozeRecommendation: vi.fn().mockResolvedValue({}),
    modifyRecommendation: vi.fn().mockResolvedValue({}),
    rejectRecommendation: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
}

function createHandlers(options?: {
  businessId?: string | null
  userId?: string | null
  recommendationId?: string
  api?: RecommendationActionApi
  onSuccess?: (businessId: string) => void
  isCurrent?: () => boolean
}) {
  let businessId = options?.businessId === undefined ? 'biz_1' : options.businessId
  const api = options?.api ?? createApi()
  const onSuccess = options?.onSuccess ?? vi.fn()

  const handlers = createRecommendationActionHandlers({
    getBusinessId: () => businessId,
    getUserId: () => (options?.userId === undefined ? 'user_1' : options.userId),
    getRecommendationId: () => options?.recommendationId ?? 'rec_1',
    isCurrent: options?.isCurrent ?? (() => true),
    api,
    onSuccess,
  })

  return {
    handlers,
    api,
    onSuccess,
    setBusinessId: (next: string | null) => {
      businessId = next
    },
  }
}

describe('createRecommendationActionHandlers', () => {
  it('accepts with the current user and refetches the current Business', async () => {
    const { handlers, api, onSuccess } = createHandlers()

    await expect(handlers.accept()).resolves.toEqual({ status: 'success' })
    expect(api.acceptRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz_1',
        recommendationId: 'rec_1',
        decidedById: 'user_1',
      }),
    )
    expect(onSuccess).toHaveBeenCalledWith('biz_1')
  })

  it('does not POST Accept or Modify without a userId', async () => {
    const { handlers, api, onSuccess } = createHandlers({ userId: null })

    await expect(handlers.accept()).resolves.toEqual({
      status: 'error',
      message: ru.today.missingUser,
    })
    await expect(handlers.modify('Позвонить')).resolves.toEqual({
      status: 'error',
      message: ru.today.missingUser,
    })
    expect(api.acceptRecommendation).not.toHaveBeenCalled()
    expect(api.modifyRecommendation).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('keeps the card when Accept fails and maps the backend code', async () => {
    const api = createApi({
      acceptRecommendation: vi.fn().mockRejectedValue(
        new BackendApiError(409, 'RECOMMENDATION_STATUS_CONFLICT', 'raw', {}),
      ),
    })
    const { handlers, onSuccess } = createHandlers({ api })

    await expect(handlers.accept()).resolves.toEqual({
      status: 'error',
      message: ru.today.actionErrors.statusConflict,
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('snoozes with actorless preset instants', async () => {
    const { handlers, api } = createHandlers()

    await expect(handlers.snoozePreset('tomorrow')).resolves.toEqual({
      status: 'success',
    })
    await handlers.snoozePreset('inThreeDays')
    await handlers.snoozePreset('inOneWeek')

    expect(api.snoozeRecommendation).toHaveBeenCalledTimes(3)
    for (const [input] of vi.mocked(api.snoozeRecommendation).mock.calls) {
      expect(input).not.toHaveProperty('decidedById')
      expect(input.snoozedUntil).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
      )
    }
  })

  it('does not POST an invalid or past snooze date', async () => {
    const { handlers, api } = createHandlers()

    await expect(handlers.snoozeDate('')).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidSnoozeDate,
    })
    await expect(handlers.snoozeDate('2020-01-01')).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidSnoozeDate,
    })
    expect(api.snoozeRecommendation).not.toHaveBeenCalled()
  })

  it('trims Modify and rejects empty or too-long titles before POST', async () => {
    const { handlers, api } = createHandlers()

    await expect(handlers.modify('   ')).resolves.toMatchObject({ status: 'error' })
    await expect(handlers.modify('и'.repeat(501))).resolves.toMatchObject({
      status: 'error',
    })
    expect(api.modifyRecommendation).not.toHaveBeenCalled()

    await expect(handlers.modify('  Позвонить  ')).resolves.toEqual({ status: 'success' })
    expect(api.modifyRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({ decisionTitle: 'Позвонить' }),
    )
  })

  it('covers every rejection reason and omits rejectionComment except OTHER', async () => {
    const { handlers, api } = createHandlers()
    const nonOther = [
      'NOT_RELEVANT',
      'ALREADY_DONE',
      'NOT_SUITABLE_FOR_COMPANY',
      'NOT_PRIORITY',
    ] as const

    for (const reason of nonOther) {
      vi.mocked(api.rejectRecommendation).mockClear()
      await expect(handlers.reject(reason, '  не должно уйти  ')).resolves.toEqual({
        status: 'success',
      })
      expect(api.rejectRecommendation).toHaveBeenCalledTimes(1)
      const body = vi.mocked(api.rejectRecommendation).mock.calls[0]?.[0]
      expect(body).toMatchObject({ rejectionReason: reason })
      expect(body).not.toHaveProperty('rejectionComment')
    }

    vi.mocked(api.rejectRecommendation).mockClear()
    await expect(handlers.reject('OTHER', '   ')).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidRejectionComment,
    })
    await expect(handlers.reject('OTHER', '')).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidRejectionComment,
    })
    expect(api.rejectRecommendation).not.toHaveBeenCalled()

    await expect(handlers.reject('OTHER', '  Нужен другой формат  ')).resolves.toEqual({
      status: 'success',
    })
    expect(api.rejectRecommendation).toHaveBeenCalledWith(
      expect.objectContaining({
        rejectionReason: 'OTHER',
        rejectionComment: 'Нужен другой формат',
      }),
    )
  })

  it('does not start a second request while one is in flight', async () => {
    let resolveAccept: ((value: unknown) => void) | undefined
    const api = createApi({
      acceptRecommendation: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveAccept = resolve
          }),
      ),
    })
    const { handlers } = createHandlers({ api })

    const first = handlers.accept()
    await expect(handlers.accept()).resolves.toEqual({ status: 'busy' })
    expect(api.acceptRecommendation).toHaveBeenCalledTimes(1)

    resolveAccept?.({})
    await expect(first).resolves.toEqual({ status: 'success' })
  })

  it('does not refetch a stale Business after switch', async () => {
    let resolveAccept: ((value: unknown) => void) | undefined
    const api = createApi({
      acceptRecommendation: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveAccept = resolve
          }),
      ),
    })
    const { handlers, onSuccess, setBusinessId } = createHandlers({ api })

    const pending = handlers.accept()
    setBusinessId('biz_2')
    resolveAccept?.({})

    await expect(pending).resolves.toEqual({ status: 'ignored' })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('ignores a late A1 success after A → B → A', async () => {
    let resolveA1: ((value: unknown) => void) | undefined
    const acceptRecommendation = vi.fn()
    acceptRecommendation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveA1 = resolve
        }),
    )
    acceptRecommendation.mockImplementationOnce(() => new Promise(() => {}))
    const { handlers, onSuccess, setBusinessId } = createHandlers({
      businessId: 'biz_A',
      api: createApi({ acceptRecommendation }),
    })

    const a1 = handlers.accept()
    handlers.abort()
    setBusinessId('biz_B')
    setBusinessId('biz_A')
    void handlers.accept()

    resolveA1?.({})

    await expect(a1).resolves.toEqual({ status: 'ignored' })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('ignores a late A1 error after A → B → A', async () => {
    let rejectA1: ((error: Error) => void) | undefined
    const acceptRecommendation = vi.fn()
    acceptRecommendation.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectA1 = reject
        }),
    )
    acceptRecommendation.mockImplementationOnce(() => new Promise(() => {}))
    const { handlers, onSuccess, setBusinessId } = createHandlers({
      businessId: 'biz_A',
      api: createApi({ acceptRecommendation }),
    })

    const a1 = handlers.accept()
    handlers.abort()
    setBusinessId('biz_B')
    setBusinessId('biz_A')
    void handlers.accept()

    rejectA1?.(
      new BackendApiError(409, 'RECOMMENDATION_STATUS_CONFLICT', 'raw', {}),
    )

    await expect(a1).resolves.toEqual({ status: 'ignored' })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('releases the in-flight lock after abort so the next Business can act', async () => {
    let resolveA: ((value: unknown) => void) | undefined
    let resolveB: ((value: unknown) => void) | undefined
    const acceptRecommendation = vi.fn()
    acceptRecommendation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveA = resolve
        }),
    )
    acceptRecommendation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveB = resolve
        }),
    )
    acceptRecommendation.mockResolvedValue({})
    const { handlers, setBusinessId } = createHandlers({ api: createApi({ acceptRecommendation }) })

    const pendingA = handlers.accept()
    handlers.abort()
    setBusinessId('biz_2')

    const pendingB = handlers.accept()
    resolveA?.({})
    await expect(pendingA).resolves.toEqual({ status: 'ignored' })
    await expect(handlers.accept()).resolves.toEqual({ status: 'busy' })
    expect(acceptRecommendation).toHaveBeenCalledTimes(2)

    resolveB?.({})
    await expect(pendingB).resolves.toEqual({ status: 'success' })
    await expect(handlers.accept()).resolves.toEqual({ status: 'success' })
    expect(acceptRecommendation).toHaveBeenCalledTimes(3)
  })

  it('does not surface abort as a user-facing action error', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    const api = createApi({
      acceptRecommendation: vi.fn().mockRejectedValue(abortError),
    })
    const { handlers, onSuccess } = createHandlers({ api })

    await expect(handlers.accept()).resolves.toEqual({ status: 'ignored' })
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
