export const RESCHEDULE_LATER_TODAY_HOURS = 3
export const RESCHEDULE_PRESET_HOUR = 10
export const RESCHEDULE_PRESET_MINUTE = 0

export type LocalDateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export type RescheduleDueAtFailureReason = 'invalid' | 'not-in-future' | 'unavailable'

export type RescheduleDueAtResult =
  | { ok: true; dueAt: string }
  | { ok: false; reason: RescheduleDueAtFailureReason }

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isInteger(value: number): boolean {
  return Number.isInteger(value)
}

function formatLocalDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function localNoonAfterDays(now: Date, dayOffset: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 12, 0, 0, 0)
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function localDateTimeToRfc3339(
  parts: LocalDateTimeParts,
  now: Date,
): RescheduleDueAtResult {
  const { year, month, day, hour, minute } = parts
  if (
    !isInteger(year) ||
    year < 1 ||
    !isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !isInteger(day) ||
    day < 1 ||
    day > 31 ||
    !isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return { ok: false, reason: 'invalid' }
  }

  const local = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day ||
    local.getHours() !== hour ||
    local.getMinutes() !== minute
  ) {
    return { ok: false, reason: 'invalid' }
  }

  if (local.getTime() <= now.getTime()) {
    return { ok: false, reason: 'not-in-future' }
  }

  return { ok: true, dueAt: local.toISOString() }
}

export function laterTodayDueAt(now: Date): RescheduleDueAtResult {
  const later = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() + RESCHEDULE_LATER_TODAY_HOURS,
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  )

  if (
    !isSameLocalDay(later, now) ||
    later.getHours() !== now.getHours() + RESCHEDULE_LATER_TODAY_HOURS ||
    later.getMinutes() !== now.getMinutes() ||
    later.getSeconds() !== now.getSeconds() ||
    later.getMilliseconds() !== now.getMilliseconds()
  ) {
    return { ok: false, reason: 'unavailable' }
  }

  if (later.getTime() <= now.getTime()) {
    return { ok: false, reason: 'not-in-future' }
  }

  return { ok: true, dueAt: later.toISOString() }
}

export function isLaterTodayAvailable(now: Date): boolean {
  return laterTodayDueAt(now).ok
}

function presetAtHour(now: Date, dayOffset: number): RescheduleDueAtResult {
  const day = localNoonAfterDays(now, dayOffset)
  return localDateTimeToRfc3339(
    {
      year: day.getFullYear(),
      month: day.getMonth() + 1,
      day: day.getDate(),
      hour: RESCHEDULE_PRESET_HOUR,
      minute: RESCHEDULE_PRESET_MINUTE,
    },
    now,
  )
}

export function tomorrowAtTenDueAt(now: Date): RescheduleDueAtResult {
  return presetAtHour(now, 1)
}

export function inThreeDaysAtTenDueAt(now: Date): RescheduleDueAtResult {
  return presetAtHour(now, 3)
}

export function defaultManualDateInput(now: Date): string {
  return formatLocalDateInput(localNoonAfterDays(now, 1))
}

export function defaultManualTimeInput(): string {
  return `${pad2(RESCHEDULE_PRESET_HOUR)}:${pad2(RESCHEDULE_PRESET_MINUTE)}`
}

export function parseManualLocalDateTime(
  dateInput: string,
  timeInput: string,
  now: Date,
): RescheduleDueAtResult {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeInput)
  if (!dateMatch || !timeMatch) {
    return { ok: false, reason: 'invalid' }
  }

  return localDateTimeToRfc3339(
    {
      year: Number(dateMatch[1]),
      month: Number(dateMatch[2]),
      day: Number(dateMatch[3]),
      hour: Number(timeMatch[1]),
      minute: Number(timeMatch[2]),
    },
    now,
  )
}
