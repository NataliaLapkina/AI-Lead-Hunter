export const TODAY_DEFERRED_STATUSES = ['NEW', 'VIEWED'] as const

export type TodayDeferredStatus = (typeof TODAY_DEFERRED_STATUSES)[number]

export type TodayDeferredCompany = {
  id: string
  name: string
}

export type TodayDeferredItem = {
  id: string
  title: string
  status: TodayDeferredStatus
  snoozedUntil: string
  company: TodayDeferredCompany | null
}

export type TodayDeferred = {
  items: TodayDeferredItem[]
}

export class InvalidTodayDeferredResponseError extends Error {
  constructor(message = 'Today deferred response is malformed.') {
    super(message)
    this.name = 'InvalidTodayDeferredResponseError'
  }
}

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] ?? 0
}

function readNonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidTodayDeferredResponseError()
  }

  return value
}

function readSnoozedUntil(value: unknown): string {
  const snoozedUntil = readNonEmptyString(value)
  const match = RFC3339_DATE_TIME.exec(snoozedUntil)
  if (!match) {
    throw new InvalidTodayDeferredResponseError()
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    !Number.isFinite(Date.parse(snoozedUntil))
  ) {
    throw new InvalidTodayDeferredResponseError()
  }

  return snoozedUntil
}

function readStatus(value: unknown): TodayDeferredStatus {
  if (value !== 'NEW' && value !== 'VIEWED') {
    throw new InvalidTodayDeferredResponseError()
  }

  return value
}

function readCompany(value: unknown): TodayDeferredCompany | null {
  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    throw new InvalidTodayDeferredResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    name: readNonEmptyString(value.name),
  }
}

function readItem(value: unknown): TodayDeferredItem {
  if (!isRecord(value)) {
    throw new InvalidTodayDeferredResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    title: readNonEmptyString(value.title),
    status: readStatus(value.status),
    snoozedUntil: readSnoozedUntil(value.snoozedUntil),
    company: readCompany(value.company),
  }
}

export function parseTodayDeferred(value: unknown): TodayDeferred {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new InvalidTodayDeferredResponseError()
  }

  return {
    items: value.items.map(readItem),
  }
}
