import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidCompleteTaskResponseError } from '@/domain/tasks/completeTask'
import { completeTask, completeTaskPath, completeTaskRequestBody } from './completeTask'

const completedAt = '2026-11-08T12:00:00.000Z'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function successBody(completionComment: string | null = null) {
  return {
    data: {
      task: {
        id: 'task_1',
        status: 'DONE',
        completedAt,
        completionOutcome: 'CONTACTED',
        completionComment,
      },
    },
  }
}

describe('completeTaskPath', () => {
  it('encodes businessId and taskId', () => {
    expect(completeTaskPath('biz/a b', 'task/1')).toBe(
      '/api/v1/businesses/biz%2Fa%20b/tasks/task%2F1/complete',
    )
  })
})

describe('completeTaskRequestBody', () => {
  it('omits an empty comment instead of sending null', () => {
    expect(completeTaskRequestBody('NO_RESPONSE', '   ')).toEqual({ outcome: 'NO_RESPONSE' })
    expect(completeTaskRequestBody('CONTACTED', '')).toEqual({ outcome: 'CONTACTED' })
  })

  it('sends a trimmed comment when one is present', () => {
    expect(completeTaskRequestBody('OTHER', '  note  ')).toEqual({
      outcome: 'OTHER',
      comment: 'note',
    })
  })
})

describe('completeTask', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts the encoded task without a null comment and accepts DONE', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => successBody(),
    })
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(
      completeTask('biz/1', 'task/1', 'CONTACTED', '   ', { signal: controller.signal }),
    ).resolves.toEqual({
      task: {
        id: 'task_1',
        status: 'DONE',
        completedAt,
        completionOutcome: 'CONTACTED',
        completionComment: null,
      },
    })

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/v1/businesses/biz%2F1/tasks/task%2F1/complete')
    expect(init.method).toBe('POST')
    expect(init.signal).toBe(controller.signal)
    expect(JSON.parse(String(init.body))).toEqual({ outcome: 'CONTACTED' })
    expect(JSON.parse(String(init.body))).not.toHaveProperty('comment')
  })

  it.each(['TODO', 'CANCELLED', 'OPEN'] as const)('rejects status %s', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          data: {
            task: {
              id: 'task_1',
              status,
              completedAt,
              completionOutcome: 'CONTACTED',
              completionComment: null,
            },
          },
        }),
      ),
    )

    await expect(completeTask('biz_1', 'task_1', 'CONTACTED', '')).rejects.toBeInstanceOf(
      InvalidCompleteTaskResponseError,
    )
  })

  it('rejects an invalid outcome, completedAt, or comment', async () => {
    const bodies = [
      {
        id: 'task_1',
        status: 'DONE',
        completedAt,
        completionOutcome: 'POSITIVE',
        completionComment: null,
      },
      {
        id: 'task_1',
        status: 'DONE',
        completedAt: '2026-11-08',
        completionOutcome: 'CONTACTED',
        completionComment: null,
      },
      {
        id: 'task_1',
        status: 'DONE',
        completedAt,
        completionOutcome: 'CONTACTED',
      },
    ]

    for (const task of bodies) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse(200, { data: { task } })),
      )
      await expect(completeTask('biz_1', 'task_1', 'CONTACTED', '')).rejects.toBeInstanceOf(
        InvalidCompleteTaskResponseError,
      )
    }
  })
})
