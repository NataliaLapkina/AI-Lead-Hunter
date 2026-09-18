import { describe, expect, it } from 'vitest'
import type { NeedsDecisionRecommendations } from '@/domain/recommendations/needsDecision'
import {
  beginNeedsDecisionQuery,
  failNeedsDecisionQuery,
  selectNeedsDecisionQueryView,
  succeedNeedsDecisionQuery,
} from './needsDecisionQueryState'

const dataA: NeedsDecisionRecommendations = {
  recommendations: [
    {
      id: 'rec-a',
      title: 'A',
      description: 'Business A',
      reason: 'Reason A',
      priority: 'HIGH',
      status: 'NEW',
      snoozedUntil: null,
      createdAt: '2026-09-18T10:00:00.000Z',
      company: { id: 'company-a', name: 'A Inc' },
      knowledge: [],
    },
  ],
}

const dataB: NeedsDecisionRecommendations = {
  recommendations: [
    {
      id: 'rec-b',
      title: 'B',
      description: 'Business B',
      reason: 'Reason B',
      priority: 'LOW',
      status: 'VIEWED',
      snoozedUntil: null,
      createdAt: '2026-09-18T11:00:00.000Z',
      company: null,
      knowledge: [],
    },
  ],
}

describe('selectNeedsDecisionQueryView', () => {
  it('hides Business A data as soon as the current businessId becomes B', () => {
    const afterA = succeedNeedsDecisionQuery('business-a', dataA)

    expect(selectNeedsDecisionQueryView(afterA, 'business-a')).toEqual({
      data: dataA,
      error: null,
      isLoading: false,
    })

    expect(selectNeedsDecisionQueryView(afterA, 'business-b')).toEqual({
      data: null,
      error: null,
      isLoading: true,
    })
  })

  it('does not keep Business A data while B is loading or after B errors', () => {
    const afterA = succeedNeedsDecisionQuery('business-a', dataA)
    const loadingB = beginNeedsDecisionQuery()
    const errorB = failNeedsDecisionQuery(
      'business-b',
      new Error('Business B failed'),
    )

    expect(selectNeedsDecisionQueryView(afterA, 'business-b').data).toBeNull()
    expect(selectNeedsDecisionQueryView(loadingB, 'business-b')).toEqual({
      data: null,
      error: null,
      isLoading: true,
    })
    expect(selectNeedsDecisionQueryView(errorB, 'business-b')).toMatchObject({
      data: null,
      isLoading: false,
    })
    expect(selectNeedsDecisionQueryView(errorB, 'business-b').error?.message).toBe(
      'Business B failed',
    )
    expect(selectNeedsDecisionQueryView(errorB, 'business-a').data).toBeNull()
  })

  it('shows only Business B data after B succeeds', () => {
    const afterB = succeedNeedsDecisionQuery('business-b', dataB)

    expect(selectNeedsDecisionQueryView(afterB, 'business-b').data).toBe(dataB)
    expect(selectNeedsDecisionQueryView(afterB, 'business-a').data).toBeNull()
  })

  it('clears data, error, and loading when businessId is null', () => {
    const afterA = succeedNeedsDecisionQuery('business-a', dataA)

    expect(selectNeedsDecisionQueryView(afterA, null)).toEqual({
      data: null,
      error: null,
      isLoading: false,
    })
  })
})
