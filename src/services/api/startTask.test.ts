import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidStartTaskResponseError } from '@/domain/tasks/startTask'
import { startTask, startTaskPath } from './startTask'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('startTaskPath', () => {
  it('encodes businessId and taskId', () => {
    expect(startTaskPath('biz/a b', 'task/1')).toBe(
      '/api/v1/businesses/biz%2Fa%20b/tasks/task%2F1/start',
    )
  })
})

describe('startTask', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts without a body and returns the parsed status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          task: {
            id: 'task_1',
            status: 'IN_PROGRESS',
          },
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(startTask('biz_1', 'task_1')).resolves.toEqual({
      task: { id: 'task_1', status: 'IN_PROGRESS' },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/v1/businesses/biz_1/tasks/task_1/start')
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
    expect(init.headers).toBeUndefined()
  })

  it.each(['TODO', 'DONE', 'CANCELLED', 'OPEN'] as const)(
    'rejects a start response with status %s',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            data: {
              task: {
                id: 'task_1',
                status,
              },
            },
          }),
        ),
      )

      await expect(startTask('biz_1', 'task_1')).rejects.toBeInstanceOf(
        InvalidStartTaskResponseError,
      )
    },
  )
})
