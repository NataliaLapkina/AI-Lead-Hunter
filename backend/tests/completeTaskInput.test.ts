import { describe, expect, it } from 'vitest'
import { TaskCompletionOutcome } from '@prisma/client'
import {
  CommentRequiredError,
  InvalidCommentError,
  InvalidOutcomeError,
  parseCompleteTaskInput,
} from '../src/domain/tasks/completeTaskInput.js'

const outcomes = ['CONTACTED', 'NO_RESPONSE', 'FOLLOW_UP', 'DECLINED', 'OTHER'] as const

describe('TaskCompletionOutcome prisma enum', () => {
  it('exposes the five completion outcomes', () => {
    expect(Object.values(TaskCompletionOutcome)).toEqual([...outcomes])
  })
})

describe('parseCompleteTaskInput', () => {
  it('rejects a missing, non-string, or unknown outcome', () => {
    expect(() => parseCompleteTaskInput({})).toThrow(InvalidOutcomeError)
    expect(() => parseCompleteTaskInput(null)).toThrow(InvalidOutcomeError)
    expect(() => parseCompleteTaskInput({ comment: 'note' })).toThrow(InvalidOutcomeError)
    expect(() => parseCompleteTaskInput({ outcome: 1 })).toThrow(InvalidOutcomeError)
    expect(() => parseCompleteTaskInput({ outcome: 'contacted' })).toThrow(InvalidOutcomeError)
    expect(() => parseCompleteTaskInput({ outcome: 'POSITIVE' })).toThrow(InvalidOutcomeError)
  })

  it.each(outcomes.filter((outcome) => outcome !== 'OTHER'))(
    'accepts %s without a comment and stores an empty comment as null',
    (outcome) => {
      expect(parseCompleteTaskInput({ outcome })).toEqual({ outcome, comment: null })
      expect(parseCompleteTaskInput({ outcome, comment: '   ' })).toEqual({
        outcome,
        comment: null,
      })
      expect(parseCompleteTaskInput({ outcome, comment: '  reached them  ' })).toEqual({
        outcome,
        comment: 'reached them',
      })
    },
  )

  it('rejects a non-string comment', () => {
    expect(() => parseCompleteTaskInput({ outcome: 'CONTACTED', comment: null })).toThrow(
      InvalidCommentError,
    )
    expect(() => parseCompleteTaskInput({ outcome: 'OTHER', comment: 12 })).toThrow(
      InvalidCommentError,
    )
  })

  it('requires a trimmed comment for OTHER and keeps it', () => {
    expect(() => parseCompleteTaskInput({ outcome: 'OTHER' })).toThrow(CommentRequiredError)
    expect(() => parseCompleteTaskInput({ outcome: 'OTHER', comment: ' \n\t ' })).toThrow(
      CommentRequiredError,
    )
    expect(parseCompleteTaskInput({ outcome: 'OTHER', comment: '  custom result  ' })).toEqual({
      outcome: 'OTHER',
      comment: 'custom result',
    })
  })
})
