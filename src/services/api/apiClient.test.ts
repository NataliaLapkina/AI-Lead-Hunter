import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apiGet,
  apiPost,
  BackendApiError,
  HttpApiError,
  MalformedApiResponseError,
} from './apiClient'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('apiGet', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns the success data envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { recommendations: [] } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiGet('/api/v1/businesses/biz_1/recommendations/needs-decision'),
    ).resolves.toEqual({ recommendations: [] })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/recommendations/needs-decision',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('throws a backend error for a structured error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(404, {
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: 'Business not found.',
            details: {},
          },
        }),
      ),
    )

    const error = await apiGet('/api/v1/businesses/missing/recommendations/needs-decision').catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(BackendApiError)
    expect(error).toMatchObject({
      status: 404,
      code: 'BUSINESS_NOT_FOUND',
      message: 'Business not found.',
    })
  })

  it('throws an HTTP error when the failure has no backend envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError('Unexpected token')
        },
      }),
    )

    await expect(apiGet('/api/v1/health')).rejects.toBeInstanceOf(HttpApiError)
  })

  it('throws a malformed error when success JSON is not an envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { recommendations: [] })),
    )

    await expect(
      apiGet('/api/v1/businesses/biz_1/recommendations/needs-decision'),
    ).rejects.toBeInstanceOf(MalformedApiResponseError)
  })

  it('rejects non origin-absolute API paths', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiGet('api/v1/businesses/biz_1/recommendations/needs-decision'),
    ).rejects.toThrow('API path must be origin-absolute and start with /api/v1/.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws a malformed error when a successful HTTP response is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token')
        },
      }),
    )

    await expect(
      apiGet('/api/v1/businesses/biz_1/recommendations/needs-decision'),
    ).rejects.toBeInstanceOf(MalformedApiResponseError)
  })

  it('forwards AbortSignal to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { recommendations: [] } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await apiGet('/api/v1/businesses/biz_1/recommendations/needs-decision', {
      signal: controller.signal,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/recommendations/needs-decision',
      expect.objectContaining({
        method: 'GET',
        signal: controller.signal,
      }),
    )
  })
})

describe('apiPost', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns the success data envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { recommendation: { id: 'rec_1' } } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiPost('/api/v1/businesses/biz_1/recommendations/rec_1/accept', {
        decidedById: 'user_1',
      }),
    ).resolves.toEqual({ recommendation: { id: 'rec_1' } })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/recommendations/rec_1/accept',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ decidedById: 'user_1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('sends the JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { ok: true } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const body = { snoozedUntil: '2026-09-26T06:00:00.000Z' }

    await apiPost(
      '/api/v1/businesses/biz_1/recommendations/rec_1/snooze',
      body,
    )

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(body),
    })
  })

  it('throws a backend error for a structured error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: {
            code: 'INVALID_DECIDED_BY_ID',
            message: 'Invalid decidedById.',
            details: {},
          },
        }),
      ),
    )

    const error = await apiPost(
      '/api/v1/businesses/biz_1/recommendations/rec_1/accept',
      { decidedById: '' },
    ).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BackendApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'INVALID_DECIDED_BY_ID',
    })
  })

  it('throws a malformed error when success JSON is not an envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { recommendation: { id: 'rec_1' } })),
    )

    await expect(
      apiPost('/api/v1/businesses/biz_1/recommendations/rec_1/accept', {
        decidedById: 'user_1',
      }),
    ).rejects.toBeInstanceOf(MalformedApiResponseError)
  })

  it('forwards AbortSignal to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { ok: true } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await apiPost(
      '/api/v1/businesses/biz_1/recommendations/rec_1/reject',
      { rejectionReason: 'NOT_RELEVANT' },
      { signal: controller.signal },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/recommendations/rec_1/reject',
      expect.objectContaining({
        method: 'POST',
        signal: controller.signal,
      }),
    )
  })
})
