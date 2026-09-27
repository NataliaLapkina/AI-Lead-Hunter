import { afterEach, describe, expect, it, vi } from 'vitest'
import { acceptResultFixture } from '@/domain/decisions/decision.fixture'
import { createdTaskFixture } from '@/domain/tasks/task.fixture'
import { createTaskFromDecision } from './createTaskFromDecision'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('createTaskFromDecision API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts the exact body and forwards AbortSignal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { task: createdTaskFixture } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    const result = await createTaskFromDecision({
      businessId: 'biz_1',
      decisionId: acceptResultFixture.decision.id,
      command: {
        createdById: 'user_1',
        title: 'Позвонить сегодня',
        dueAt: '2026-09-28T06:00:00.000Z',
        priority: 'MEDIUM',
      },
      signal: controller.signal,
    })

    expect(result.task).toEqual(createdTaskFixture)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/decisions/dec_1/tasks',
      expect.objectContaining({
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({
          createdById: 'user_1',
          title: 'Позвонить сегодня',
          dueAt: '2026-09-28T06:00:00.000Z',
          priority: 'MEDIUM',
        }),
      }),
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body).not.toHaveProperty('companyId')
    expect(body).not.toHaveProperty('assignedToId')
    expect(body).not.toHaveProperty('status')
    expect(body).not.toHaveProperty('description')
    expect(body).not.toHaveProperty('businessId')
    expect(body).not.toHaveProperty('decisionId')
  })

  it('treats an idempotent existing open Task as success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { task: createdTaskFixture } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createTaskFromDecision({
        businessId: 'biz_1',
        decisionId: 'dec_1',
        command: {
          createdById: 'user_1',
          title: 'Changed',
          dueAt: '2026-09-29T06:00:00.000Z',
          priority: 'HIGH',
        },
      }),
    ).resolves.toEqual({ task: createdTaskFixture })
  })
})
