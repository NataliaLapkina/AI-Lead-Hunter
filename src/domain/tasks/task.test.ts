import { describe, expect, it } from 'vitest'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import {
  InvalidCreateTaskResponseError,
  createTaskFromDecisionPath,
  getCreateTaskErrorMessage,
  parseCreateTaskFromDecisionResult,
  parseTaskPriority,
  parseTaskTitle,
} from './task'
import { createdTaskFixture } from './task.fixture'

function parseTask(task: Record<string, unknown>) {
  return parseCreateTaskFromDecisionResult({ task })
}

describe('task domain', () => {
  it('builds an encoded Create Task path', () => {
    expect(createTaskFromDecisionPath('biz/1', 'dec a')).toBe(
      '/api/v1/businesses/biz%2F1/decisions/dec%20a/tasks',
    )
  })

  it('parses a created Task and treats an existing open Task as success', () => {
    expect(parseCreateTaskFromDecisionResult({ task: createdTaskFixture })).toEqual({
      task: createdTaskFixture,
    })
  })

  it('rejects empty and whitespace required IDs', () => {
    expect(() => parseTask({ ...createdTaskFixture, id: '' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, id: '   ' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, businessId: '' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, decisionId: '   ' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, createdById: '' })).toThrow(
      InvalidCreateTaskResponseError,
    )
  })

  it('rejects an invalid Task.priority', () => {
    expect(() => parseTask({ ...createdTaskFixture, priority: 'CRITICAL' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, priority: 'medium' })).toThrow(
      InvalidCreateTaskResponseError,
    )
  })

  it('rejects a Task.status outside TODO IN_PROGRESS DONE CANCELLED', () => {
    expect(() => parseTask({ ...createdTaskFixture, status: 'OPEN' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, status: 'todo' })).toThrow(
      InvalidCreateTaskResponseError,
    )
  })

  it('rejects invalid DateTime values', () => {
    expect(() => parseTask({ ...createdTaskFixture, dueAt: 'not-a-date' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() =>
      parseTask({ ...createdTaskFixture, dueAt: '2026-02-30T09:00:00.000Z' }),
    ).toThrow(InvalidCreateTaskResponseError)
    expect(() =>
      parseTask({ ...createdTaskFixture, createdAt: '2026-09-27' }),
    ).toThrow(InvalidCreateTaskResponseError)
    expect(() =>
      parseTask({ ...createdTaskFixture, updatedAt: 'Invalid Date' }),
    ).toThrow(InvalidCreateTaskResponseError)
    expect(() =>
      parseTask({ ...createdTaskFixture, completedAt: 'not-a-date' }),
    ).toThrow(InvalidCreateTaskResponseError)
  })

  it('rejects wrong nullability for required and nullable fields', () => {
    expect(() => parseTask({ ...createdTaskFixture, decisionId: null })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, createdAt: null })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, updatedAt: null })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, companyId: '   ' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, assignedToId: '' })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseTask({ ...createdTaskFixture, dueAt: undefined })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(
      parseTask({
        ...createdTaskFixture,
        companyId: null,
        assignedToId: null,
        description: '',
        dueAt: null,
        completedAt: null,
      }),
    ).toEqual({
      task: {
        ...createdTaskFixture,
        companyId: null,
        assignedToId: null,
        description: '',
        dueAt: null,
        completedAt: null,
      },
    })
  })

  it('rejects a missing required field and a malformed envelope', () => {
    const { title: _omitted, ...withoutTitle } = createdTaskFixture
    expect(() => parseTask(withoutTitle)).toThrow(InvalidCreateTaskResponseError)
    expect(() => parseCreateTaskFromDecisionResult({})).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() => parseCreateTaskFromDecisionResult({ task: { id: 'task_1' } })).toThrow(
      InvalidCreateTaskResponseError,
    )
    expect(() =>
      parseCreateTaskFromDecisionResult({ data: { task: createdTaskFixture } }),
    ).toThrow(InvalidCreateTaskResponseError)
    expect(() => parseCreateTaskFromDecisionResult({ task: null })).toThrow(
      InvalidCreateTaskResponseError,
    )
  })

  it('trims titles and enforces 1-500 Unicode code points', () => {
    expect(parseTaskTitle('  Позвонить  ')).toBe('Позвонить')
    expect(parseTaskTitle('👍')).toBe('👍')
    expect(parseTaskTitle('и'.repeat(500))).toBe('и'.repeat(500))
    expect(parseTaskTitle('и'.repeat(501))).toBeNull()
    expect(parseTaskTitle('')).toBeNull()
  })

  it('accepts only LOW MEDIUM HIGH', () => {
    expect(parseTaskPriority('LOW')).toBe('LOW')
    expect(parseTaskPriority('MEDIUM')).toBe('MEDIUM')
    expect(parseTaskPriority('HIGH')).toBe('HIGH')
    expect(parseTaskPriority('CRITICAL')).toBeNull()
  })

  it('maps known backend codes to Russian and hides raw codes', () => {
    expect(
      getCreateTaskErrorMessage(
        new BackendApiError(400, 'DUE_AT_NOT_IN_FUTURE', 'raw', {}),
      ),
    ).toBe(ru.today.invalidTaskDueAt)
    expect(
      getCreateTaskErrorMessage(
        new BackendApiError(409, 'DECISION_STATUS_CONFLICT', 'raw', {}),
      ),
    ).toBe(ru.today.actionErrors.decisionStatusConflict)
    expect(getCreateTaskErrorMessage(new Error('unknown'))).toBe(ru.today.actionFailed)
    expect(getCreateTaskErrorMessage(new Error('unknown'))).not.toContain('DUE_AT')
  })
})
