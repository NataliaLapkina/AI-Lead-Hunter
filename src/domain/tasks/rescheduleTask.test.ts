import { describe, expect, it } from 'vitest'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import {
  InvalidRescheduleTaskResponseError,
  getRescheduleTaskErrorMessage,
  parseRescheduleTaskResult,
} from './rescheduleTask'

const dueAt = '2026-11-08T07:00:00.000Z'

describe('parseRescheduleTaskResult', () => {
  it.each(['TODO', 'IN_PROGRESS'] as const)('accepts status %s and reads only id, status, and dueAt', (status) => {
    expect(
      parseRescheduleTaskResult({
        task: { id: 'task_1', status, dueAt, title: 'ignored' },
      }),
    ).toEqual({
      task: { id: 'task_1', status, dueAt },
    })
  })

  it.each(['DONE', 'CANCELLED', 'OPEN', 'todo'] as const)('rejects status %s', (status) => {
    expect(() => parseRescheduleTaskResult({ task: { id: 'task_1', status, dueAt } })).toThrow(
      InvalidRescheduleTaskResponseError,
    )
  })

  it('rejects a malformed shape or dueAt', () => {
    expect(() => parseRescheduleTaskResult(null)).toThrow(InvalidRescheduleTaskResponseError)
    expect(() => parseRescheduleTaskResult({ task: null })).toThrow(InvalidRescheduleTaskResponseError)
    expect(() => parseRescheduleTaskResult({ tasks: [] })).toThrow(InvalidRescheduleTaskResponseError)
    expect(() => parseRescheduleTaskResult({ task: { status: 'TODO', dueAt } })).toThrow(
      InvalidRescheduleTaskResponseError,
    )
    expect(() => parseRescheduleTaskResult({ task: { id: ' ', status: 'TODO', dueAt } })).toThrow(
      InvalidRescheduleTaskResponseError,
    )
    expect(() => parseRescheduleTaskResult({ task: { id: 'task_1', dueAt } })).toThrow(
      InvalidRescheduleTaskResponseError,
    )
    expect(() =>
      parseRescheduleTaskResult({ task: { id: 'task_1', status: 'TODO', dueAt: 'tomorrow' } }),
    ).toThrow(InvalidRescheduleTaskResponseError)
    expect(() =>
      parseRescheduleTaskResult({ task: { id: 'task_1', status: 'TODO', dueAt: '2026-11-08' } }),
    ).toThrow(InvalidRescheduleTaskResponseError)
    expect(() =>
      parseRescheduleTaskResult({ task: { id: 'task_1', status: 'TODO', dueAt: '' } }),
    ).toThrow(InvalidRescheduleTaskResponseError)
  })
})

describe('getRescheduleTaskErrorMessage', () => {
  it('translates reschedule failures without exposing raw codes', () => {
    expect(
      getRescheduleTaskErrorMessage(
        new BackendApiError(400, 'DUE_AT_NOT_IN_FUTURE', 'dueAt must be in the future.', {}),
      ),
    ).toBe(ru.today.reschedule.notInFuture)
    expect(
      getRescheduleTaskErrorMessage(
        new BackendApiError(409, 'TASK_STATUS_CONFLICT', 'raw code', {}),
      ),
    ).toBe(ru.today.reschedule.statusConflict)
    expect(
      getRescheduleTaskErrorMessage(new BackendApiError(404, 'TASK_NOT_FOUND', 'Task not found.', {})),
    ).toBe(ru.today.reschedule.notFound)
    expect(getRescheduleTaskErrorMessage(new Error('network down'))).toBe(ru.today.reschedule.failed)
    expect(ru.today.reschedule.notInFuture).not.toContain('DUE_AT_NOT_IN_FUTURE')
    expect(ru.today.reschedule.statusConflict).not.toContain('TASK_STATUS_CONFLICT')
    expect(ru.today.reschedule.notFound).not.toContain('TASK_NOT_FOUND')
    expect(ru.today.reschedule.failed).not.toContain('network')
  })
})
