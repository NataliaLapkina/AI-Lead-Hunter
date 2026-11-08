/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TodayAttention, TodayAttentionItem } from '@/domain/tasks/todayAttention'
import { createdTaskFixture } from '@/domain/tasks/task.fixture'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'
import { TodayAttentionSection } from './TodayAttentionSection'
import { useTodayAttention } from './useTodayAttention'

const session = vi.hoisted(() => ({
  businessId: 'biz_1' as string | null,
  userId: 'user_1' as string | null,
}))

const refetchTasks = vi.hoisted(() => vi.fn())

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: session.businessId }),
}))

vi.mock('@/features/user/CurrentUserContext', () => ({
  useCurrentUser: () => ({ userId: session.userId }),
}))

vi.mock('@/services/api/listTodayAttention', () => ({
  listTodayAttention: vi.fn(),
}))

vi.mock('@/services/api/createTaskFromDecision', () => ({
  createTaskFromDecision: vi.fn(),
}))

import { createTaskFromDecision } from '@/services/api/createTaskFromDecision'
import { listTodayAttention } from '@/services/api/listTodayAttention'

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => {}
  let rejectPromise: (error: unknown) => void = () => {}
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

function item(overrides: Partial<TodayAttentionItem> = {}): TodayAttentionItem {
  return {
    id: 'task_1',
    completedAt: '2026-09-01T10:00:00.000Z',
    completionOutcome: 'FOLLOW_UP',
    title: 'Позвонить ещё раз',
    company: { id: 'company_1', name: 'Северная верфь' },
    decision: { id: 'decision_1', title: 'Вернуться к компании', status: 'ACTIVE' },
    ...overrides,
  }
}

function attention(items: TodayAttentionItem[]): TodayAttention {
  return { items }
}

describe('useTodayAttention', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
    session.userId = 'user_1'
  })

  it('loads and shows an empty list', async () => {
    const pending = deferred<TodayAttention>()
    vi.mocked(listTodayAttention).mockImplementationOnce(() => pending.promise)

    render(<TodayAttentionSection />)
    expect(screen.getByRole('heading', { name: ru.today.needsAttention })).toBeTruthy()
    expect(screen.getByText(ru.common.loading)).toBeTruthy()

    await act(async () => {
      pending.resolve(attention([]))
      await pending.promise
    })
    expect(screen.getByText(ru.today.emptyNeedsAttention)).toBeTruthy()
  })

  it('shows the load error and retries', async () => {
    vi.mocked(listTodayAttention)
      .mockRejectedValueOnce(new Error('TASK_NOT_FOUND'))
      .mockResolvedValueOnce(attention([item()]))

    render(<TodayAttentionSection />)
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.attentionLoadError)
    })
    expect(screen.queryByText('TASK_NOT_FOUND')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.today.retry }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ignores a late success from the previous business', async () => {
    const businessA = deferred<TodayAttention>()
    const businessB = deferred<TodayAttention>()
    vi.mocked(listTodayAttention)
      .mockImplementationOnce(() => businessA.promise)
      .mockImplementationOnce(() => businessB.promise)

    const view = renderHook(() => useTodayAttention())
    await waitFor(() => {
      expect(listTodayAttention).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_2'
    view.rerender()
    await waitFor(() => {
      expect(listTodayAttention).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      businessB.resolve(attention([item({ title: 'Новый бизнес' })]))
      await businessB.promise
    })
    await act(async () => {
      businessA.resolve(attention([item({ title: 'Старый бизнес' })]))
      await businessA.promise
    })

    expect(view.result.current.data?.items[0]?.title).toBe('Новый бизнес')
    expect(view.result.current.error).toBeNull()
  })

  it('ignores a late error after a business switch', async () => {
    const businessA = deferred<TodayAttention>()
    const businessB = deferred<TodayAttention>()
    vi.mocked(listTodayAttention)
      .mockImplementationOnce(() => businessA.promise)
      .mockImplementationOnce(() => businessB.promise)

    const view = renderHook(() => useTodayAttention())
    await waitFor(() => {
      expect(listTodayAttention).toHaveBeenCalledWith(
        'biz_1',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    session.businessId = 'biz_2'
    view.rerender()
    await waitFor(() => {
      expect(listTodayAttention).toHaveBeenCalledWith('biz_2', expect.any(Object))
    })

    await act(async () => {
      businessA.reject(new Error('stale failure'))
      await businessA.promise.catch(() => undefined)
    })
    expect(view.result.current.error).toBeNull()
    expect(view.result.current.data).toBeNull()

    await act(async () => {
      businessB.resolve(attention([item({ title: 'Новый бизнес' })]))
      await businessB.promise
    })
    await waitFor(() => {
      expect(view.result.current.data?.items[0]?.title).toBe('Новый бизнес')
    })
    expect(view.result.current.error).toBeNull()
  })

  it('does not apply a response after unmount', async () => {
    const pending = deferred<TodayAttention>()
    vi.mocked(listTodayAttention).mockImplementation(() => pending.promise)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(<TodayAttentionSection />)
    await waitFor(() => {
      expect(screen.getByText(ru.common.loading)).toBeTruthy()
    })
    const signal = vi.mocked(listTodayAttention).mock.calls[0]?.[1]?.signal

    view.unmount()
    await act(async () => {
      pending.resolve(attention([item()]))
      await pending.promise
    })

    expect(signal?.aborted).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('TodayAttentionSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
    session.userId = 'user_1'
  })

  it('prefers the company name, then the decision, then the task title', async () => {
    vi.mocked(listTodayAttention).mockResolvedValue(
      attention([
        item(),
        item({
          id: 'task_2',
          title: 'Написать письмо',
          company: null,
          decision: { id: 'decision_2', title: 'Решение без компании', status: 'ACTIVE' },
        }),
        item({
          id: 'task_3',
          title: 'Только задача',
          company: null,
          decision: null,
        }),
      ]),
    )

    render(<TodayAttentionSection />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    })
    expect(screen.getByText('Позвонить ещё раз')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Решение без компании' })).toBeTruthy()
    expect(screen.getByText('Написать письмо')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Только задача' })).toBeTruthy()
    expect(screen.getAllByText(ru.today.attentionFollowUp)).toHaveLength(3)
    expect(screen.getAllByText(formatDateTime('2026-09-01T10:00:00.000Z')).length).toBeGreaterThan(0)
    expect(screen.queryByText('task_1')).toBeNull()
    expect(screen.queryByText('company_1')).toBeNull()
  })

  it('shows create task only for an active decision and reuses the existing form', async () => {
    const first = deferred<TodayAttention>()
    const refreshed = deferred<TodayAttention>()
    vi.mocked(listTodayAttention)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => refreshed.promise)
    vi.mocked(createTaskFromDecision).mockResolvedValue({ task: createdTaskFixture })

    render(<TodayAttentionSection onTasksRefetch={refetchTasks} />)
    await act(async () => {
      first.resolve(
        attention([
          item(),
          item({
            id: 'task_completed',
            company: null,
            decision: { id: 'decision_completed', title: 'Завершённое', status: 'COMPLETED' },
          }),
          item({
            id: 'task_cancelled',
            company: null,
            decision: { id: 'decision_cancelled', title: 'Отменённое', status: 'CANCELLED' },
          }),
          item({
            id: 'task_superseded',
            company: null,
            decision: { id: 'decision_superseded', title: 'Заменённое', status: 'SUPERSEDED' },
          }),
          item({
            id: 'task_plain',
            title: 'Без решения',
            company: null,
            decision: null,
          }),
        ]),
      )
      await first.promise
    })

    expect(screen.getAllByRole('button', { name: ru.today.actions.createTask })).toHaveLength(1)
    expect(createTaskFromDecision).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    expect(createTaskFromDecision).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))

    await waitFor(() => {
      expect(createTaskFromDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'biz_1',
          decisionId: 'decision_1',
          command: expect.objectContaining({
            createdById: 'user_1',
            title: 'Вернуться к компании',
            priority: 'MEDIUM',
          }),
        }),
      )
    })
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()

    await waitFor(() => {
      expect(listTodayAttention).toHaveBeenCalledTimes(2)
      expect(refetchTasks).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      refreshed.resolve(attention([]))
      await refreshed.promise
    })
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    })
    expect(screen.getByText(ru.today.emptyNeedsAttention)).toBeTruthy()
  })

  it('does not reopen the create form after a business switch with the same item id', async () => {
    const businessA = deferred<TodayAttention>()
    const businessB = deferred<TodayAttention>()
    vi.mocked(listTodayAttention)
      .mockImplementationOnce(() => businessA.promise)
      .mockImplementationOnce(() => businessB.promise)

    const view = render(<TodayAttentionSection />)
    await act(async () => {
      businessA.resolve(attention([item()]))
      await businessA.promise
    })

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    expect(screen.getByLabelText(ru.today.taskTitle)).toBeTruthy()
    expect(createTaskFromDecision).not.toHaveBeenCalled()

    session.businessId = 'biz_2'
    view.rerender(<TodayAttentionSection />)
    await act(async () => {
      businessB.resolve(
        attention([
          item({
            company: { id: 'company_2', name: 'Южный док' },
            decision: { id: 'decision_2', title: 'Другое решение', status: 'ACTIVE' },
          }),
        ]),
      )
      await businessB.promise
    })

    expect(screen.queryByLabelText(ru.today.taskTitle)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Южный док' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    expect(screen.getByLabelText(ru.today.taskTitle)).toBeTruthy()
    expect(createTaskFromDecision).not.toHaveBeenCalled()
  })

  it('ignores a create result from the previous business', async () => {
    const businessA = deferred<TodayAttention>()
    const businessB = deferred<TodayAttention>()
    const created = deferred<{ task: typeof createdTaskFixture }>()
    vi.mocked(listTodayAttention)
      .mockImplementationOnce(() => businessA.promise)
      .mockImplementationOnce(() => businessB.promise)
    vi.mocked(createTaskFromDecision).mockImplementation(() => created.promise)

    const view = render(<TodayAttentionSection onTasksRefetch={refetchTasks} />)
    await act(async () => {
      businessA.resolve(attention([item()]))
      await businessA.promise
    })

    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.dueTomorrow }))
    fireEvent.click(screen.getByRole('button', { name: ru.today.actions.createTask }))
    await waitFor(() => {
      expect(createTaskFromDecision).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_2'
    view.rerender(<TodayAttentionSection onTasksRefetch={refetchTasks} />)
    await act(async () => {
      businessB.resolve(
        attention([
          item({
            company: { id: 'company_2', name: 'Южный док' },
            decision: { id: 'decision_2', title: 'Другое решение', status: 'ACTIVE' },
          }),
        ]),
      )
      await businessB.promise
    })
    expect(listTodayAttention).toHaveBeenCalledTimes(2)
    expect(refetchTasks).not.toHaveBeenCalled()

    await act(async () => {
      created.resolve({ task: createdTaskFixture })
      await created.promise
    })

    expect(listTodayAttention).toHaveBeenCalledTimes(2)
    expect(listTodayAttention).toHaveBeenLastCalledWith('biz_2', expect.any(Object))
    expect(refetchTasks).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByLabelText(ru.today.taskTitle)).toBeNull()
    expect(screen.getByRole('button', { name: ru.today.actions.createTask })).toBeTruthy()
  })
})
