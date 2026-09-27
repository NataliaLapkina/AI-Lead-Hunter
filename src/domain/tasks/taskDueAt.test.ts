import { describe, expect, it } from 'vitest'
import {
  dueAtCustomDate,
  dueAtToday,
  dueAtTomorrow,
  isTodayDueAtAvailable,
} from './taskDueAt'

describe('task dueAt helpers', () => {
  it('uses local now + 1 hour for Today and stays on the same local day', () => {
    const now = new Date(2026, 8, 27, 10, 15, 42, 123)
    const dueAt = dueAtToday(now)

    expect(dueAt).not.toBeNull()
    const due = new Date(dueAt as string)
    expect(due.getFullYear()).toBe(2026)
    expect(due.getMonth()).toBe(8)
    expect(due.getDate()).toBe(27)
    expect(due.getHours()).toBe(11)
    expect(due.getMinutes()).toBe(15)
    expect(due.getSeconds()).toBe(0)
    expect(due.getMilliseconds()).toBe(0)
    expect(dueAt).toBe(due.toISOString())
  })

  it('disables Today when now + 1 hour crosses local midnight', () => {
    const now = new Date(2026, 8, 27, 23, 30, 0, 0)
    expect(isTodayDueAtAvailable(now)).toBe(false)
    expect(dueAtToday(now)).toBeNull()
  })

  it('uses local tomorrow at 09:00', () => {
    const now = new Date(2026, 8, 27, 18, 0, 0, 0)
    const dueAt = dueAtTomorrow(now)
    const due = new Date(dueAt as string)

    expect(due.getFullYear()).toBe(2026)
    expect(due.getMonth()).toBe(8)
    expect(due.getDate()).toBe(28)
    expect(due.getHours()).toBe(9)
    expect(due.getMinutes()).toBe(0)
    expect(dueAt).toBe(due.toISOString())
  })

  it('uses local 09:00 for a custom date and rejects a past local 09:00', () => {
    const now = new Date(2026, 8, 27, 10, 0, 0, 0)
    const future = dueAtCustomDate('2026-09-28', now)
    const due = new Date(future as string)

    expect(due.getFullYear()).toBe(2026)
    expect(due.getMonth()).toBe(8)
    expect(due.getDate()).toBe(28)
    expect(due.getHours()).toBe(9)
    expect(dueAtCustomDate('2026-09-27', now)).toBeNull()
    expect(dueAtCustomDate('2026-09-26', now)).toBeNull()
    expect(dueAtCustomDate('not-a-date', now)).toBeNull()
    expect(dueAtCustomDate('2026-09-28', now)).toBe(due.toISOString())
  })

  it('rejects 2026-02-30 instead of letting JavaScript Date roll over', () => {
    const now = new Date(2026, 1, 1, 10, 0, 0, 0)
    const jsRollover = new Date(2026, 1, 30, 9, 0, 0, 0)

    expect(jsRollover.getFullYear()).toBe(2026)
    expect(jsRollover.getMonth()).toBe(2)
    expect(jsRollover.getDate()).toBe(2)
    expect(dueAtCustomDate('2026-02-30', now)).toBeNull()

    const valid = dueAtCustomDate('2026-02-28', now)
    expect(valid).not.toBeNull()
    const reconstructed = new Date(valid as string)
    expect(reconstructed.getFullYear()).toBe(2026)
    expect(reconstructed.getMonth()).toBe(1)
    expect(reconstructed.getDate()).toBe(28)
    expect(reconstructed.getHours()).toBe(9)
  })
})
