import { describe, expect, it } from 'vitest'
import type { TodayTasks } from '@/domain/tasks/todayTask'
import {
  beginTodayTasksQuery,
  failTodayTasksQuery,
  selectTodayTasksQueryView,
  succeedTodayTasksQuery,
} from './todayTasksQueryState'

const dataA: TodayTasks = {
  tasks: [
    {
      id: 'task-a',
      title: 'A',
      status: 'TODO',
      dueAt: '2026-10-11T12:00:00.000Z',
      priority: 'HIGH',
      isOverdue: false,
      company: { id: 'company-a', name: 'A Inc' },
      decision: null,
    },
  ],
}

describe('selectTodayTasksQueryView', () => {
  it('hides Business A tasks as soon as the current businessId becomes B', () => {
    const afterA = succeedTodayTasksQuery('business-a', dataA)

    expect(selectTodayTasksQueryView(afterA, 'business-a').data).toBe(dataA)
    expect(selectTodayTasksQueryView(afterA, 'business-b')).toEqual({
      data: null,
      error: null,
      isLoading: true,
    })
  })

  it('does not keep Business A tasks while B is loading or after B errors', () => {
    const loadingB = beginTodayTasksQuery()
    const errorB = failTodayTasksQuery('business-b', new Error('Business B failed'))

    expect(selectTodayTasksQueryView(loadingB, 'business-b')).toEqual({
      data: null,
      error: null,
      isLoading: true,
    })
    expect(selectTodayTasksQueryView(errorB, 'business-b').data).toBeNull()
    expect(selectTodayTasksQueryView(errorB, 'business-b').error?.message).toBe(
      'Business B failed',
    )
  })

  it('clears data, error, and loading when businessId is null', () => {
    const afterA = succeedTodayTasksQuery('business-a', dataA)

    expect(selectTodayTasksQueryView(afterA, null)).toEqual({
      data: null,
      error: null,
      isLoading: false,
    })
  })
})
