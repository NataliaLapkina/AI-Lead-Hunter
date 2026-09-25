import { describe, expect, it } from 'vitest'
import {
  getSnoozeDateInputMin,
  isRfc3339DateTime,
  snoozeCustomDateUntil,
  snoozeLocalDateAtNine,
  snoozePresetUntil,
} from './snoozePresets'

describe('snoozePresetUntil', () => {
  const now = new Date('2026-09-25T10:00:00.000Z')

  it('converts tomorrow, 3 days, and 1 week into future RFC3339 instants', () => {
    expect(snoozePresetUntil('tomorrow', now)).toBe(
      new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    )
    expect(snoozePresetUntil('inThreeDays', now)).toBe(
      new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    )
    expect(snoozePresetUntil('inOneWeek', now)).toBe(
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    )
  })

  it('returns RFC3339 values that are strictly in the future', () => {
    const tomorrow = snoozePresetUntil('tomorrow', now)
    expect(tomorrow).not.toBeNull()
    expect(isRfc3339DateTime(tomorrow as string)).toBe(true)
    expect(Date.parse(tomorrow as string)).toBeGreaterThan(now.getTime())
  })
})

describe('snoozeCustomDateUntil', () => {
  it('treats the selected date as 09:00 local time and emits RFC3339', () => {
    const now = new Date(2026, 8, 25, 8, 0, 0, 0)
    const localNine = snoozeLocalDateAtNine('2026-09-26')
    expect(localNine).not.toBeNull()
    expect(localNine?.getHours()).toBe(9)
    expect(localNine?.getMinutes()).toBe(0)

    const iso = snoozeCustomDateUntil('2026-09-26', now)
    expect(iso).toBe(localNine?.toISOString())
    expect(iso).not.toBeNull()
    expect(isRfc3339DateTime(iso as string)).toBe(true)
    expect(iso).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('rejects empty, invalid, and past local dates', () => {
    const now = new Date(2026, 8, 25, 12, 0, 0, 0)
    expect(snoozeCustomDateUntil('', now)).toBeNull()
    expect(snoozeCustomDateUntil('not-a-date', now)).toBeNull()
    expect(snoozeCustomDateUntil('2026-09-25', now)).toBeNull()
    expect(snoozeCustomDateUntil('2026-09-24', now)).toBeNull()
  })

  it('keeps min on a date whose 09:00 local is still in the future', () => {
    const beforeNine = new Date(2026, 8, 25, 8, 0, 0, 0)
    expect(getSnoozeDateInputMin(beforeNine)).toBe('2026-09-25')

    const afterNine = new Date(2026, 8, 25, 10, 0, 0, 0)
    expect(getSnoozeDateInputMin(afterNine)).toBe('2026-09-26')
  })
})
