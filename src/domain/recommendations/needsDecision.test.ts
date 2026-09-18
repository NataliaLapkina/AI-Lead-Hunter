import { describe, expect, it } from 'vitest'
import {
  parseNeedsDecisionRecommendations,
  InvalidNeedsDecisionResponseError,
} from './needsDecision'

const validRecommendation = {
  id: 'rec_1',
  title: 'Call the company',
  description: 'Follow up with the founder.',
  reason: 'Recent hiring signal.',
  priority: 'HIGH',
  status: 'NEW',
  snoozedUntil: null,
  createdAt: '2026-09-18T10:00:00.000Z',
  company: {
    id: 'company_1',
    name: 'Acme',
    website: 'https://example.com',
  },
  knowledge: [
    {
      id: 'knowledge_1',
      content: 'Verified office address.',
      type: 'FACT',
      verificationStatus: 'VERIFIED',
      sourceType: 'WEBSITE',
      sourceLabel: 'Official site',
      sourceUrl: 'https://example.com/about',
      obtainedAt: '2026-09-01T00:00:00.000Z',
      lastCheckedAt: null,
    },
  ],
}

describe('parseNeedsDecisionRecommendations', () => {
  it('parses a valid payload and keeps only approved company fields', () => {
    const parsed = parseNeedsDecisionRecommendations({
      recommendations: [validRecommendation],
    })

    expect(parsed.recommendations).toHaveLength(1)
    expect(parsed.recommendations[0]).toEqual({
      ...validRecommendation,
      company: {
        id: 'company_1',
        name: 'Acme',
      },
    })
  })

  it('allows a recommendation without a company', () => {
    const parsed = parseNeedsDecisionRecommendations({
      recommendations: [
        {
          ...validRecommendation,
          company: null,
          knowledge: [],
        },
      ],
    })

    expect(parsed.recommendations[0]?.company).toBeNull()
    expect(parsed.recommendations[0]?.knowledge).toEqual([])
  })

  it('rejects a missing recommendations array', () => {
    expect(() => parseNeedsDecisionRecommendations({})).toThrow(
      InvalidNeedsDecisionResponseError,
    )
  })

  it('rejects a recommendation with an invalid company', () => {
    expect(() =>
      parseNeedsDecisionRecommendations({
        recommendations: [
          {
            ...validRecommendation,
            company: { id: 'company_1' },
          },
        ],
      }),
    ).toThrow(InvalidNeedsDecisionResponseError)
  })

  it('rejects an invalid Recommendation priority', () => {
    expect(() =>
      parseNeedsDecisionRecommendations({
        recommendations: [{ ...validRecommendation, priority: 'URGENT' }],
      }),
    ).toThrow(InvalidNeedsDecisionResponseError)
  })

  it('rejects an invalid Recommendation status', () => {
    expect(() =>
      parseNeedsDecisionRecommendations({
        recommendations: [{ ...validRecommendation, status: 'PENDING' }],
      }),
    ).toThrow(InvalidNeedsDecisionResponseError)
  })

  it('rejects an invalid Knowledge type', () => {
    expect(() =>
      parseNeedsDecisionRecommendations({
        recommendations: [
          {
            ...validRecommendation,
            knowledge: [
              {
                ...validRecommendation.knowledge[0],
                type: 'INFERENCE',
              },
            ],
          },
        ],
      }),
    ).toThrow(InvalidNeedsDecisionResponseError)
  })

  it('rejects an invalid verificationStatus', () => {
    expect(() =>
      parseNeedsDecisionRecommendations({
        recommendations: [
          {
            ...validRecommendation,
            knowledge: [
              {
                ...validRecommendation.knowledge[0],
                verificationStatus: 'UNVERIFIED',
              },
            ],
          },
        ],
      }),
    ).toThrow(InvalidNeedsDecisionResponseError)
  })

  it('rejects an invalid sourceType', () => {
    expect(() =>
      parseNeedsDecisionRecommendations({
        recommendations: [
          {
            ...validRecommendation,
            knowledge: [
              {
                ...validRecommendation.knowledge[0],
                sourceType: 'MANUAL',
              },
            ],
          },
        ],
      }),
    ).toThrow(InvalidNeedsDecisionResponseError)
  })

  it('keeps valid USER_INFO unchanged', () => {
    const parsed = parseNeedsDecisionRecommendations({
      recommendations: [
        {
          ...validRecommendation,
          knowledge: [
            {
              ...validRecommendation.knowledge[0],
              type: 'USER_INFO',
            },
          ],
        },
      ],
    })

    expect(parsed.recommendations[0]?.knowledge[0]?.type).toBe('USER_INFO')
  })

  it('keeps valid AI_INFERENCE and ASSUMPTION unchanged', () => {
    const parsed = parseNeedsDecisionRecommendations({
      recommendations: [
        {
          ...validRecommendation,
          knowledge: [
            {
              ...validRecommendation.knowledge[0],
              type: 'AI_INFERENCE',
              verificationStatus: 'ASSUMPTION',
            },
          ],
        },
      ],
    })

    expect(parsed.recommendations[0]?.knowledge[0]).toMatchObject({
      type: 'AI_INFERENCE',
      verificationStatus: 'ASSUMPTION',
    })
  })
})
