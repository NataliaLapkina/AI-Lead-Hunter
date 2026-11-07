import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidRescheduleTaskResponseError } from '@/domain/tasks/rescheduleTask'
import { rescheduleTask, rescheduleTaskPath } from './rescheduleTask'

const dueAt = '2026-11-08T07:00:00.000Z'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('rescheduleTaskPath', () => {
  it('encodes businessId and taskId', () => {
    expect(rescheduleTaskPath('biz/a b', 'task/1')).toBe(
      '/api/v1/businesses/biz%2Fa%20b/tasks/task%2F1/reschedule',
    )
  })
})

describe('rescheduleTask', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each(['TODO', 'IN_PROGRESS'] as const)(
    'posts the dueAt for the encoded task and accepts status %s',
    async (status) => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            task: {
              id: 'task_1',
              status,
              dueAt,
              title: 'ignored',
            },
          },
        }),
      })
      vi.stubGlobal('fetch', fetchMock)
      const controller = new AbortController()

      await expect(rescheduleTask('biz/1', 'task/1', dueAt, { signal: controller.signal })).resolves.toEqual({
        task: { id: 'task_1', status, dueAt },
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(path).toBe('/api/v1/businesses/biz%2F1/tasks/task%2F1/reschedule')
      expect(init.method).toBe('POST')
      expect(init.signal).toBe(controller.signal)
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(JSON.parse(String(init.body))).toEqual({ dueAt })
    },
  )

  it.each(['DONE', 'CANCELLED', 'OPEN'] as const)(
    'rejects a reschedule response with status %s',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          jsonResponse(200, {
            data: {
              task: {
                id: 'task_1',
                status,
                dueAt,
              },
            },
          }),
        ),
      )

      await expect(rescheduleTask('biz_1', 'task_1', dueAt)).rejects.toBeInstanceOf(
        InvalidRescheduleTaskResponseError,
      )
    },
  )

  it('rejects a response without the expected task shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          data: {
            task: {
              id: 'task_1',
              status: 'TODO',
            },
          },
        }),
      ),
    )

    await expect(rescheduleTask('biz_1', 'task_1', dueAt)).rejects.toBeInstanceOf(
      InvalidRescheduleTaskResponseError,
    )
  })
})
