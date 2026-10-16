import { describe, expect, it } from 'vitest'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import {
  InvalidStartTaskResponseError,
  getStartTaskErrorMessage,
  parseStartTaskResult,
} from './startTask'

describe('parseStartTaskResult', () => {
  it('reads only id and status', () => {
    expect(
      parseStartTaskResult({
        task: { id: 'task_1', status: 'IN_PROGRESS', title: 'ignored' },
      }),
    ).toEqual({
      task: { id: 'task_1', status: 'IN_PROGRESS' },
    })
  })

  it('accepts IN_PROGRESS as a successful start status', () => {
    expect(parseStartTaskResult({ task: { id: 'task_1', status: 'IN_PROGRESS' } })).toEqual({
      task: { id: 'task_1', status: 'IN_PROGRESS' },
    })
  })

  it('rejects TODO as a successful start status', () => {
    expect(() => parseStartTaskResult({ task: { id: 'task_1', status: 'TODO' } })).toThrow(
      InvalidStartTaskResponseError,
    )
  })

  it('rejects DONE as a successful start status', () => {
    expect(() => parseStartTaskResult({ task: { id: 'task_1', status: 'DONE' } })).toThrow(
      InvalidStartTaskResponseError,
    )
  })

  it('rejects CANCELLED as a successful start status', () => {
    expect(() => parseStartTaskResult({ task: { id: 'task_1', status: 'CANCELLED' } })).toThrow(
      InvalidStartTaskResponseError,
    )
  })

  it('rejects a malformed status', () => {
    expect(() => parseStartTaskResult({ task: { id: 'task_1', status: 'OPEN' } })).toThrow(
      InvalidStartTaskResponseError,
    )
    expect(() => parseStartTaskResult({ task: { id: 'task_1' } })).toThrow(
      InvalidStartTaskResponseError,
    )
    expect(() => parseStartTaskResult({ task: { id: 'task_1', status: 1 } })).toThrow(
      InvalidStartTaskResponseError,
    )
  })
})

describe('getStartTaskErrorMessage', () => {
  it('translates a status conflict and a missing task without exposing the raw code', () => {
    expect(
      getStartTaskErrorMessage(
        new BackendApiError(409, 'TASK_STATUS_CONFLICT', 'raw code', {}),
      ),
    ).toBe(ru.today.taskActions.statusConflict)
    expect(
      getStartTaskErrorMessage(new BackendApiError(404, 'TASK_NOT_FOUND', 'Task not found.', {})),
    ).toBe(ru.today.taskActions.notFound)
    expect(getStartTaskErrorMessage(new Error('network'))).toBe(ru.today.actionFailed)
    expect(ru.today.taskActions.statusConflict).not.toContain('TASK_STATUS_CONFLICT')
  })
})
