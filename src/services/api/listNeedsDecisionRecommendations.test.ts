import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  listNeedsDecisionRecommendations,
  needsDecisionRecommendationsPath,
} from './listNeedsDecisionRecommendations'

describe('needsDecisionRecommendationsPath', () => {
  it('builds an origin-absolute needs-decision endpoint', () => {
    expect(needsDecisionRecommendationsPath('biz_123')).toBe(
      '/api/v1/businesses/biz_123/recommendations/needs-decision',
    )
  })

  it('encodes businessId for safe URL use', () => {
    expect(needsDecisionRecommendationsPath('biz/a b?x=1')).toBe(
      '/api/v1/businesses/biz%2Fa%20b%3Fx%3D1/recommendations/needs-decision',
    )
  })

  it('does not hardcode a localhost backend URL', () => {
    expect(needsDecisionRecommendationsPath('biz_123')).not.toContain('localhost')
    expect(needsDecisionRecommendationsPath('biz_123')).not.toContain('http://')
    expect(needsDecisionRecommendationsPath('biz_123')).not.toContain('3001')
  })
})

describe('listNeedsDecisionRecommendations', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requests the encoded origin-absolute endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { recommendations: [] } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      listNeedsDecisionRecommendations('biz/a b'),
    ).resolves.toEqual({ recommendations: [] })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz%2Fa%20b/recommendations/needs-decision',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('localhost')
  })
})
