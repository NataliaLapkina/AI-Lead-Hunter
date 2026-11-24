import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidVerifyKnowledgeResponseError } from '@/domain/knowledge/verifyKnowledge'
import { verifyKnowledge, verifyKnowledgePath } from './verifyKnowledge'

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  }
}

const payload = {
  data: {
    knowledge: {
      id: 'knowledge_1',
      verificationStatus: 'VERIFIED',
      lastCheckedAt: '2026-11-24T12:00:00.000Z',
      updatedAt: '2026-11-24T12:00:01.000Z',
    },
  },
}

describe('verifyKnowledgePath', () => {
  it('encodes businessId and knowledgeId', () => {
    expect(verifyKnowledgePath('biz/a b', 'knowledge/1')).toBe(
      '/api/v1/businesses/biz%2Fa%20b/knowledge/knowledge%2F1/verify',
    )
  })
})

describe('verifyKnowledge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts without a body and forwards the abort signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(verifyKnowledge('biz_1', 'knowledge_1', { signal: controller.signal })).resolves.toEqual(
      payload.data,
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/v1/businesses/biz_1/knowledge/knowledge_1/verify')
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
    expect(init.signal).toBe(controller.signal)
  })

  it('rejects a response whose id does not match the requested knowledge', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            knowledge: { ...payload.data.knowledge, id: 'knowledge_2' },
          },
        }),
      ),
    )

    await expect(verifyKnowledge('biz_1', 'knowledge_1')).rejects.toBeInstanceOf(
      InvalidVerifyKnowledgeResponseError,
    )
  })

  it.each(['OUTDATED', 'NEEDS_VERIFICATION', 'ASSUMPTION'] as const)(
    'rejects verification status %s',
    async (verificationStatus) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          jsonResponse({
            data: {
              knowledge: { ...payload.data.knowledge, verificationStatus },
            },
          }),
        ),
      )

      await expect(verifyKnowledge('biz_1', 'knowledge_1')).rejects.toBeInstanceOf(
        InvalidVerifyKnowledgeResponseError,
      )
    },
  )

  it.each(['2026-02-30T12:00:00.000Z', '2026-11-24T12:00:00'] as const)(
    'rejects invalid date %s',
    async (updatedAt) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          jsonResponse({
            data: {
              knowledge: { ...payload.data.knowledge, updatedAt },
            },
          }),
        ),
      )

      await expect(verifyKnowledge('biz_1', 'knowledge_1')).rejects.toBeInstanceOf(
        InvalidVerifyKnowledgeResponseError,
      )
    },
  )
})
