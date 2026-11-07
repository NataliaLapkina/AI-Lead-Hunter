import { describe, expect, it } from 'vitest'
import {
  defaultManualDateInput,
  defaultManualTimeInput,
  inThreeDaysAtTenDueAt,
  isLaterTodayAvailable,
  laterTodayDueAt,
  localDateTimeToRfc3339,
  parseManualLocalDateTime,
  tomorrowAtTenDueAt,
} from './rescheduleDueAt'

function localDate(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  millisecond = 0,
): Date {
  return new Date(year, monthIndex, day, hour, minute, second, millisecond)
}

describe('later today', () => {
  it('adds three hours and stays on the same local day', () => {
    const now = localDate(2026, 10, 7, 15, 4, 5, 6)
    const result = laterTodayDueAt(now)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const due = new Date(result.dueAt)
    expect(due.getFullYear()).toBe(2026)
    expect(due.getMonth()).toBe(10)
    expect(due.getDate()).toBe(7)
    expect(due.getHours()).toBe(18)
    expect(due.getMinutes()).toBe(4)
    expect(due.getSeconds()).toBe(5)
    expect(due.getMilliseconds()).toBe(6)
    expect(result.dueAt).toBe(due.toISOString())
    expect(isLaterTodayAvailable(now)).toBe(true)
  })

  it('is unavailable when three hours cross the local midnight instead of moving to tomorrow', () => {
    const now = localDate(2026, 10, 7, 21, 0, 0, 0)
    expect(laterTodayDueAt(now)).toEqual({ ok: false, reason: 'unavailable' })
    expect(isLaterTodayAvailable(now)).toBe(false)

    const late = localDate(2026, 10, 7, 22, 15, 0, 0)
    expect(laterTodayDueAt(late)).toEqual({ ok: false, reason: 'unavailable' })
  })
})

describe('tomorrow and three days', () => {
  it('uses the next local calendar day at 10:00', () => {
    const now = localDate(2026, 10, 7, 23, 40, 0, 0)
    const result = tomorrowAtTenDueAt(now)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const due = new Date(result.dueAt)
    expect(due.getFullYear()).toBe(2026)
    expect(due.getMonth()).toBe(10)
    expect(due.getDate()).toBe(8)
    expect(due.getHours()).toBe(10)
    expect(due.getMinutes()).toBe(0)
    expect(due.getSeconds()).toBe(0)
    expect(result.dueAt).toBe(due.toISOString())
  })

  it('uses the local day three days ahead at 10:00, including a month boundary', () => {
    const now = localDate(2026, 10, 7, 15, 0, 0, 0)
    const result = inThreeDaysAtTenDueAt(now)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const due = new Date(result.dueAt)
    expect(due.getFullYear()).toBe(2026)
    expect(due.getMonth()).toBe(10)
    expect(due.getDate()).toBe(10)
    expect(due.getHours()).toBe(10)
    expect(due.getMinutes()).toBe(0)
    expect(result.dueAt).toBe(due.toISOString())

    const monthEnd = inThreeDaysAtTenDueAt(localDate(2026, 10, 30, 18, 0, 0, 0))
    expect(monthEnd.ok).toBe(true)
    if (!monthEnd.ok) {
      return
    }

    const rolled = new Date(monthEnd.dueAt)
    expect(rolled.getFullYear()).toBe(2026)
    expect(rolled.getMonth()).toBe(11)
    expect(rolled.getDate()).toBe(3)
    expect(rolled.getHours()).toBe(10)
  })
})

describe('manual local datetime', () => {
  const now = localDate(2026, 10, 7, 15, 0, 0, 0)

  it('defaults the manual fields to tomorrow at 10:00', () => {
    expect(defaultManualDateInput(now)).toBe('2026-11-08')
    expect(defaultManualTimeInput()).toBe('10:00')
    expect(defaultManualDateInput(localDate(2026, 11, 31, 12, 0, 0, 0))).toBe('2027-01-01')
  })

  it('accepts a local date and time and converts it with toISOString', () => {
    const result = parseManualLocalDateTime('2026-12-01', '14:30', now)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const due = new Date(result.dueAt)
    expect(due.getFullYear()).toBe(2026)
    expect(due.getMonth()).toBe(11)
    expect(due.getDate()).toBe(1)
    expect(due.getHours()).toBe(14)
    expect(due.getMinutes()).toBe(30)
    expect(result.dueAt).toBe(localDate(2026, 11, 1, 14, 30).toISOString())
    expect(result.dueAt).toBe(due.toISOString())
  })

  it('rejects a past local datetime and a datetime equal to now', () => {
    expect(parseManualLocalDateTime('2026-11-06', '10:00', now)).toEqual({
      ok: false,
      reason: 'not-in-future',
    })
    expect(
      localDateTimeToRfc3339({ year: 2026, month: 11, day: 7, hour: 15, minute: 0 }, now),
    ).toEqual({ ok: false, reason: 'not-in-future' })
    expect(parseManualLocalDateTime('2026-11-07', '15:00', now)).toEqual({
      ok: false,
      reason: 'not-in-future',
    })
  })

  it('rejects a normalized nonexistent local date instead of shifting it', () => {
    const rolled = new Date(2026, 1, 31, 10, 0, 0, 0)
    expect(rolled.getMonth()).not.toBe(1)
    expect(rolled.getDate()).not.toBe(31)

    expect(
      localDateTimeToRfc3339({ year: 2026, month: 2, day: 31, hour: 10, minute: 0 }, now),
    ).toEqual({ ok: false, reason: 'invalid' })
    expect(parseManualLocalDateTime('2026-02-31', '10:00', now)).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(parseManualLocalDateTime('2026-04-31', '10:00', now)).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(parseManualLocalDateTime('not-a-date', '10:00', now)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('rejects a local time the runtime normalizes and keeps one it does not', () => {
    const probeNow = localDate(2026, 2, 8, 0, 30, 0, 0)
    const probe = new Date(2026, 2, 8, 2, 30, 0, 0)
    const normalized =
      probe.getFullYear() !== 2026 ||
      probe.getMonth() !== 2 ||
      probe.getDate() !== 8 ||
      probe.getHours() !== 2 ||
      probe.getMinutes() !== 30
    const result = localDateTimeToRfc3339(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30 },
      probeNow,
    )

    if (normalized) {
      expect(result).toEqual({ ok: false, reason: 'invalid' })
      return
    }

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const due = new Date(result.dueAt)
    expect(due.getHours()).toBe(2)
    expect(due.getMinutes()).toBe(30)
    expect(result.dueAt).toBe(probe.toISOString())
  })
})
