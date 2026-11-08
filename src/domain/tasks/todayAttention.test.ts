import { describe, expect, it } from 'vitest'
import {
  InvalidTodayAttentionResponseError,
  parseTodayAttention,
} from './todayAttention'

const completedAt = '2026-09-01T10:00:00.000Z'

const item = {
  id: 'task_1',
  completedAt,
  completionOutcome: 'FOLLOW_UP',
  title: 'Позвонить ещё раз',
  company: { id: 'company_1', name: 'Северная верфь' },
  decision: { id: 'decision_1', title: 'Вернуться к компании', status: 'ACTIVE' },
}

describe('parseTodayAttention', () => {
  it('parses a follow-up item with company and decision', () => {
    expect(parseTodayAttention({ items: [item] })).toEqual({ items: [item] })
  })

  it('keeps null company and null decision', () => {
    expect(
      parseTodayAttention({
        items: [{ ...item, company: null, decision: null }],
      }),
    ).toEqual({
      items: [{ ...item, company: null, decision: null }],
    })
  })

  it('rejects malformed data, outcome, date, company, and decision', () => {
    expect(() => parseTodayAttention(null)).toThrow(InvalidTodayAttentionResponseError)
    expect(() => parseTodayAttention({ items: 'nope' })).toThrow(InvalidTodayAttentionResponseError)
    expect(() =>
      parseTodayAttention({ items: [{ ...item, completionOutcome: 'CONTACTED' }] }),
    ).toThrow(InvalidTodayAttentionResponseError)
    expect(() => parseTodayAttention({ items: [{ ...item, completedAt: '2026-09-01' }] })).toThrow(
      InvalidTodayAttentionResponseError,
    )
    expect(() =>
      parseTodayAttention({ items: [{ ...item, company: { id: '', name: 'Север' } }] }),
    ).toThrow(InvalidTodayAttentionResponseError)
    expect(() => parseTodayAttention({ items: [{ ...item, decision: { id: 'decision_1' } }] })).toThrow(
      InvalidTodayAttentionResponseError,
    )
    expect(() =>
      parseTodayAttention({
        items: [{ ...item, decision: { ...item.decision, status: 'OPEN' } }],
      }),
    ).toThrow(InvalidTodayAttentionResponseError)
  })
})
