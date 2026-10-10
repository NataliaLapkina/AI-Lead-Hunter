import { describe, expect, it } from 'vitest'
import { InvalidTodayTasksResponseError, parseTodayTasks } from './todayTask'

const task = {
  id: 'task_1',
  title: 'Позвонить',
  status: 'TODO',
  dueAt: '2026-10-11T12:00:00.000Z',
  priority: 'HIGH',
  isOverdue: false,
  company: { id: 'company_1', name: 'Северная верфь' },
  decision: { id: 'decision_1', title: 'Связаться', status: 'ACTIVE' },
}

describe('parseTodayTasks', () => {
  it('parses a task with company and decision', () => {
    expect(parseTodayTasks({ tasks: [task] })).toEqual({ tasks: [task] })
  })

  it('keeps null company and null decision', () => {
    expect(
      parseTodayTasks({
        tasks: [{ ...task, company: null, decision: null, isOverdue: true, status: 'IN_PROGRESS' }],
      }),
    ).toEqual({
      tasks: [{ ...task, company: null, decision: null, isOverdue: true, status: 'IN_PROGRESS' }],
    })
  })

  it('rejects a raw status outside the task statuses and a missing dueAt', () => {
    expect(() => parseTodayTasks({ tasks: [{ ...task, status: 'OPEN' }] })).toThrow(
      InvalidTodayTasksResponseError,
    )
    expect(() => parseTodayTasks({ tasks: [{ ...task, dueAt: null }] })).toThrow(
      InvalidTodayTasksResponseError,
    )
    expect(() => parseTodayTasks({ tasks: [{ ...task, isOverdue: 'true' }] })).toThrow(
      InvalidTodayTasksResponseError,
    )
  })
})
