/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TodayDeferred, TodayDeferredItem } from '@/domain/recommendations/todayDeferred'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'
import { TodayDeferredSection } from './TodayDeferredSection'
import { useTodayDeferred } from './useTodayDeferred'

const session = vi.hoisted(() => ({
  businessId: 'biz_1' as string | null,
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: session.businessId }),
}))

vi.mock('@/services/api/listTodayDeferred', () => ({
  listTodayDeferred: vi.fn(),
}))

import { listTodayDeferred } from '@/services/api/listTodayDeferred'

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => {}
  let rejectPromise: (error: unknown) => void = () => {}
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

function item(overrides: Partial<TodayDeferredItem> = {}): TodayDeferredItem {
  return {
    id: 'recommendation_1',
    title: 'Вернуться к решению',
    status: 'VIEWED',
    snoozedUntil: '2026-11-10T11:30:00.000Z',
    company: { id: 'company_1', name: 'Северная верфь' },
    ...overrides,
  }
}

function list(items: TodayDeferredItem[]): TodayDeferred {
  return { items }
}

function deferredUntil(snoozedUntil: string): string {
  return ru.today.deferredUntil.replace('{when}', formatDateTime(snoozedUntil))
}

describe('useTodayDeferred', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
  })

  it('loads and shows an empty list', async () => {
    const pending = deferred<TodayDeferred>()
    vi.mocked(listTodayDeferred).mockImplementationOnce(() => pending.promise)

    render(<TodayDeferredSection />)
    expect(screen.getByRole('heading', { name: ru.today.deferred })).toBeTruthy()
    expect(screen.getByText(ru.common.loading)).toBeTruthy()

    await act(async () => {
      pending.resolve(list([]))
      await pending.promise
    })
    expect(screen.getByText(ru.today.emptyDeferred)).toBeTruthy()
  })

  it('shows the load error and retries', async () => {
    vi.mocked(listTodayDeferred)
      .mockRejectedValueOnce(new Error('BUSINESS_NOT_FOUND'))
      .mockResolvedValueOnce(list([item()]))

    render(<TodayDeferredSection />)
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.today.deferredLoadError)
    })
    expect(screen.queryByText('BUSINESS_NOT_FOUND')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.today.retry }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('replaces shown items when a refetch returns an empty list', async () => {
    const first = deferred<TodayDeferred>()
    const refreshed = deferred<TodayDeferred>()
    vi.mocked(listTodayDeferred)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => refreshed.promise)

    const view = renderHook(() => useTodayDeferred())
    await act(async () => {
      first.resolve(list([item()]))
      await first.promise
    })
    expect(view.result.current.data?.items).toHaveLength(1)

    act(() => {
      view.result.current.refetch()
    })
    await act(async () => {
      refreshed.resolve(list([]))
      await refreshed.promise
    })

    await waitFor(() => {
      expect(view.result.current.data?.items).toEqual([])
    })
    expect(view.result.current.error).toBeNull()
  })

  it('ignores a late success from the previous business', async () => {
    const businessA = deferred<TodayDeferred>()
    const businessB = deferred<TodayDeferred>()
    vi.mocked(listTodayDeferred)
      .mockImplementationOnce(() => businessA.promise)
      .mockImplementationOnce(() => businessB.promise)

    const view = renderHook(() => useTodayDeferred())
    await waitFor(() => {
      expect(listTodayDeferred).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_2'
    view.rerender()
    await waitFor(() => {
      expect(listTodayDeferred).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      businessB.resolve(list([item({ title: 'Новый бизнес' })]))
      await businessB.promise
    })
    await act(async () => {
      businessA.resolve(list([item({ title: 'Старый бизнес' })]))
      await businessA.promise
    })

    expect(view.result.current.data?.items[0]?.title).toBe('Новый бизнес')
    expect(view.result.current.error).toBeNull()
  })

  it('ignores a late error after a business switch', async () => {
    const businessA = deferred<TodayDeferred>()
    const businessB = deferred<TodayDeferred>()
    vi.mocked(listTodayDeferred)
      .mockImplementationOnce(() => businessA.promise)
      .mockImplementationOnce(() => businessB.promise)

    const view = renderHook(() => useTodayDeferred())
    await waitFor(() => {
      expect(listTodayDeferred).toHaveBeenCalledWith(
        'biz_1',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    session.businessId = 'biz_2'
    view.rerender()
    await waitFor(() => {
      expect(listTodayDeferred).toHaveBeenCalledWith('biz_2', expect.any(Object))
    })

    await act(async () => {
      businessA.reject(new Error('stale failure'))
      await businessA.promise.catch(() => undefined)
    })
    expect(view.result.current.error).toBeNull()
    expect(view.result.current.data).toBeNull()

    await act(async () => {
      businessB.resolve(list([item({ title: 'Новый бизнес' })]))
      await businessB.promise
    })
    await waitFor(() => {
      expect(view.result.current.data?.items[0]?.title).toBe('Новый бизнес')
    })
    expect(view.result.current.error).toBeNull()
  })

  it('does not apply a response after unmount', async () => {
    const pending = deferred<TodayDeferred>()
    vi.mocked(listTodayDeferred).mockImplementation(() => pending.promise)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(<TodayDeferredSection />)
    await waitFor(() => {
      expect(screen.getByText(ru.common.loading)).toBeTruthy()
    })
    const signal = vi.mocked(listTodayDeferred).mock.calls[0]?.[1]?.signal

    view.unmount()
    await act(async () => {
      pending.resolve(list([item()]))
      await pending.promise
    })

    expect(signal?.aborted).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('TodayDeferredSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
  })

  it('prefers the company name and shows the recommendation title only when it differs', async () => {
    vi.mocked(listTodayDeferred).mockResolvedValue(
      list([
        item(),
        item({
          id: 'recommendation_2',
          title: 'Только рекомендация',
          status: 'NEW',
          company: null,
        }),
      ]),
    )

    render(<TodayDeferredSection />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    })
    expect(screen.getByText('Вернуться к решению')).toBeTruthy()
    expect(screen.getAllByText('Только рекомендация')).toHaveLength(1)
    expect(screen.getAllByText(deferredUntil('2026-11-10T11:30:00.000Z'))).toHaveLength(2)
    expect(screen.queryByText('recommendation_1')).toBeNull()
    expect(screen.queryByText('company_1')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('hides a rendered card when the next read returns no items', async () => {
    const first = deferred<TodayDeferred>()
    const next = deferred<TodayDeferred>()
    vi.mocked(listTodayDeferred)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => next.promise)

    const view = render(<TodayDeferredSection />)
    await act(async () => {
      first.resolve(list([item()]))
      await first.promise
    })
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Вернуть сейчас' })).toBeNull()

    session.businessId = 'biz_2'
    view.rerender(<TodayDeferredSection />)
    await act(async () => {
      next.resolve(list([]))
      await next.promise
    })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    })
    expect(screen.getByText(ru.today.emptyDeferred)).toBeTruthy()
  })
})
