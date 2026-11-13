export const KNOWLEDGE_RECHECK_TYPES = [
  'FACT',
  'OBSERVATION',
  'AI_INFERENCE',
  'USER_INFO',
] as const

export const KNOWLEDGE_RECHECK_STATUSES = ['OUTDATED', 'NEEDS_VERIFICATION'] as const

export type KnowledgeRecheckType = (typeof KNOWLEDGE_RECHECK_TYPES)[number]

export type KnowledgeRecheckStatus = (typeof KNOWLEDGE_RECHECK_STATUSES)[number]

export type KnowledgeRecheckCompany = {
  id: string
  name: string
}

export type KnowledgeRecheckItem = {
  knowledgeId: string
  content: string
  type: KnowledgeRecheckType
  verificationStatus: KnowledgeRecheckStatus
  sourceLabel: string | null
  sourceUrl: string | null
  obtainedAt: string | null
  lastCheckedAt: string | null
  company: KnowledgeRecheckCompany | null
}

export type KnowledgeRecheck = {
  items: KnowledgeRecheckItem[]
}

export class InvalidKnowledgeRecheckResponseError extends Error {
  constructor(message = 'Knowledge recheck response is malformed.') {
    super(message)
    this.name = 'InvalidKnowledgeRecheckResponseError'
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

function readString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidKnowledgeRecheckResponseError()
  }

  return value
}

function readNonEmptyString(value: unknown): string {
  const text = readString(value)
  if (text.trim().length === 0) {
    throw new InvalidKnowledgeRecheckResponseError()
  }

  return text
}

function readNullableString(value: unknown): string | null {
  if (value === null) {
    return null
  }

  return readString(value)
}

function readDateTime(value: unknown): string {
  const dateTime = readNonEmptyString(value)
  const match = RFC3339_DATE_TIME.exec(dateTime)
  if (!match) {
    throw new InvalidKnowledgeRecheckResponseError()
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
    !Number.isFinite(Date.parse(dateTime))
  ) {
    throw new InvalidKnowledgeRecheckResponseError()
  }

  return dateTime
}

function readNullableDateTime(value: unknown): string | null {
  if (value === null) {
    return null
  }

  return readDateTime(value)
}

function readType(value: unknown): KnowledgeRecheckType {
  if (
    value !== 'FACT' &&
    value !== 'OBSERVATION' &&
    value !== 'AI_INFERENCE' &&
    value !== 'USER_INFO'
  ) {
    throw new InvalidKnowledgeRecheckResponseError()
  }

  return value
}

function readStatus(value: unknown): KnowledgeRecheckStatus {
  if (value !== 'OUTDATED' && value !== 'NEEDS_VERIFICATION') {
    throw new InvalidKnowledgeRecheckResponseError()
  }

  return value
}

function readCompany(value: unknown): KnowledgeRecheckCompany | null {
  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    throw new InvalidKnowledgeRecheckResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    name: readNonEmptyString(value.name),
  }
}

function readItem(value: unknown): KnowledgeRecheckItem {
  if (!isRecord(value)) {
    throw new InvalidKnowledgeRecheckResponseError()
  }

  return {
    knowledgeId: readNonEmptyString(value.knowledgeId),
    content: readString(value.content),
    type: readType(value.type),
    verificationStatus: readStatus(value.verificationStatus),
    sourceLabel: readNullableString(value.sourceLabel),
    sourceUrl: readNullableString(value.sourceUrl),
    obtainedAt: readNullableDateTime(value.obtainedAt),
    lastCheckedAt: readNullableDateTime(value.lastCheckedAt),
    company: readCompany(value.company),
  }
}

export function parseKnowledgeRecheck(value: unknown): KnowledgeRecheck {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new InvalidKnowledgeRecheckResponseError()
  }

  return {
    items: value.items.map(readItem),
  }
}
