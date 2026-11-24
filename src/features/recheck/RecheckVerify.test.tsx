/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KnowledgeRecheck, KnowledgeRecheckItem } from '@/domain/knowledge/knowledgeRecheck'
import type { VerifyKnowledgeResult } from '@/domain/knowledge/verifyKnowledge'
import { ru } from '@/i18n/ru'
import { RecheckPage } from '@/pages/RecheckPage'
import { BackendApiError } from '@/services/api/apiClient'
import { useVerifyKnowledge } from './useVerifyKnowledge'

const session = vi.hoisted(() => ({
  businessId: 'biz_1' as string | null,
}))

vi.mock('@/features/business/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => ({ businessId: session.businessId }),
}))

vi.mock('@/services/api/listKnowledgeRecheck', () => ({
  listKnowledgeRecheck: vi.fn(),
}))

vi.mock('@/services/api/verifyKnowledge', () => ({
  verifyKnowledge: vi.fn(),
}))

import { listKnowledgeRecheck } from '@/services/api/listKnowledgeRecheck'
import { verifyKnowledge } from '@/services/api/verifyKnowledge'

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

function verifiedResult(id: string): VerifyKnowledgeResult {
  return {
    knowledge: {
      id,
      verificationStatus: 'VERIFIED',
      lastCheckedAt: '2026-11-24T12:00:00.000Z',
      updatedAt: '2026-11-24T12:00:01.000Z',
    },
  }
}

function card(heading: string): HTMLElement {
  const title = screen.getByRole('heading', { name: heading })
  const row = title.closest('li')
  if (!row) {
    throw new Error(`Missing card for ${heading}`)
  }

  return row
}

async function renderLoaded(items: KnowledgeRecheckItem[]) {
  vi.mocked(listKnowledgeRecheck).mockResolvedValueOnce({ items })
  render(<RecheckPage />)
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: items[0]?.company?.name ?? ru.recheck.withoutCompany })).toBeTruthy()
  })
}

describe('Recheck verification', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    session.businessId = 'biz_1'
  })

  it('does not verify while rendering and keeps the source link independent', async () => {
    await renderLoaded([item()])

    expect(verifyKnowledge).not.toHaveBeenCalled()
    const sourceLink = screen.getByRole('link', {
      name: `${ru.recheck.openSource}: Северная верфь`,
    })
    expect(sourceLink.getAttribute('href')).toBe('https://example.test/about')
    fireEvent.click(sourceLink)
    expect(verifyKnowledge).not.toHaveBeenCalled()
    expect(screen.getByText(ru.recheck.confirmHint)).toBeTruthy()
  })

  it('enables confirmation when the card has no source URL', async () => {
    await renderLoaded([
      item({
        sourceLabel: null,
        sourceUrl: null,
        company: null,
      }),
    ])

    const button = screen.getByRole('button', { name: ru.recheck.confirm }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('starts verification only after an explicit click and keeps the card until success', async () => {
    const pending = deferred<VerifyKnowledgeResult>()
    vi.mocked(verifyKnowledge).mockReturnValue(pending.promise)
    await renderLoaded([item()])

    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    })
    expect(verifyKnowledge).toHaveBeenCalledWith('biz_1', 'knowledge_1', expect.objectContaining({
      signal: expect.any(AbortSignal),
    }))
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    expect(screen.getByText('Сайт больше не открывается')).toBeTruthy()
    const confirming = screen.getByRole('button', { name: ru.recheck.confirming }) as HTMLButtonElement
    expect(confirming.disabled).toBe(true)
    expect(confirming.getAttribute('aria-busy')).toBe('true')
    expect(listKnowledgeRecheck).toHaveBeenCalledTimes(1)
  })

  it('sends one request for repeated clicks and leaves the other card independent', async () => {
    const pending = deferred<VerifyKnowledgeResult>()
    vi.mocked(verifyKnowledge).mockReturnValue(pending.promise)
    await renderLoaded([
      item(),
      item({
        knowledgeId: 'knowledge_2',
        content: 'Второй факт',
        company: { id: 'company_2', name: 'Южная верфь' },
      }),
    ])

    const first = within(card('Северная верфь')).getByRole('button', { name: ru.recheck.confirm })
    fireEvent.click(first)
    fireEvent.click(first)
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirming }))
    expect(verifyKnowledge).toHaveBeenCalledTimes(1)

    const second = within(card('Южная верфь')).getByRole('button', {
      name: ru.recheck.confirm,
    }) as HTMLButtonElement
    expect(second.disabled).toBe(false)
    fireEvent.click(second)
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Южная верфь' })).toBeTruthy()
  })

  it('refetches the current list after success and removes the card from the next response', async () => {
    const pending = deferred<VerifyKnowledgeResult>()
    const refreshed = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck)
      .mockResolvedValueOnce({ items: [item()] })
      .mockImplementationOnce(() => refreshed.promise)
    vi.mocked(verifyKnowledge).mockReturnValue(pending.promise)

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()

    await act(async () => {
      pending.resolve(verifiedResult('knowledge_1'))
      await pending.promise
    })
    await waitFor(() => {
      expect(listKnowledgeRecheck).toHaveBeenCalledTimes(2)
    })
    expect(listKnowledgeRecheck).toHaveBeenLastCalledWith('biz_1', expect.any(Object))

    await act(async () => {
      refreshed.resolve({
        items: [
          item({
            knowledgeId: 'knowledge_2',
            content: 'Остаётся в очереди',
            company: { id: 'company_2', name: 'Южная верфь' },
          }),
        ],
      })
      await refreshed.promise
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Южная верфь' })).toBeTruthy()
    })
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    expect(screen.getByText('Остаётся в очереди')).toBeTruthy()
  })

  it('shows a local error and allows another attempt', async () => {
    vi.mocked(listKnowledgeRecheck).mockResolvedValue({ items: [item()] })
    vi.mocked(verifyKnowledge)
      .mockRejectedValueOnce(new BackendApiError(409, 'KNOWLEDGE_VERIFICATION_CONFLICT', 'raw code', {}))
      .mockResolvedValueOnce(verifiedResult('knowledge_1'))

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.recheck.confirm })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.recheck.confirmError.conflict)
    })
    expect(screen.queryByText('KNOWLEDGE_VERIFICATION_CONFLICT')).toBeNull()
    expect(screen.queryByText('raw code')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    expect(listKnowledgeRecheck).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(2)
      expect(listKnowledgeRecheck).toHaveBeenCalledTimes(2)
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('translates a missing knowledge error without the backend code', async () => {
    vi.mocked(listKnowledgeRecheck).mockResolvedValue({ items: [item()] })
    vi.mocked(verifyKnowledge).mockRejectedValueOnce(
      new BackendApiError(404, 'KNOWLEDGE_NOT_FOUND', 'Knowledge not found.', {}),
    )

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.recheck.confirm })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.recheck.confirmError.notFound)
    })
    expect(screen.queryByText('KNOWLEDGE_NOT_FOUND')).toBeNull()
    expect(screen.getByText('Сайт больше не открывается')).toBeTruthy()
  })

  it('ignores a late success after the business changes', async () => {
    const requestA = deferred<VerifyKnowledgeResult>()
    vi.mocked(listKnowledgeRecheck)
      .mockResolvedValueOnce({ items: [item()] })
      .mockResolvedValueOnce({
        items: [
          item({
            knowledgeId: 'knowledge_2',
            content: 'Новый бизнес',
            company: { id: 'company_2', name: 'Южная верфь' },
          }),
        ],
      })
    vi.mocked(verifyKnowledge).mockReturnValue(requestA.promise)

    const view = render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.recheck.confirm })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledWith('biz_1', 'knowledge_1', expect.any(Object))
    })
    const signal = vi.mocked(verifyKnowledge).mock.calls[0]?.[2]?.signal

    session.businessId = 'biz_2'
    view.rerender(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Южная верфь' })).toBeTruthy()
    })
    expect(signal?.aborted).toBe(true)
    const callsAfterSwitch = vi.mocked(listKnowledgeRecheck).mock.calls.length

    await act(async () => {
      requestA.resolve(verifiedResult('knowledge_1'))
      await requestA.promise
    })

    expect(vi.mocked(listKnowledgeRecheck).mock.calls.length).toBe(callsAfterSwitch)
    expect(screen.getByRole('heading', { name: 'Южная верфь' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(
      (screen.getByRole('button', { name: ru.recheck.confirm }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('ignores a late error after the business changes', async () => {
    const requestA = deferred<VerifyKnowledgeResult>()
    vi.mocked(listKnowledgeRecheck)
      .mockResolvedValueOnce({ items: [item()] })
      .mockResolvedValueOnce({
        items: [
          item({
            knowledgeId: 'knowledge_2',
            content: 'Новый бизнес',
            company: { id: 'company_2', name: 'Южная верфь' },
          }),
        ],
      })
    vi.mocked(verifyKnowledge).mockReturnValueOnce(requestA.promise)

    const view = render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.recheck.confirm })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    })

    session.businessId = 'biz_2'
    view.rerender(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Южная верфь' })).toBeTruthy()
    })

    await act(async () => {
      requestA.reject(new Error('business A failed'))
      await requestA.promise.catch(() => undefined)
    })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(ru.recheck.confirming)).toBeNull()
    expect(verifyKnowledge).toHaveBeenCalledTimes(1)
  })

  it('keeps a newer attempt for the same knowledge id in another business', async () => {
    const shared = item({ knowledgeId: 'knowledge_x', content: 'Общие сведения' })
    const requestA = deferred<VerifyKnowledgeResult>()
    const requestB = deferred<VerifyKnowledgeResult>()
    vi.mocked(listKnowledgeRecheck).mockResolvedValue({ items: [shared] })
    vi.mocked(verifyKnowledge)
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise)

    const view = render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.recheck.confirm })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledWith('biz_1', 'knowledge_x', expect.any(Object))
    })

    session.businessId = 'biz_2'
    view.rerender(<RecheckPage />)
    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: ru.recheck.confirm }) as HTMLButtonElement).disabled,
      ).toBe(false)
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledWith('biz_2', 'knowledge_x', expect.any(Object))
    })
    expect(
      (screen.getByRole('button', { name: ru.recheck.confirming }) as HTMLButtonElement).disabled,
    ).toBe(true)

    await act(async () => {
      requestA.resolve(verifiedResult('knowledge_x'))
      await requestA.promise
    })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(
      (screen.getByRole('button', { name: ru.recheck.confirming }) as HTMLButtonElement).disabled,
    ).toBe(true)
    const callsBeforeSecondSuccess = vi.mocked(listKnowledgeRecheck).mock.calls.length

    await act(async () => {
      requestB.resolve(verifiedResult('knowledge_x'))
      await requestB.promise
    })

    await waitFor(() => {
      expect(vi.mocked(listKnowledgeRecheck).mock.calls.length).toBe(callsBeforeSecondSuccess + 1)
    })
    expect(vi.mocked(listKnowledgeRecheck).mock.calls.at(-1)?.[0]).toBe('biz_2')
  })

  it('does not apply a response after unmount', async () => {
    const pending = deferred<VerifyKnowledgeResult>()
    vi.mocked(listKnowledgeRecheck).mockResolvedValue({ items: [item()] })
    vi.mocked(verifyKnowledge).mockReturnValue(pending.promise)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.recheck.confirm })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    })
    const signal = vi.mocked(verifyKnowledge).mock.calls[0]?.[2]?.signal

    view.unmount()
    await act(async () => {
      pending.resolve(verifiedResult('knowledge_1'))
      await pending.promise
    })

    expect(signal?.aborted).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('keeps the second verification alive across refetch and lets the newest GET win', async () => {
    const cardA = item({
      knowledgeId: 'knowledge_a',
      content: 'Сведения A',
      company: { id: 'company_a', name: 'Северная верфь' },
    })
    const cardB = item({
      knowledgeId: 'knowledge_b',
      content: 'Сведения B',
      company: { id: 'company_b', name: 'Южная верфь' },
    })
    const finalCard = item({
      knowledgeId: 'knowledge_final',
      content: 'Итог сервера',
      company: { id: 'company_final', name: 'Восточная верфь' },
    })
    const postA = deferred<VerifyKnowledgeResult>()
    const postB = deferred<VerifyKnowledgeResult>()
    const getAfterA = deferred<KnowledgeRecheck>()
    const getAfterB = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck)
      .mockResolvedValueOnce({ items: [cardA, cardB] })
      .mockImplementationOnce(() => getAfterA.promise)
      .mockImplementationOnce(() => getAfterB.promise)
    vi.mocked(verifyKnowledge)
      .mockReturnValueOnce(postA.promise)
      .mockReturnValueOnce(postB.promise)

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Южная верфь' })).toBeTruthy()
    })
    expect(verifyKnowledge).not.toHaveBeenCalled()
    expect(listKnowledgeRecheck).toHaveBeenCalledTimes(1)

    fireEvent.click(within(card('Северная верфь')).getByRole('button', { name: ru.recheck.confirm }))
    fireEvent.click(within(card('Южная верфь')).getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(2)
    })
    const signalB = vi.mocked(verifyKnowledge).mock.calls[1]?.[2]?.signal

    await act(async () => {
      postA.resolve(verifiedResult('knowledge_a'))
      await postA.promise
    })
    await waitFor(() => {
      expect(listKnowledgeRecheck).toHaveBeenCalledTimes(2)
      expect(screen.getByText(ru.common.loading)).toBeTruthy()
    })
    expect(signalB?.aborted).toBe(false)
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Южная верфь' })).toBeNull()

    await act(async () => {
      postB.resolve(verifiedResult('knowledge_b'))
      await postB.promise
    })
    await waitFor(() => {
      expect(listKnowledgeRecheck).toHaveBeenCalledTimes(3)
    })
    expect(vi.mocked(listKnowledgeRecheck).mock.calls[1]?.[1]?.signal?.aborted).toBe(true)
    expect(vi.mocked(listKnowledgeRecheck).mock.calls[2]?.[0]).toBe('biz_1')
    expect(verifyKnowledge).toHaveBeenCalledTimes(2)

    await act(async () => {
      getAfterB.resolve({ items: [finalCard] })
      await getAfterB.promise
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Восточная верфь' })).toBeTruthy()
    })
    expect(screen.getByText('Итог сервера')).toBeTruthy()

    await act(async () => {
      getAfterA.resolve({ items: [cardA, cardB] })
      await getAfterA.promise
    })

    expect(screen.getByRole('heading', { name: 'Восточная верфь' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Южная верфь' })).toBeNull()
    expect(screen.queryByText('Сведения A')).toBeNull()
    expect(screen.queryByText('Сведения B')).toBeNull()
    expect(listKnowledgeRecheck).toHaveBeenCalledTimes(3)
    expect(verifyKnowledge).toHaveBeenCalledTimes(2)
  })

  it('shows the second card error after refetch returns that card', async () => {
    const cardA = item({
      knowledgeId: 'knowledge_a',
      content: 'Сведения A',
      company: { id: 'company_a', name: 'Северная верфь' },
    })
    const cardB = item({
      knowledgeId: 'knowledge_b',
      content: 'Сведения B',
      company: { id: 'company_b', name: 'Южная верфь' },
    })
    const postA = deferred<VerifyKnowledgeResult>()
    const postB = deferred<VerifyKnowledgeResult>()
    const getAfterA = deferred<KnowledgeRecheck>()
    vi.mocked(listKnowledgeRecheck)
      .mockResolvedValueOnce({ items: [cardA, cardB] })
      .mockImplementationOnce(() => getAfterA.promise)
    vi.mocked(verifyKnowledge)
      .mockReturnValueOnce(postA.promise)
      .mockReturnValueOnce(postB.promise)

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Южная верфь' })).toBeTruthy()
    })

    fireEvent.click(within(card('Северная верфь')).getByRole('button', { name: ru.recheck.confirm }))
    fireEvent.click(within(card('Южная верфь')).getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      postA.resolve(verifiedResult('knowledge_a'))
      await postA.promise
    })
    await waitFor(() => {
      expect(screen.getByText(ru.common.loading)).toBeTruthy()
    })

    await act(async () => {
      postB.reject(new Error('network down'))
      await postB.promise.catch(() => undefined)
    })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(verifyKnowledge).toHaveBeenCalledTimes(2)

    await act(async () => {
      getAfterA.resolve({ items: [cardB] })
      await getAfterA.promise
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Южная верфь' })).toBeTruthy()
    })
    expect(screen.getByRole('alert').textContent).toBe(ru.recheck.confirmError.failed)
    expect(screen.queryByText('network down')).toBeNull()
    expect(screen.queryByText(ru.recheck.loadError)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    const retry = screen.getByRole('button', { name: ru.recheck.confirm }) as HTMLButtonElement
    expect(retry.disabled).toBe(false)
    expect(listKnowledgeRecheck).toHaveBeenCalledTimes(2)
    expect(verifyKnowledge).toHaveBeenCalledTimes(2)
  })

  it('shows the list error after a successful post and retries the list without another post', async () => {
    const confirmed = item()
    const post = deferred<VerifyKnowledgeResult>()
    vi.mocked(listKnowledgeRecheck)
      .mockResolvedValueOnce({ items: [confirmed] })
      .mockRejectedValueOnce(new Error('list failed'))
      .mockResolvedValueOnce({ items: [] })
    vi.mocked(verifyKnowledge).mockReturnValue(post.promise)

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.recheck.confirm })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      post.resolve(verifiedResult('knowledge_1'))
      await post.promise
    })

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(ru.recheck.loadError)
    })
    expect(screen.queryByText(ru.recheck.confirmError.failed)).toBeNull()
    expect(screen.queryByText(ru.recheck.confirmError.conflict)).toBeNull()
    expect(screen.queryByText(ru.recheck.confirmError.notFound)).toBeNull()
    expect(screen.queryByText('list failed')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: ru.recheck.retry }))
    await waitFor(() => {
      expect(screen.getByText(ru.recheck.empty)).toBeTruthy()
    })
    expect(screen.queryByRole('heading', { name: 'Северная верфь' })).toBeNull()
    expect(screen.queryByText('Сайт больше не открывается')).toBeNull()
    expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    expect(listKnowledgeRecheck).toHaveBeenCalledTimes(3)
  })

  it('shows the localized missing-business error without refetching', async () => {
    vi.mocked(listKnowledgeRecheck).mockResolvedValue({ items: [item()] })
    vi.mocked(verifyKnowledge).mockRejectedValueOnce(
      new BackendApiError(404, 'BUSINESS_NOT_FOUND', 'Business not found.', {}),
    )

    render(<RecheckPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: ru.recheck.confirm })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: ru.recheck.confirm }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Эти сведения уже недоступны.')
    })
    expect(screen.getByRole('alert').textContent).toBe(ru.recheck.confirmError.notFound)
    expect(screen.queryByText('BUSINESS_NOT_FOUND')).toBeNull()
    expect(screen.queryByText('Business not found.')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Северная верфь' })).toBeTruthy()
    expect(screen.getByText('Сайт больше не открывается')).toBeTruthy()
    expect(listKnowledgeRecheck).toHaveBeenCalledTimes(1)
    expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    expect(
      (screen.getByRole('button', { name: ru.recheck.confirm }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })
})

describe('useVerifyKnowledge request identity', () => {
  const refetch = vi.fn()

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    refetch.mockReset()
    vi.mocked(verifyKnowledge).mockReset()
  })

  it('keeps the newer request booked when the older one is rejected', async () => {
    const requestA = deferred<VerifyKnowledgeResult>()
    const requestB = deferred<VerifyKnowledgeResult>()
    vi.mocked(verifyKnowledge)
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise)

    const view = renderHook(
      ({ businessId }: { businessId: string }) => useVerifyKnowledge(businessId, refetch),
      { initialProps: { businessId: 'biz_a' } },
    )

    act(() => {
      view.result.current.verify('knowledge_x')
    })
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(1)
    })

    view.rerender({ businessId: 'biz_b' })
    act(() => {
      view.result.current.verify('knowledge_x')
    })
    await waitFor(() => {
      expect(verifyKnowledge).toHaveBeenCalledTimes(2)
    })
    expect(view.result.current.isPending('knowledge_x')).toBe(true)

    await act(async () => {
      requestA.reject(new Error('stale failure'))
      await requestA.promise.catch(() => undefined)
    })

    expect(view.result.current.isPending('knowledge_x')).toBe(true)
    expect(view.result.current.errorFor('knowledge_x')).toBeNull()
    act(() => {
      view.result.current.verify('knowledge_x')
    })
    expect(verifyKnowledge).toHaveBeenCalledTimes(2)

    await act(async () => {
      requestB.resolve(verifiedResult('knowledge_x'))
      await requestB.promise
    })
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(view.result.current.isPending('knowledge_x')).toBe(false)
  })
})
