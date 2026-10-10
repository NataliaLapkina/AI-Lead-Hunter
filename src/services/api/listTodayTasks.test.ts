import { afterEach, describe, expect, it, vi } from 'vitest'
import { listTodayTasks, todayTasksPath } from './listTodayTasks'

describe('todayTasksPath', () => {
  it('encodes businessId and timezone', () => {
    expect(todayTasksPath('biz/a b', 'Europe/Moscow')).toBe(
      '/api/v1/businesses/biz%2Fa%20b/today/tasks?timezone=Europe%2FMoscow',
    )
  })

  it('does not hardcode a localhost backend URL', () => {
    const path = todayTasksPath('biz_1', 'America/New_York')

    expect(path).not.toContain('localhost')
    expect(path).not.toContain('http://')
    expect(path).not.toContain('3001')
  })
})

describe('listTodayTasks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requests the encoded endpoint and returns the parsed tasks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          tasks: [
            {
              id: 'task_1',
              title: 'Позвонить',
              status: 'TODO',
              dueAt: '2026-10-11T12:00:00.000Z',
              priority: 'MEDIUM',
              isOverdue: false,
              company: null,
              decision: null,
            },
          ],
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(listTodayTasks('biz_1', 'Pacific/Auckland')).resolves.toEqual({
      tasks: [
        {
          id: 'task_1',
          title: 'Позвонить',
          status: 'TODO',
          dueAt: '2026-10-11T12:00:00.000Z',
          priority: 'MEDIUM',
          isOverdue: false,
          company: null,
          decision: null,
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/businesses/biz_1/today/tasks?timezone=Pacific%2FAuckland',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
