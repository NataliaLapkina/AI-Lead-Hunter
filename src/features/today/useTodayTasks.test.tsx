/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissingTimeZoneError } from '@/domain/tasks/browserTimeZone'
import type { TodayTasks } from '@/domain/tasks/todayTask'
import { ru } from '@/i18n/ru'
import { TodayTasksSection } from './TodayTasksSection'
import { useTodayTasks } from './useTodayTasks'

const session = vi.hoisted(() => ({
  businessId: 'biz_1' as string | null,
  timeZone: 'Pacific/Auckland' as string | undefined,
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: session.businessId }),
}))

vi.mock('@/domain/tasks/browserTimeZone', async () => {
  const actual = await vi.importActual<typeof import('@/domain/tasks/browserTimeZone')>(
    '@/domain/tasks/browserTimeZone',
  )

  return {
    ...actual,
    readBrowserTimeZone: () => actual.readBrowserTimeZone(() => session.timeZone),
  }
})

vi.mock('@/services/api/listTodayTasks', () => ({
  listTodayTasks: vi.fn(),
}))

import { listTodayTasks } from '@/services/api/listTodayTasks'

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => {}
  let rejectPromise: (error: unknown) => void = () => {}
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  }
}

function tasksNamed(title: string): TodayTasks {
  return {
    tasks: [
      {
        id: title,
        title,
        status: 'TODO',
        dueAt: '2026-10-11T09:30:00.000Z',
        priority: 'MEDIUM',
        isOverdue: false,
        company: null,
        decision: null,
      },
    ],
  }
}

describe('useTodayTasks', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.mocked(listTodayTasks).mockReset()
    session.businessId = 'biz_1'
    session.timeZone = 'Pacific/Auckland'
  })

  it('requests tasks for the current business and browser timezone', async () => {
    vi.mocked(listTodayTasks).mockResolvedValue({ tasks: [] })

    renderHook(() => useTodayTasks())

    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledWith(
        'biz_1',
        'Pacific/Auckland',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })
  })

  it('reloads for the new businessId and does not keep the previous request', async () => {
    vi.mocked(listTodayTasks).mockResolvedValue({ tasks: [] })

    const { rerender } = renderHook(() => useTodayTasks())
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledWith(
        'biz_1',
        'Pacific/Auckland',
        expect.any(Object),
      )
    })

    session.businessId = 'biz_2'
    rerender()

    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledWith(
        'biz_2',
        'Pacific/Auckland',
        expect.any(Object),
      )
    })
  })

  it('does not call the API when the browser timezone is unusable', async () => {
    session.timeZone = '   '

    const { result } = renderHook(() => useTodayTasks())

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(MissingTimeZoneError)
    })
    expect(result.current.isLoading).toBe(false)
    expect(listTodayTasks).not.toHaveBeenCalled()
  })

  it('keeps business B data when a late business A response arrives', async () => {
    const businessA = deferred<TodayTasks>()
    const businessB = deferred<TodayTasks>()
    vi.mocked(listTodayTasks).mockImplementation((businessId) =>
      businessId === 'biz_a' ? businessA.promise : businessB.promise,
    )
    session.businessId = 'biz_a'

    const view = render(<TodayTasksSection />)
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledWith('biz_a', 'Pacific/Auckland', expect.any(Object))
    })

    session.businessId = 'biz_b'
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledWith('biz_b', 'Pacific/Auckland', expect.any(Object))
    })

    businessB.resolve(tasksNamed('Задача B'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Задача B' })).toBeTruthy()
    })

    await act(async () => {
      businessA.resolve(tasksNamed('Задача A'))
      await businessA.promise
    })

    expect(screen.getByRole('heading', { name: 'Задача B' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Задача A' })).toBeNull()
  })

  it('keeps business B success when a late business A error arrives', async () => {
    const businessA = deferred<TodayTasks>()
    const businessB = deferred<TodayTasks>()
    vi.mocked(listTodayTasks).mockImplementation((businessId) =>
      businessId === 'biz_a' ? businessA.promise : businessB.promise,
    )
    session.businessId = 'biz_a'

    const view = render(<TodayTasksSection />)
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_b'
    view.rerender(<TodayTasksSection />)
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledTimes(2)
    })

    businessB.resolve(tasksNamed('Задача B'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Задача B' })).toBeTruthy()
    })

    await act(async () => {
      businessA.reject(new Error('business A failed'))
      await businessA.promise.catch(() => undefined)
    })

    expect(screen.getByRole('heading', { name: 'Задача B' })).toBeTruthy()
    expect(screen.queryByText(ru.today.tasksLoadError)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Задача A' })).toBeNull()
  })

  it('replaces the error with tasks after retry', async () => {
    const failed = deferred<TodayTasks>()
    const retried = deferred<TodayTasks>()
    vi.mocked(listTodayTasks)
      .mockImplementationOnce(() => failed.promise)
      .mockImplementationOnce(() => retried.promise)

    render(<TodayTasksSection />)
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      failed.reject(new Error('first request failed'))
      await failed.promise.catch(() => undefined)
    })
    expect(screen.getByText(ru.today.tasksLoadError)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: ru.today.retry }))
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledTimes(2)
    })

    retried.resolve(tasksNamed('Задача после повтора'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Задача после повтора' })).toBeTruthy()
    })
    expect(screen.queryByText(ru.today.tasksLoadError)).toBeNull()
    expect(screen.queryByRole('button', { name: ru.today.retry })).toBeNull()
  })

  it('ignores an older pending request after a newer refetch succeeds', async () => {
    const older = deferred<TodayTasks>()
    const newer = deferred<TodayTasks>()
    vi.mocked(listTodayTasks)
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise)

    const { result } = renderHook(() => useTodayTasks())
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.refetch()
    })
    await waitFor(() => {
      expect(listTodayTasks).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      newer.resolve(tasksNamed('Новый результат'))
      await newer.promise
    })
    await waitFor(() => {
      expect(result.current.data?.tasks[0]?.title).toBe('Новый результат')
    })

    await act(async () => {
      older.resolve(tasksNamed('Старый результат'))
      await older.promise
    })

    expect(result.current.data?.tasks[0]?.title).toBe('Новый результат')
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('does not surface a request that settles after unmount', async () => {
    const pending = deferred<TodayTasks>()
    vi.mocked(listTodayTasks).mockImplementation(() => pending.promise)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const view = render(<TodayTasksSection />)
    await waitFor(() => {
      expect(screen.getByText(ru.common.loading)).toBeTruthy()
    })
    const signal = vi.mocked(listTodayTasks).mock.calls[0]?.[2]?.signal

    view.unmount()

    await act(async () => {
      pending.resolve(tasksNamed('Задача после размонтирования'))
      await pending.promise
    })

    expect(signal?.aborted).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Задача после размонтирования' })).toBeNull()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('shows the timezone error and skips the request for an invalid IANA name', async () => {
    session.timeZone = 'Not/AZone'

    render(<TodayTasksSection />)

    await waitFor(() => {
      expect(screen.getByText(ru.today.missingTimeZone)).toBeTruthy()
    })
    expect(screen.queryByText(ru.today.tasksLoadError)).toBeNull()
    expect(screen.queryByText(ru.common.loading)).toBeNull()
    expect(listTodayTasks).not.toHaveBeenCalled()
  })
})
