export const TODAY_ATTENTION_DECISION_STATUSES = [
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'SUPERSEDED',
] as const

export type TodayAttentionDecisionStatus = (typeof TODAY_ATTENTION_DECISION_STATUSES)[number]

export type TodayAttentionCompany = {
  id: string
  name: string
}

export type TodayAttentionDecision = {
  id: string
  title: string
  status: TodayAttentionDecisionStatus
}

export type TodayAttentionItem = {
  id: string
  completedAt: string
  completionOutcome: 'FOLLOW_UP'
  title: string
  company: TodayAttentionCompany | null
  decision: TodayAttentionDecision | null
}

export type TodayAttention = {
  items: TodayAttentionItem[]
}

export class InvalidTodayAttentionResponseError extends Error {
  constructor(message = 'Today attention response is malformed.') {
    super(message)
    this.name = 'InvalidTodayAttentionResponseError'
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
    throw new InvalidTodayAttentionResponseError()
  }

  return value
}

function readCompletedAt(value: unknown): string {
  const completedAt = readNonEmptyString(value)
  const match = RFC3339_DATE_TIME.exec(completedAt)
  if (!match) {
    throw new InvalidTodayAttentionResponseError()
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
    !Number.isFinite(Date.parse(completedAt))
  ) {
    throw new InvalidTodayAttentionResponseError()
  }

  return completedAt
}

function readCompany(value: unknown): TodayAttentionCompany | null {
  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    throw new InvalidTodayAttentionResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    name: readNonEmptyString(value.name),
  }
}

function readDecision(value: unknown): TodayAttentionDecision | null {
  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    throw new InvalidTodayAttentionResponseError()
  }

  const status = value.status
  if (
    status !== 'ACTIVE' &&
    status !== 'COMPLETED' &&
    status !== 'CANCELLED' &&
    status !== 'SUPERSEDED'
  ) {
    throw new InvalidTodayAttentionResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    title: readNonEmptyString(value.title),
    status,
  }
}

function readItem(value: unknown): TodayAttentionItem {
  if (!isRecord(value)) {
    throw new InvalidTodayAttentionResponseError()
  }

  if (value.completionOutcome !== 'FOLLOW_UP') {
    throw new InvalidTodayAttentionResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    completedAt: readCompletedAt(value.completedAt),
    completionOutcome: 'FOLLOW_UP',
    title: readNonEmptyString(value.title),
    company: readCompany(value.company),
    decision: readDecision(value.decision),
  }
}

export function parseTodayAttention(value: unknown): TodayAttention {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new InvalidTodayAttentionResponseError()
  }

  return {
    items: value.items.map(readItem),
  }
}
