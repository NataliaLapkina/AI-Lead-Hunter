import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidTodayAttentionResponseError } from '@/domain/tasks/todayAttention'
import { listTodayAttention, todayAttentionPath } from './listTodayAttention'

const item = {
  id: 'task_1',
  completedAt: '2026-09-01T10:00:00.000Z',
  completionOutcome: 'FOLLOW_UP',
  title: 'Позвонить ещё раз',
  company: null,
  decision: null,
}

describe('todayAttentionPath', () => {
  it('encodes businessId and does not add a timezone', () => {
    expect(todayAttentionPath('biz/a b')).toBe('/api/v1/businesses/biz%2Fa%20b/today/attention')
  })
})

describe('listTodayAttention', () => {
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

    await expect(listTodayAttention('biz_1', { signal: controller.signal })).resolves.toEqual({
      items: [item],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/today/attention',
      expect.objectContaining({ method: 'GET', signal: controller.signal }),
    )
  })

  it('rejects a response that is not a follow-up', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { items: [{ ...item, completionOutcome: 'CONTACTED' }] },
        }),
      }),
    )

    await expect(listTodayAttention('biz_1')).rejects.toBeInstanceOf(InvalidTodayAttentionResponseError)
  })
})
