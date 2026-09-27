import { describe, expect, it } from 'vitest'
import { InvalidAcceptResponseError } from '@/domain/decisions/decision'
import {
  countCodePoints,
  getRecommendationActionErrorMessage,
  isAbortError,
  parseActorUserId,
  parseDecisionTitle,
  parseRejectionComment,
  parseRejectionReason,
  RECOMMENDATION_REJECTION_REASONS,
  recommendationActionPath,
} from './recommendationActions'
import { BackendApiError } from '@/services/api/apiClient'
import { ru } from '@/i18n/ru'

describe('recommendationActionPath', () => {
  it('builds encoded origin-absolute action endpoints', () => {
    expect(recommendationActionPath('biz/1', 'rec a', 'accept')).toBe(
      '/api/v1/businesses/biz%2F1/recommendations/rec%20a/accept',
    )
  })
})

describe('parseActorUserId', () => {
  it('returns a trimmed user id', () => {
    expect(parseActorUserId('  user-123  ')).toBe('user-123')
  })

  it('returns null for missing values', () => {
    expect(parseActorUserId(null)).toBeNull()
    expect(parseActorUserId(undefined)).toBeNull()
    expect(parseActorUserId('')).toBeNull()
    expect(parseActorUserId('   ')).toBeNull()
  })
})

describe('parseDecisionTitle', () => {
  it('trims a valid title', () => {
    expect(parseDecisionTitle('  Позвонить  ')).toBe('Позвонить')
  })

  it('rejects empty or whitespace titles', () => {
    expect(parseDecisionTitle('')).toBeNull()
    expect(parseDecisionTitle('   ')).toBeNull()
  })

  it('accepts 500 Unicode code points', () => {
    const title = 'и'.repeat(500)
    expect(countCodePoints(title)).toBe(500)
    expect(parseDecisionTitle(title)).toBe(title)
  })

  it('rejects 501 Unicode code points', () => {
    const title = 'и'.repeat(501)
    expect(countCodePoints(title)).toBe(501)
    expect(parseDecisionTitle(title)).toBeNull()
  })
})

describe('rejection reasons', () => {
  it('accepts every backend rejection reason', () => {
    expect(RECOMMENDATION_REJECTION_REASONS).toEqual([
      'NOT_RELEVANT',
      'ALREADY_DONE',
      'NOT_SUITABLE_FOR_COMPANY',
      'NOT_PRIORITY',
      'OTHER',
    ])

    for (const reason of RECOMMENDATION_REJECTION_REASONS) {
      expect(parseRejectionReason(reason)).toBe(reason)
    }
  })

  it('requires a 1-500 Unicode comment only for OTHER', () => {
    expect(parseRejectionComment('NOT_RELEVANT', undefined)).toEqual({
      ok: true,
      comment: undefined,
    })
    expect(parseRejectionComment('NOT_PRIORITY', 'should be ignored')).toEqual({
      ok: true,
      comment: undefined,
    })
    expect(parseRejectionComment('OTHER', undefined).ok).toBe(false)
    expect(parseRejectionComment('OTHER', '   ').ok).toBe(false)
    expect(parseRejectionComment('OTHER', '  Нужно позже  ')).toEqual({
      ok: true,
      comment: 'Нужно позже',
    })
    expect(parseRejectionComment('OTHER', 'и'.repeat(500)).ok).toBe(true)
    expect(parseRejectionComment('OTHER', 'и'.repeat(501)).ok).toBe(false)
  })
})

describe('getRecommendationActionErrorMessage', () => {
  it('maps a backend code and falls back without exposing a raw stack', () => {
    expect(
      getRecommendationActionErrorMessage(
        new BackendApiError(409, 'RECOMMENDATION_STATUS_CONFLICT', 'raw', {}),
      ),
    ).toBe(ru.today.actionErrors.statusConflict)
    expect(getRecommendationActionErrorMessage(new Error('boom'))).toBe(
      ru.today.actionFailed,
    )
    expect(getRecommendationActionErrorMessage(new Error('boom'))).not.toBe('boom')
    expect(getRecommendationActionErrorMessage(new InvalidAcceptResponseError())).toBe(
      ru.today.actionErrors.invalidAcceptDecision,
    )
  })

  it('treats AbortError as abort, not as an unknown action failure helper', () => {
    const error = new Error('Aborted')
    error.name = 'AbortError'
    expect(isAbortError(error)).toBe(true)
    expect(isAbortError(new Error('no'))).toBe(false)
  })
})
