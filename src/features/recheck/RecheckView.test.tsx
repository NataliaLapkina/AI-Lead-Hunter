/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KnowledgeRecheck, KnowledgeRecheckItem } from '@/domain/knowledge/knowledgeRecheck'
import { ru } from '@/i18n/ru'
import { formatDateTime } from '@/lib/utils'
import { RecheckPage } from '@/pages/RecheckPage'
import { useKnowledgeRecheck } from './useKnowledgeRecheck'

const session = vi.hoisted(() => ({
  businessId: 'biz_1' as string | null,
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: session.businessId }),
}))

vi.mock('@/services/api/listKnowledgeRecheck', () => ({
  listKnowledgeRecheck: vi.fn(),
}))

import { listKnowledgeRecheck } from '@/services/api/listKnowledgeRecheck'

function deferred<T>() {
  let resolvePromise: (value: T) => void = () => {}
  let rejectPromise: (error: unknown) => void = () => {}
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

function item(overrides: Partial<KnowledgeRecheckItem> = {}): KnowledgeRecheckItem {
  return {
    knowledgeId: 'knowledge_1',
    content: 'Сайт больше не открывается',
    type: 'FACT',
    verificationStatus: 'OUTDATED',
    sourceLabel: 'Сайт компании',
    sourceUrl: 'https://example.test/about',
    obtainedAt: '2024-02-01T08:30:00.000Z',
    lastCheckedAt: '2024-11-01T12:00:00.000Z',
    company: { id: 'company_1', name: 'Северная верфь' },
    ...overrides,
  }
}

function list(items: KnowledgeRecheckItem[]): KnowledgeRecheck {
  return { items }
}

function dateLabel(template: string, iso: string): string {
  return template.replace('{when}', formatDateTime(iso))
}

function card(heading: string): HTMLElement {
  const title = screen.getByRole('heading', { name: heading })
  const row = title.closest('li')
  if (!row) {
    throw new Error(`Missing card for ${heading}`)
  }

  return row
}

describe('useKnowledgeRecheck', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
  })

  it('starts in loading and then shows an empty list', async () => {
    const pending = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck).mockImplementationOnce(() => pending.promise)

    const view = renderHook(() => useKnowledgeRecheck())
    expect(view.result.current.isLoading).toBe(true)
    expect(view.result.current.data).toBeNull()
    expect(view.result.current.error).toBeNull()

    await act(async () => {
      pending.resolve(list([]))
      await pending.promise
    })

    expect(view.result.current.isLoading).toBe(false)
    expect(view.result.current.data).toEqual({ items: [] })
  })

  it('replaces an error after retry', async () => {
    const failed = deferred<KnowledgeRecheck>()
    const retried = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck)
      .mockImplementationOnce(() => failed.promise)
      .mockImplementationOnce(() => retried.promise)

    const view = renderHook(() => useKnowledgeRecheck())
    await act(async () => {
      failed.reject(new Error('first request failed'))
      await failed.promise.catch(() => undefined)
    })
    expect(view.result.current.error).toBeInstanceOf(Error)
    expect(view.result.current.isLoading).toBe(false)

    act(() => {
      view.result.current.refetch()
    })
    expect(view.result.current.isLoading).toBe(true)
    expect(view.result.current.error).toBeNull()

    await act(async () => {
      retried.resolve(list([item({ content: 'После повтора' })]))
      await retried.promise
    })
    expect(view.result.current.data?.items[0]?.content).toBe('После повтора')
    expect(view.result.current.error).toBeNull()
  })

  it('aborts the previous business and ignores its late success', async () => {
    const businessA = deferred<KnowledgeRecheck>()
    const businessB = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck)
      .mockImplementationOnce(() => businessA.promise)
      .mockImplementationOnce(() => businessB.promise)

    const view = renderHook(() => useKnowledgeRecheck())
    await waitFor(() => {
      expect(listKnowledgeRecheck).toHaveBeenCalledTimes(1)
    })
    const firstSignal = vi.mocked(listKnowledgeRecheck).mock.calls[0]?.[1]?.signal

    session.businessId = 'biz_2'
    view.rerender()
    await waitFor(() => {
      expect(listKnowledgeRecheck).toHaveBeenCalledWith('biz_2', expect.any(Object))
    })
    expect(firstSignal?.aborted).toBe(true)
    expect(view.result.current.data).toBeNull()

    await act(async () => {
      businessB.resolve(list([item({ content: 'Новый бизнес' })]))
      await businessB.promise
    })
    await act(async () => {
      businessA.resolve(list([item({ content: 'Старый бизнес' })]))
      await businessA.promise
    })

    expect(view.result.current.data?.items[0]?.content).toBe('Новый бизнес')
    expect(view.result.current.error).toBeNull()
  })

  it('ignores a late error after a business switch', async () => {
    const businessA = deferred<KnowledgeRecheck>()
    const businessB = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck)
      .mockImplementationOnce(() => businessA.promise)
      .mockImplementationOnce(() => businessB.promise)

    const view = renderHook(() => useKnowledgeRecheck())
    await waitFor(() => {
      expect(listKnowledgeRecheck).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_2'
    view.rerender()
    await waitFor(() => {
      expect(listKnowledgeRecheck).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      businessA.reject(new Error('stale failure'))
      await businessA.promise.catch(() => undefined)
    })
    expect(view.result.current.error).toBeNull()
    expect(view.result.current.data).toBeNull()

    await act(async () => {
      businessB.resolve(list([item({ content: 'Новый бизнес' })]))
      await businessB.promise
    })

    expect(view.result.current.data?.items[0]?.content).toBe('Новый бизнес')
    expect(view.result.current.error).toBeNull()
  })

  it('does not apply a response after unmount', async () => {
    const pending = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck).mockImplementation(() => pending.promise)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByText(ru.common.loading)).toBeTruthy()
    })
    const signal = vi.mocked(listKnowledgeRecheck).mock.calls[0]?.[1]?.signal

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

describe('RecheckPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
  })

  it('shows the title while loading', async () => {
    const pending = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck).mockImplementationOnce(() => pending.promise)

    render(<RecheckPage />)

    expect(screen.getByRole('heading', { level: 1, name: ru.recheck.title })).toBeTruthy()
    expect(screen.getByText(ru.common.loading)).toBeTruthy()
  })

  it('renders knowledge cards without write actions', async () => {
    const lastCheckedAt = '2024-11-01T12:00:00.000Z'
    const obtainedAt = '2024-02-01T08:30:00.000Z'
    const obtainedOnly = '2025-01-10T09:00:00.000Z'
    vi.mocked(listKnowledgeRecheck).mockResolvedValue(
      list([
        item({
          knowledgeId: 'knowledge_outdated',
          content: 'Сайт больше не открывается',
          type: 'FACT',
          verificationStatus: 'OUTDATED',
          sourceLabel: 'Сайт компании',
          sourceUrl: 'https://example.test/about',
          obtainedAt,
          lastCheckedAt,
          company: { id: 'company_1', name: 'Северная верфь' },
        }),
        item({
          knowledgeId: 'knowledge_needs',
          content: 'Телефон нужно подтвердить',
          type: 'OBSERVATION',
          verificationStatus: 'NEEDS_VERIFICATION',
          sourceLabel: null,
          sourceUrl: null,
          obtainedAt: obtainedOnly,
          lastCheckedAt: null,
          company: null,
        }),
        item({
          knowledgeId: 'knowledge_inference',
          content: 'Вывод без безопасной ссылки',
          type: 'AI_INFERENCE',
          verificationStatus: 'NEEDS_VERIFICATION',
          sourceLabel: null,
          sourceUrl: 'javascript:alert(1)',
          obtainedAt: null,
          lastCheckedAt: null,
          company: { id: 'company_2', name: 'Южная верфь' },
        }),
        item({
          knowledgeId: 'knowledge_user',
          content: 'Заметка пользователя',
          type: 'USER_INFO',
          verificationStatus: 'OUTDATED',
          sourceLabel: 'Заметка',
          sourceUrl: '',
          obtainedAt: null,
          lastCheckedAt: null,
          company: { id: 'company_3', name: 'Восточная верфь' },
        }),
      ]),
    )

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    })

    expect(screen.getByRole('heading', { level: 1, name: ru.recheck.title })).toBeTruthy()
    expect(screen.getByRole('heading', { name: ru.recheck.withoutCompany })).toBeTruthy()
    expect(screen.getByText('Сайт больше не открывается')).toBeTruthy()
    expect(screen.getAllByText(ru.recheck.verification.OUTDATED).length).toBeGreaterThan(0)
    expect(screen.getAllByText(ru.recheck.verification.NEEDS_VERIFICATION).length).toBeGreaterThan(0)
    expect(screen.getByText(ru.recheck.knowledgeType.FACT)).toBeTruthy()
    expect(screen.getByText(ru.recheck.knowledgeType.OBSERVATION)).toBeTruthy()
    expect(screen.getByText(ru.recheck.knowledgeType.AI_INFERENCE)).toBeTruthy()
    expect(screen.getByText(ru.recheck.knowledgeType.USER_INFO)).toBeTruthy()

    const companyCard = within(card('Северная верфь'))
    expect(
      companyCard.getByText(dateLabel(ru.recheck.lastChecked, lastCheckedAt)),
    ).toBeTruthy()
    expect(companyCard.queryByText(dateLabel(ru.recheck.obtained, obtainedAt))).toBeNull()
    expect(companyCard.getByText('Сайт компании')).toBeTruthy()
    const sourceLink = companyCard.getByRole('link', {
      name: `${ru.recheck.openSource}: Северная верфь`,
    })
    expect(sourceLink.getAttribute('href')).toBe('https://example.test/about')
    expect(sourceLink.getAttribute('target')).toBe('_blank')

    const needsCard = within(card(ru.recheck.withoutCompany))
    expect(needsCard.getByText(dateLabel(ru.recheck.obtained, obtainedOnly))).toBeTruthy()
    expect(needsCard.queryByText(/Последняя проверка/)).toBeNull()
    expect(needsCard.queryByRole('link')).toBeNull()

    const unsafeCard = within(card('Южная верфь'))
    expect(unsafeCard.getByText(ru.recheck.sourceFallback)).toBeTruthy()
    expect(unsafeCard.queryByRole('link')).toBeNull()
    expect(unsafeCard.queryByText(/Последняя проверка|Получено/)).toBeNull()

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText('Проверено')).toBeNull()
    expect(screen.queryByText('knowledge_outdated')).toBeNull()
  })

  it('shows the empty state on the same screen', async () => {
    vi.mocked(listKnowledgeRecheck).mockResolvedValue(list([]))

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByText(ru.recheck.empty)).toBeTruthy()
    })
    expect(screen.getByRole('heading', { level: 1, name: ru.recheck.title })).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('shows the error and retries', async () => {
    vi.mocked(listKnowledgeRecheck)
      .mockRejectedValueOnce(new Error('BUSINESS_NOT_FOUND'))
      .mockResolvedValueOnce(list([item()]))

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.recheck.loadError)
    })
    expect(screen.getByRole('heading', { level: 1, name: ru.recheck.title })).toBeTruthy()
    expect(screen.queryByText('BUSINESS_NOT_FOUND')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.recheck.retry }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
