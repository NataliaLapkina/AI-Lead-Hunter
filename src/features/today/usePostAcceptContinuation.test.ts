/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { acceptResultFixture } from '@/domain/decisions/decision.fixture'
import type { NeedsDecisionRecommendation } from '@/domain/recommendations/needsDecision'
import {
  isCurrentContinuationIdentity,
  selectVisibleContinuations,
  usePostAcceptContinuations,
} from './usePostAcceptContinuation'

const recommendation: NeedsDecisionRecommendation = {
  id: 'rec_1',
  title: 'Назначить звонок',
  description: '',
  reason: '',
  priority: 'HIGH',
  status: 'NEW',
  snoozedUntil: null,
  createdAt: '2026-09-18T10:00:00.000Z',
  company: null,
  knowledge: [],
}

const continuation = {
  identity: 1,
  recommendationId: 'rec_1',
  businessId: 'biz_A',
  decision: acceptResultFixture.decision,
  recommendation,
}

const newContinuation = {
  recommendationId: 'rec_1',
  businessId: 'biz_A',
  decision: acceptResultFixture.decision,
  recommendation,
}

describe('selectVisibleContinuations', () => {
  it('never shows a Business A continuation in Business B', () => {
    expect(selectVisibleContinuations([continuation], 'biz_B')).toEqual([])
  })

  it('returns only the current Business continuation', () => {
    expect(selectVisibleContinuations([continuation], 'biz_A')).toEqual([
      continuation,
    ])
  })
})

describe('isCurrentContinuationIdentity', () => {
  it('matches only the exact recommendation and identity', () => {
    expect(isCurrentContinuationIdentity(continuation, 'rec_1', 1)).toBe(true)
    expect(isCurrentContinuationIdentity(continuation, 'rec_1', 2)).toBe(false)
    expect(isCurrentContinuationIdentity(continuation, 'rec_2', 1)).toBe(false)
  })
})

describe('usePostAcceptContinuations', () => {
  it('creates a new identity on replacement and ignores a stale remove', () => {
    const { result } = renderHook(() => usePostAcceptContinuations('biz_A'))

    act(() => {
      result.current.add(newContinuation)
    })
    const first = result.current.continuations[0]
    expect(first?.identity).toBe(1)

    act(() => {
      result.current.add({
        ...newContinuation,
        decision: { ...acceptResultFixture.decision, id: 'dec_2', title: 'C2' },
      })
    })
    const second = result.current.continuations[0]
    expect(second?.identity).toBe(2)
    expect(second?.identity).not.toBe(first?.identity)
    expect(second?.decision.id).toBe('dec_2')

    act(() => {
      result.current.remove('rec_1', first?.identity as number)
    })
    expect(result.current.continuations[0]?.identity).toBe(2)
    expect(result.current.continuations[0]?.decision.title).toBe('C2')

    act(() => {
      result.current.remove('rec_1', 2)
    })
    expect(result.current.continuations).toEqual([])
  })
})
