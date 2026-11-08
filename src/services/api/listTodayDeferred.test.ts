import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidTodayDeferredResponseError } from '@/domain/recommendations/todayDeferred'
import { listTodayDeferred, todayDeferredPath } from './listTodayDeferred'

const item = {
  id: 'recommendation_1',
  title: 'Вернуться к решению',
  status: 'VIEWED',
  snoozedUntil: '2026-11-10T11:30:00.000Z',
  company: null,
}

describe('todayDeferredPath', () => {
  it('encodes businessId and does not add a timezone', () => {
    expect(todayDeferredPath('biz/a b')).toBe('/api/v1/businesses/biz%2Fa%20b/today/deferred')
  })
})

describe('listTodayDeferred', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requests the encoded endpoint and returns parsed items', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [item] } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(listTodayDeferred('biz_1', { signal: controller.signal })).resolves.toEqual({
      items: [item],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/today/deferred',
      expect.objectContaining({ method: 'GET', signal: controller.signal }),
    )
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain('timezone')
  })

  it('rejects a response with an invalid status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { items: [{ ...item, status: 'ACCEPTED' }] },
        }),
      }),
    )

    await expect(listTodayDeferred('biz_1')).rejects.toBeInstanceOf(InvalidTodayDeferredResponseError)
  })
})
