import { describe, expect, it } from 'vitest'
import {
  InvalidAcceptResponseError,
  parseAcceptRecommendationResult,
} from './decision'
import { acceptResultFixture } from './decision.fixture'

function parseWithDecision(
  decision: Record<string, unknown>,
  recommendation: Record<string, unknown> = acceptResultFixture.recommendation,
) {
  return parseAcceptRecommendationResult({
    recommendation,
    decision,
  })
}

describe('parseAcceptRecommendationResult', () => {
  it('parses a valid Accept Decision response', () => {
    expect(parseAcceptRecommendationResult(acceptResultFixture)).toEqual(
      acceptResultFixture,
    )
  })

  it('rejects empty and whitespace required IDs', () => {
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, id: '' }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, id: '   ' }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, recommendationId: '' }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({
        ...acceptResultFixture.decision,
        recommendationId: '   ',
      }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, decidedById: '' }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseAcceptRecommendationResult({
        recommendation: { ...acceptResultFixture.recommendation, id: '' },
        decision: acceptResultFixture.decision,
      }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseAcceptRecommendationResult({
        recommendation: { ...acceptResultFixture.recommendation, id: '   ' },
        decision: acceptResultFixture.decision,
      }),
    ).toThrow(InvalidAcceptResponseError)
  })

  it('rejects an empty or whitespace Decision.title', () => {
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, title: '' }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, title: '   ' }),
    ).toThrow(InvalidAcceptResponseError)
  })

  it('rejects a Decision.status outside ACTIVE COMPLETED CANCELLED SUPERSEDED', () => {
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, status: 'PENDING' }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, status: 'active' }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({ ...acceptResultFixture.decision, status: '' }),
    ).toThrow(InvalidAcceptResponseError)
  })

  it('rejects invalid DateTime values including calendar-impossible dates', () => {
    expect(() =>
      parseWithDecision({
        ...acceptResultFixture.decision,
        createdAt: 'not-a-date',
      }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({
        ...acceptResultFixture.decision,
        updatedAt: '2026-09-27',
      }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseWithDecision({
        ...acceptResultFixture.decision,
        createdAt: '2026-02-30T09:00:00.000Z',
      }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseAcceptRecommendationResult({
        recommendation: {
          ...acceptResultFixture.recommendation,
          updatedAt: 'Invalid Date',
        },
        decision: acceptResultFixture.decision,
      }),
    ).toThrow(InvalidAcceptResponseError)
  })

  it('rejects a missing required field', () => {
    const { decidedById: _omitted, ...withoutDecidedById } =
      acceptResultFixture.decision
    expect(() => parseWithDecision(withoutDecidedById)).toThrow(
      InvalidAcceptResponseError,
    )
  })

  it('rejects a malformed envelope without data.recommendation and data.decision', () => {
    expect(() => parseAcceptRecommendationResult(null)).toThrow(
      InvalidAcceptResponseError,
    )
    expect(() => parseAcceptRecommendationResult([])).toThrow(
      InvalidAcceptResponseError,
    )
    expect(() =>
      parseAcceptRecommendationResult({ data: acceptResultFixture }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseAcceptRecommendationResult({
        recommendation: acceptResultFixture.recommendation,
      }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseAcceptRecommendationResult({
        decision: acceptResultFixture.decision,
      }),
    ).toThrow(InvalidAcceptResponseError)
    expect(() =>
      parseAcceptRecommendationResult({
        recommendation: acceptResultFixture.recommendation,
        decision: { id: 'dec_1', title: 'Позвонить сегодня' },
      }),
    ).toThrow(InvalidAcceptResponseError)
  })
})
