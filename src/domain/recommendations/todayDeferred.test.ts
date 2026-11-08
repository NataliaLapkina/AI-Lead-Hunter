import { describe, expect, it } from 'vitest'
import {
  InvalidTodayDeferredResponseError,
  parseTodayDeferred,
} from './todayDeferred'

const snoozedUntil = '2026-11-10T11:30:00.000Z'

const item = {
  id: 'recommendation_1',
  title: 'Вернуться к решению',
  status: 'VIEWED',
  snoozedUntil,
  company: { id: 'company_1', name: 'Северная верфь' },
}

describe('parseTodayDeferred', () => {
  it('parses a viewed item and a new item without a company', () => {
    expect(parseTodayDeferred({ items: [item] })).toEqual({ items: [item] })
    expect(
      parseTodayDeferred({
        items: [{ ...item, id: 'recommendation_2', status: 'NEW', company: null }],
      }),
    ).toEqual({
      items: [{ ...item, id: 'recommendation_2', status: 'NEW', company: null }],
    })
  })

  it('rejects malformed data, status, date, and company', () => {
    expect(() => parseTodayDeferred(null)).toThrow(InvalidTodayDeferredResponseError)
    expect(() => parseTodayDeferred({ items: 'nope' })).toThrow(InvalidTodayDeferredResponseError)
    expect(() => parseTodayDeferred({ items: [{ ...item, status: 'ACCEPTED' }] })).toThrow(
      InvalidTodayDeferredResponseError,
    )
    expect(() => parseTodayDeferred({ items: [{ ...item, snoozedUntil: '2026-11-10' }] })).toThrow(
      InvalidTodayDeferredResponseError,
    )
    expect(() =>
      parseTodayDeferred({ items: [{ ...item, company: { id: '', name: 'Север' } }] }),
    ).toThrow(InvalidTodayDeferredResponseError)
  })
})
