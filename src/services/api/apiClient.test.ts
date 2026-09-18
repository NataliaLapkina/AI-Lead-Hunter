import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apiGet,
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
