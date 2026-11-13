import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidKnowledgeRecheckResponseError } from '@/domain/knowledge/knowledgeRecheck'
import { knowledgeRecheckPath, listKnowledgeRecheck } from './listKnowledgeRecheck'

const item = {
  knowledgeId: 'knowledge_1',
  content: 'Сайт больше не открывается',
  type: 'FACT',
  verificationStatus: 'OUTDATED',
  sourceLabel: null,
  sourceUrl: null,
  obtainedAt: null,
  lastCheckedAt: '2024-11-01T12:00:00.000Z',
  company: null,
}

describe('knowledgeRecheckPath', () => {
  it('encodes businessId and does not add query params', () => {
    expect(knowledgeRecheckPath('biz/a b')).toBe(
      '/api/v1/businesses/biz%2Fa%20b/knowledge/recheck',
    )
    expect(knowledgeRecheckPath('biz/a b')).not.toContain('?')
  })
})

describe('listKnowledgeRecheck', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends GET with AbortSignal and no query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [item] } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(listKnowledgeRecheck('biz_1', { signal: controller.signal })).resolves.toEqual({
      items: [item],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/knowledge/recheck',
      expect.objectContaining({ method: 'GET', signal: controller.signal }),
    )
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain('?')
  })

  it('rejects a response with an invalid status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { items: [{ ...item, verificationStatus: 'VERIFIED' }] },
        }),
      }),
    )

    await expect(listKnowledgeRecheck('biz_1')).rejects.toBeInstanceOf(
      InvalidKnowledgeRecheckResponseError,
    )
  })
})
