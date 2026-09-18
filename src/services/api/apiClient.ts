export class BackendApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details: unknown) {
    super(message)
    this.name = 'BackendApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export class HttpApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpApiError'
    this.status = status
  }
}

export class MalformedApiResponseError extends Error {
  constructor(message = 'API response is malformed.') {
    super(message)
    this.name = 'MalformedApiResponseError'
  }
}

function assertOriginAbsoluteApiPath(path: string): void {
  if (!path.startsWith('/api/v1/')) {
    throw new Error('API path must be origin-absolute and start with /api/v1/.')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readBackendError(
  body: unknown,
): { code: string; message: string; details: unknown } | null {
  if (!isRecord(body) || !isRecord(body.error)) {
    return null
  }

  const { code, message, details } = body.error
  if (typeof code !== 'string' || typeof message !== 'string') {
    return null
  }

  return {
    code,
    message,
    details: details ?? {},
  }
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export async function apiGet<T>(
  path: string,
  options?: { signal?: AbortSignal },
): Promise<T> {
  assertOriginAbsoluteApiPath(path)

  const response = await fetch(path, {
    method: 'GET',
    signal: options?.signal,
  })

  const body = await readJsonBody(response)

  if (!response.ok) {
    const backendError = body === undefined ? null : readBackendError(body)
    if (backendError) {
      throw new BackendApiError(
        response.status,
        backendError.code,
        backendError.message,
        backendError.details,
      )
    }

    throw new HttpApiError(
      response.status,
      `Request failed with status ${response.status}.`,
    )
  }

  if (body === undefined || !isRecord(body) || !('data' in body)) {
    throw new MalformedApiResponseError()
  }

  return body.data as T
}
