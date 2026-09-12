import { RecommendationStatus } from '@prisma/client'
import type { SnoozeRecommendationResult } from '../../domain/recommendations/snoozeRecommendationResult.js'
import {
  findRecommendationActionBusinessById,
  findRecommendationSnoozeContextInBusiness,
  recommendationCompanyBelongsToBusiness,
  trySnoozeRecommendationAtomic,
  type SnoozedRecommendationRow,
} from '../../infrastructure/recommendations/recommendationRepository.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/i

export class InvalidSnoozedUntilError extends Error {
  constructor() {
    super('Invalid snoozedUntil.')
    this.name = 'InvalidSnoozedUntilError'
  }
}

export class SnoozedUntilNotInFutureError extends Error {
  constructor() {
    super('snoozedUntil must be in the future.')
    this.name = 'SnoozedUntilNotInFutureError'
  }
}

export class SnoozeRecommendationNotFoundError extends Error {
  constructor() {
    super('Recommendation not found.')
    this.name = 'SnoozeRecommendationNotFoundError'
  }
}

export class SnoozeRecommendationStatusConflictError extends Error {
  constructor() {
    super('Recommendation cannot be snoozed from its current status.')
    this.name = 'SnoozeRecommendationStatusConflictError'
  }
}

export class SnoozeRecommendationCompanyConflictError extends Error {
  constructor() {
    super('Recommendation company does not belong to this business.')
    this.name = 'SnoozeRecommendationCompanyConflictError'
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] ?? 0
}

function parseSnoozedUntil(value: unknown): Date {
  if (typeof value !== 'string') {
    throw new InvalidSnoozedUntilError()
  }

  const match = RFC3339_DATE_TIME.exec(value)
  if (!match) {
    throw new InvalidSnoozedUntilError()
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = match[10] === undefined ? 0 : Number(match[10])
  const offsetMinute = match[11] === undefined ? 0 : Number(match[11])

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    throw new InvalidSnoozedUntilError()
  }

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    throw new InvalidSnoozedUntilError()
  }

  const snoozedUntil = new Date(timestamp)
  if (snoozedUntil.getTime() <= Date.now()) {
    throw new SnoozedUntilNotInFutureError()
  }

  return snoozedUntil
}

function isSnoozeableStatus(status: RecommendationStatus): boolean {
  return (
    status === RecommendationStatus.NEW ||
    status === RecommendationStatus.VIEWED
  )
}

function toResult(
  recommendation: SnoozedRecommendationRow,
): SnoozeRecommendationResult {
  return {
    recommendation: {
      id: recommendation.id,
      status: recommendation.status,
      snoozedUntil: recommendation.snoozedUntil.toISOString(),
      updatedAt: recommendation.updatedAt.toISOString(),
    },
  }
}

async function validateFailedMutation(
  businessId: string,
  recommendationId: string,
  snoozedUntil: Date,
): Promise<void> {
  const recommendation = await findRecommendationSnoozeContextInBusiness(
    businessId,
    recommendationId,
  )

  if (!recommendation) {
    throw new SnoozeRecommendationNotFoundError()
  }

  if (
    recommendation.companyId &&
    !(await recommendationCompanyBelongsToBusiness(
      businessId,
      recommendation.companyId,
    ))
  ) {
    throw new SnoozeRecommendationCompanyConflictError()
  }

  if (!isSnoozeableStatus(recommendation.status)) {
    throw new SnoozeRecommendationStatusConflictError()
  }

  if (snoozedUntil.getTime() <= Date.now()) {
    throw new SnoozedUntilNotInFutureError()
  }
}

export async function snoozeRecommendation(input: {
  businessId: string
  recommendationId: string
  snoozedUntil: unknown
}): Promise<SnoozeRecommendationResult> {
  const snoozedUntil = parseSnoozedUntil(input.snoozedUntil)
  const business = await findRecommendationActionBusinessById(input.businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const updated = await trySnoozeRecommendationAtomic(
      input.businessId,
      input.recommendationId,
      snoozedUntil,
    )

    if (updated) {
      return toResult(updated)
    }

    await validateFailedMutation(
      input.businessId,
      input.recommendationId,
      snoozedUntil,
    )
  }

  throw new Error('Recommendation snooze failed due to a concurrent change.')
}
