import { describe, expect, it } from 'vitest'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'
import {
  InvalidCompleteTaskResponseError,
  getCompleteTaskErrorMessage,
  parseCompleteTaskResult,
} from './completeTask'

const completedAt = '2026-11-08T12:00:00.000Z'
const outcomes = ['CONTACTED', 'NO_RESPONSE', 'FOLLOW_UP', 'DECLINED', 'OTHER'] as const

describe('parseCompleteTaskResult', () => {
  it.each(outcomes)('accepts DONE with outcome %s', (completionOutcome) => {
    expect(
      parseCompleteTaskResult({
        task: {
          id: 'task_1',
          status: 'DONE',
          completedAt,
          completionOutcome,
          completionComment: completionOutcome === 'OTHER' ? 'note' : null,
          title: 'ignored',
        },
      }),
    ).toEqual({
      task: {
        id: 'task_1',
        status: 'DONE',
        completedAt,
        completionOutcome,
        completionComment: completionOutcome === 'OTHER' ? 'note' : null,
      },
    })
  })

  it.each(['TODO', 'IN_PROGRESS', 'CANCELLED', 'done'] as const)('rejects status %s', (status) => {
    expect(() =>
      parseCompleteTaskResult({
        task: {
          id: 'task_1',
          status,
          completedAt,
          completionOutcome: 'CONTACTED',
          completionComment: null,
        },
      }),
    ).toThrow(InvalidCompleteTaskResponseError)
  })

  it('rejects an invalid outcome, completedAt, or comment', () => {
    expect(() => parseCompleteTaskResult(null)).toThrow(InvalidCompleteTaskResponseError)
    expect(() =>
      parseCompleteTaskResult({
        task: {
          id: 'task_1',
          status: 'DONE',
          completedAt,
          completionOutcome: 'POSITIVE',
          completionComment: null,
        },
      }),
    ).toThrow(InvalidCompleteTaskResponseError)
    expect(() =>
      parseCompleteTaskResult({
        task: {
          id: 'task_1',
          status: 'DONE',
          completedAt: 'tomorrow',
          completionOutcome: 'CONTACTED',
          completionComment: null,
        },
      }),
    ).toThrow(InvalidCompleteTaskResponseError)
    expect(() =>
      parseCompleteTaskResult({
        task: {
          id: 'task_1',
          status: 'DONE',
          completedAt,
          completionOutcome: 'CONTACTED',
          completionComment: 1,
        },
      }),
    ).toThrow(InvalidCompleteTaskResponseError)
  })
})

describe('getCompleteTaskErrorMessage', () => {
  it('translates complete failures without exposing raw codes', () => {
    expect(
      getCompleteTaskErrorMessage(new BackendApiError(400, 'COMMENT_REQUIRED', 'raw', {})),
    ).toBe(ru.today.complete.commentRequired)
    expect(
      getCompleteTaskErrorMessage(new BackendApiError(400, 'INVALID_OUTCOME', 'raw', {})),
    ).toBe(ru.today.complete.invalidOutcome)
    expect(
      getCompleteTaskErrorMessage(new BackendApiError(400, 'INVALID_COMMENT', 'raw', {})),
    ).toBe(ru.today.complete.invalidComment)
    expect(
      getCompleteTaskErrorMessage(new BackendApiError(409, 'TASK_STATUS_CONFLICT', 'raw', {})),
    ).toBe(ru.today.complete.statusConflict)
    expect(
      getCompleteTaskErrorMessage(new BackendApiError(404, 'TASK_NOT_FOUND', 'Task not found.', {})),
    ).toBe(ru.today.complete.notFound)
    expect(getCompleteTaskErrorMessage(new Error('network down'))).toBe(ru.today.complete.failed)
    expect(ru.today.complete.commentRequired).not.toContain('COMMENT_REQUIRED')
    expect(ru.today.complete.invalidOutcome).not.toContain('INVALID_OUTCOME')
    expect(ru.today.complete.statusConflict).not.toContain('TASK_STATUS_CONFLICT')
    expect(ru.today.complete.notFound).not.toContain('TASK_NOT_FOUND')
    expect(ru.today.complete.failed).not.toContain('network')
  })
})
