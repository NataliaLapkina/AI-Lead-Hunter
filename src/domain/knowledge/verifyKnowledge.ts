import { ru } from '@/i18n/ru'

export type VerifiedKnowledge = {
  id: string
  verificationStatus: 'VERIFIED'
  lastCheckedAt: string | null
  updatedAt: string
}

export type VerifyKnowledgeResult = {
  knowledge: VerifiedKnowledge
}

export class InvalidVerifyKnowledgeResponseError extends Error {
  constructor(message = 'Verify knowledge response is malformed.') {
    super(message)
    this.name = 'InvalidVerifyKnowledgeResponseError'
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
    throw new InvalidVerifyKnowledgeResponseError()
  }

  return value
}

function readVerifiedStatus(value: unknown): 'VERIFIED' {
  if (value !== 'VERIFIED') {
    throw new InvalidVerifyKnowledgeResponseError()
  }

  return 'VERIFIED'
}

function readDateTime(value: unknown): string {
  const dateTime = readNonEmptyString(value)
  const match = RFC3339_DATE_TIME.exec(dateTime)
  if (!match) {
    throw new InvalidVerifyKnowledgeResponseError()
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
    throw new InvalidVerifyKnowledgeResponseError()
  }

  return dateTime
}

function readNullableDateTime(value: unknown): string | null {
  if (value === null) {
    return null
  }

  return readDateTime(value)
}

export function parseVerifyKnowledgeResult(value: unknown): VerifyKnowledgeResult {
  if (!isRecord(value) || !isRecord(value.knowledge)) {
    throw new InvalidVerifyKnowledgeResponseError()
  }

  return {
    knowledge: {
      id: readNonEmptyString(value.knowledge.id),
      verificationStatus: readVerifiedStatus(value.knowledge.verificationStatus),
      lastCheckedAt: readNullableDateTime(value.knowledge.lastCheckedAt),
      updatedAt: readDateTime(value.knowledge.updatedAt),
    },
  }
}

function readBackendError(error: unknown): { status: number; code: string } | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  if (typeof error.code !== 'string') {
    return null
  }

  const status = 'status' in error && typeof error.status === 'number' ? error.status : 0
  return { status, code: error.code }
}

export function getVerifyKnowledgeErrorMessage(error: unknown): string {
  const backendError = readBackendError(error)
  if (backendError?.code === 'KNOWLEDGE_VERIFICATION_CONFLICT') {
    return ru.recheck.confirmError.conflict
  }

  if (
    backendError &&
    (backendError.status === 404 ||
      backendError.code === 'KNOWLEDGE_NOT_FOUND' ||
      backendError.code === 'BUSINESS_NOT_FOUND')
  ) {
    return ru.recheck.confirmError.notFound
  }

  return ru.recheck.confirmError.failed
}
