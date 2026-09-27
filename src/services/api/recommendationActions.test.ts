import { afterEach, describe, expect, it, vi } from 'vitest'
import { acceptResultFixture } from '@/domain/decisions/decision.fixture'
import { InvalidAcceptResponseError } from '@/domain/decisions/decision'
import {
  acceptRecommendation,
  modifyRecommendation,
  rejectRecommendation,
  snoozeRecommendation,
} from './recommendationActions'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('recommendation action API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('accepts with decidedById and parses Decision', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: acceptResultFixture }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      acceptRecommendation({
        businessId: 'biz_1',
        recommendationId: 'rec_1',
        decidedById: 'user_1',
      }),
    ).resolves.toEqual(acceptResultFixture)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/recommendations/rec_1/accept',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ decidedById: 'user_1' }),
      }),
    )
  })

  it('rejects a malformed Accept Decision response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { recommendation: { id: 'rec_1' } } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      acceptRecommendation({
        businessId: 'biz_1',
        recommendationId: 'rec_1',
        decidedById: 'user_1',
      }),
    ).rejects.toBeInstanceOf(InvalidAcceptResponseError)
  })

  it('snoozes with RFC3339 snoozedUntil and no decidedById', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { recommendation: { id: 'rec_1' } } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await snoozeRecommendation({
      businessId: 'biz_1',
      recommendationId: 'rec_1',
      snoozedUntil: '2026-09-26T06:00:00.000Z',
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body).toEqual({ snoozedUntil: '2026-09-26T06:00:00.000Z' })
    expect(body).not.toHaveProperty('decidedById')
  })

  it('modifies with decidedById and decisionTitle', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { recommendation: { id: 'rec_1' } } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await modifyRecommendation({
      businessId: 'biz_1',
      recommendationId: 'rec_1',
      decidedById: 'user_1',
      decisionTitle: 'Позвонить',
    })

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      decidedById: 'user_1',
      decisionTitle: 'Позвонить',
    })
  })

  it('rejects without rejectionComment for non-OTHER reasons', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { recommendation: { id: 'rec_1' } } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await rejectRecommendation({
      businessId: 'biz_1',
      recommendationId: 'rec_1',
      rejectionReason: 'NOT_RELEVANT',
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body).toEqual({ rejectionReason: 'NOT_RELEVANT' })
    expect(body).not.toHaveProperty('rejectionComment')
    expect(body).not.toHaveProperty('decidedById')
  })

  it('rejects OTHER with a comment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { recommendation: { id: 'rec_1' } } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await rejectRecommendation({
      businessId: 'biz_1',
      recommendationId: 'rec_1',
      rejectionReason: 'OTHER',
      rejectionComment: 'Нужен другой формат',
    })

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      rejectionReason: 'OTHER',
      rejectionComment: 'Нужен другой формат',
    })
  })
})
