import { describe, expect, it, vi } from 'vitest'
import { createdTaskFixture } from '@/domain/tasks/task.fixture'
import type { CreateTaskFromDecisionResult } from '@/domain/tasks/task'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import {
  createCreateTaskFromDecisionHandlers,
  type CreateTaskApi,
} from './useCreateTaskFromDecision'

function createApi(overrides: Partial<CreateTaskApi> = {}): CreateTaskApi {
  return {
    createTaskFromDecision: vi.fn().mockResolvedValue({ task: createdTaskFixture }),
    ...overrides,
  }
}

function createHandlers(options?: {
  businessId?: string | null
  userId?: string | null
  decisionId?: string
  continuationIdentity?: number
  api?: CreateTaskApi
  isCurrent?: () => boolean
}) {
  let businessId = options?.businessId === undefined ? 'biz_1' : options.businessId
  let decisionId = options?.decisionId ?? 'dec_1'
  let continuationIdentity = options?.continuationIdentity ?? 1
  const api = options?.api ?? createApi()
  const handlers = createCreateTaskFromDecisionHandlers({
    getBusinessId: () => businessId,
    getUserId: () => (options?.userId === undefined ? 'user_1' : options.userId),
    getDecisionId: () => decisionId,
    getContinuationIdentity: () => continuationIdentity,
    isCurrent: options?.isCurrent ?? (() => true),
    api,
  })

  return {
    handlers,
    api,
    setBusinessId: (next: string | null) => {
      businessId = next
    },
    setDecision: (nextDecisionId: string, nextIdentity: number) => {
      decisionId = nextDecisionId
      continuationIdentity = nextIdentity
      handlers.abort()
    },
  }
}

const validInput = {
  title: '  Позвонить сегодня  ',
  dueOption: 'tomorrow' as const,
  customDate: '',
  priority: 'MEDIUM' as const,
}

describe('createCreateTaskFromDecisionHandlers', () => {
  it('posts CurrentUser and does not send server-derived fields', async () => {
    const { handlers, api } = createHandlers()

    await expect(handlers.submit(validInput)).resolves.toMatchObject({
      status: 'success',
      task: createdTaskFixture,
    })
    expect(api.createTaskFromDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz_1',
        decisionId: 'dec_1',
        command: expect.objectContaining({
          createdById: 'user_1',
          title: 'Позвонить сегодня',
          priority: 'MEDIUM',
        }),
      }),
    )
    const command = vi.mocked(api.createTaskFromDecision).mock.calls[0]?.[0].command
    expect(command).not.toHaveProperty('companyId')
    expect(command).not.toHaveProperty('assignedToId')
    expect(command).not.toHaveProperty('status')
    expect(command).not.toHaveProperty('description')
  })

  it('does not POST without CurrentUser, dueAt, or a valid title', async () => {
    const missingUser = createHandlers({ userId: null })
    await expect(missingUser.handlers.submit(validInput)).resolves.toEqual({
      status: 'error',
      message: ru.today.missingUser,
    })
    expect(missingUser.api.createTaskFromDecision).not.toHaveBeenCalled()

    const { handlers, api } = createHandlers()
    await expect(
      handlers.submit({ ...validInput, dueOption: null }),
    ).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidTaskDueAt,
    })
    await expect(
      handlers.submit({ ...validInput, title: 'и'.repeat(501) }),
    ).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidTaskTitle,
    })
    await expect(
      handlers.submit({
        ...validInput,
        dueOption: 'custom',
        customDate: '2020-01-01',
      }),
    ).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidTaskDueAt,
    })
    await expect(
      handlers.submit({
        ...validInput,
        dueOption: 'custom',
        customDate: '2026-02-30',
      }),
    ).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidTaskDueAt,
    })
    expect(api.createTaskFromDecision).not.toHaveBeenCalled()
  })

  it('maps backend errors and treats abort as ignored', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    const { handlers } = createHandlers({
      api: createApi({
        createTaskFromDecision: vi.fn().mockRejectedValue(
          new BackendApiError(400, 'DUE_AT_NOT_IN_FUTURE', 'raw', {}),
        ),
      }),
    })
    await expect(handlers.submit(validInput)).resolves.toEqual({
      status: 'error',
      message: ru.today.invalidTaskDueAt,
    })

    const aborted = createHandlers({
      api: createApi({
        createTaskFromDecision: vi.fn().mockRejectedValue(abortError),
      }),
    })
    await expect(aborted.handlers.submit(validInput)).resolves.toEqual({
      status: 'ignored',
    })
  })

  it('prevents double submit and ignores stale A → B → A success', async () => {
    let resolveFirst: ((value: CreateTaskFromDecisionResult) => void) | undefined
    let resolveA1: ((value: CreateTaskFromDecisionResult) => void) | undefined
    const createTaskFromDecision = vi.fn()
    createTaskFromDecision.mockImplementationOnce(
      () =>
        new Promise<CreateTaskFromDecisionResult>((resolve) => {
          resolveFirst = resolve
        }),
    )
    const { handlers } = createHandlers({
      api: createApi({ createTaskFromDecision }),
    })
    const first = handlers.submit(validInput)
    await expect(handlers.submit(validInput)).resolves.toEqual({ status: 'busy' })
    resolveFirst?.({ task: createdTaskFixture })
    await expect(first).resolves.toMatchObject({ status: 'success' })

    const createTaskA = vi.fn()
    createTaskA.mockImplementationOnce(
      () =>
        new Promise<CreateTaskFromDecisionResult>((resolve) => {
          resolveA1 = resolve
        }),
    )
    createTaskA.mockImplementationOnce(
      () => new Promise<CreateTaskFromDecisionResult>(() => {}),
    )
    const stale = createHandlers({
      businessId: 'biz_A',
      api: createApi({ createTaskFromDecision: createTaskA }),
    })
    const a1 = stale.handlers.submit(validInput)
    stale.handlers.abort()
    stale.setBusinessId('biz_B')
    stale.setBusinessId('biz_A')
    void stale.handlers.submit(validInput)
    resolveA1?.({ task: createdTaskFixture })
    await expect(a1).resolves.toEqual({ status: 'ignored' })
  })

  it('ignores a stale Create Task error after Business switch', async () => {
    let rejectFirst: ((error: Error) => void) | undefined
    const { handlers, setBusinessId } = createHandlers({
      api: createApi({
        createTaskFromDecision: vi.fn(
          () =>
            new Promise<CreateTaskFromDecisionResult>((_resolve, reject) => {
              rejectFirst = reject
            }),
        ),
      }),
    })
    const pending = handlers.submit(validInput)
    setBusinessId('biz_2')
    rejectFirst?.(new BackendApiError(409, 'DECISION_STATUS_CONFLICT', 'raw', {}))
    await expect(pending).resolves.toEqual({ status: 'ignored' })
  })

  it('ignores late success and error after same-Business Decision replacement', async () => {
    let resolveFirst: ((value: CreateTaskFromDecisionResult) => void) | undefined
    let rejectSecond: ((error: Error) => void) | undefined
    const api = createApi({
      createTaskFromDecision: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<CreateTaskFromDecisionResult>((resolve) => {
              resolveFirst = resolve
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<CreateTaskFromDecisionResult>((_resolve, reject) => {
              rejectSecond = reject
            }),
        ),
    })
    const current = createHandlers({ api })
    const staleSuccess = current.handlers.submit(validInput)
    current.setDecision('dec_2', 2)
    resolveFirst?.({ task: createdTaskFixture })
    await expect(staleSuccess).resolves.toEqual({ status: 'ignored' })

    const staleError = current.handlers.submit(validInput)
    current.setDecision('dec_3', 3)
    rejectSecond?.(new BackendApiError(409, 'DECISION_STATUS_CONFLICT', 'raw', {}))
    await expect(staleError).resolves.toEqual({ status: 'ignored' })
  })
})
