export type AcceptedDecision = {
  id: string
  recommendationId: string
  companyId: string | null
  title: string
  description: string | null
  status: DecisionStatus
  decidedById: string
  createdAt: string
  updatedAt: string
}

export type AcceptedRecommendation = {
  id: string
  status: 'ACCEPTED'
  snoozedUntil: null
  updatedAt: string
}

const DECISION_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'SUPERSEDED'] as const
type DecisionStatus = (typeof DECISION_STATUSES)[number]

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i

export type AcceptRecommendationResult = {
  recommendation: AcceptedRecommendation
  decision: AcceptedDecision
}

export class InvalidAcceptResponseError extends Error {
  constructor(message = 'Accept response is malformed.') {
    super(message)
    this.name = 'InvalidAcceptResponseError'
  }
}

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

function isValidRfc3339DateTime(value: string): boolean {
  const match = RFC3339_DATE_TIME.exec(value)
  if (!match) {
    return false
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
    second > 59
  ) {
    return false
  }

  return Number.isFinite(Date.parse(value))
}

function readNonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidAcceptResponseError()
  }

  return value
}

function readNullableString(value: unknown): string | null {
  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new InvalidAcceptResponseError()
  }
  return value
}

function readNullableId(value: unknown): string | null {
  if (value === null) {
    return null
  }

  return readNonEmptyString(value)
}

function readDateTime(value: unknown): string {
  const dateTime = readNonEmptyString(value)
  if (!isValidRfc3339DateTime(dateTime)) {
    throw new InvalidAcceptResponseError()
  }
  return dateTime
}

function readDecisionStatus(value: unknown): DecisionStatus {
  if (!DECISION_STATUSES.includes(value as DecisionStatus)) {
    throw new InvalidAcceptResponseError()
  }
  return value as DecisionStatus
}

export function parseAcceptedDecision(value: unknown): AcceptedDecision {
  if (!isRecord(value)) {
    throw new InvalidAcceptResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    recommendationId: readNonEmptyString(value.recommendationId),
    companyId: readNullableId(value.companyId),
    title: readNonEmptyString(value.title),
    description: readNullableString(value.description),
    status: readDecisionStatus(value.status),
    decidedById: readNonEmptyString(value.decidedById),
    createdAt: readDateTime(value.createdAt),
    updatedAt: readDateTime(value.updatedAt),
  }
}

export function parseAcceptRecommendationResult(
  value: unknown,
): AcceptRecommendationResult {
  if (!isRecord(value) || !isRecord(value.recommendation)) {
    throw new InvalidAcceptResponseError()
  }

  if (value.recommendation.snoozedUntil !== null) {
    throw new InvalidAcceptResponseError()
  }

  return {
    recommendation: {
      id: readNonEmptyString(value.recommendation.id),
      status: value.recommendation.status === 'ACCEPTED'
        ? 'ACCEPTED'
        : (() => { throw new InvalidAcceptResponseError() })(),
      snoozedUntil: null,
      updatedAt: readDateTime(value.recommendation.updatedAt),
    },
    decision: parseAcceptedDecision(value.decision),
  }
}
