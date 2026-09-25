import { ru } from '@/i18n/ru'

export const RECOMMENDATION_REJECTION_REASONS = [
  'NOT_RELEVANT',
  'ALREADY_DONE',
  'NOT_SUITABLE_FOR_COMPANY',
  'NOT_PRIORITY',
  'OTHER',
] as const

export type RecommendationRejectionReason =
  (typeof RECOMMENDATION_REJECTION_REASONS)[number]

const MAX_ACTION_TEXT_LENGTH = 500

const ACTION_ERROR_CODES = {
  INVALID_DECIDED_BY_ID: ru.today.actionErrors.invalidDecidedById,
  USER_NOT_FOUND: ru.today.actionErrors.userNotFound,
  USER_NOT_BUSINESS_MEMBER: ru.today.actionErrors.userNotMember,
  INVALID_SNOOZED_UNTIL: ru.today.actionErrors.invalidSnoozedUntil,
  SNOOZED_UNTIL_NOT_IN_FUTURE: ru.today.actionErrors.snoozedUntilNotInFuture,
  INVALID_DECISION_TITLE: ru.today.actionErrors.invalidDecisionTitle,
  INVALID_REJECTION_REASON: ru.today.actionErrors.invalidRejectionReason,
  INVALID_REJECTION_COMMENT: ru.today.actionErrors.invalidRejectionComment,
  BUSINESS_NOT_FOUND: ru.today.actionErrors.businessNotFound,
  RECOMMENDATION_NOT_FOUND: ru.today.actionErrors.recommendationNotFound,
  RECOMMENDATION_STATUS_CONFLICT: ru.today.actionErrors.statusConflict,
  RECOMMENDATION_COMPANY_CONFLICT: ru.today.actionErrors.companyConflict,
  RECOMMENDATION_DECISION_CONFLICT: ru.today.actionErrors.decisionConflict,
  RECOMMENDATION_REJECTION_CONFLICT: ru.today.actionErrors.rejectionConflict,
} as const

export function countCodePoints(value: string): number {
  return Array.from(value).length
}

export function parseActorUserId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseDecisionTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const title = value.trim()
  const characterCount = countCodePoints(title)

  if (characterCount < 1 || characterCount > MAX_ACTION_TEXT_LENGTH) {
    return null
  }

  return title
}

export function parseRejectionReason(
  value: unknown,
): RecommendationRejectionReason | null {
  if (
    typeof value !== 'string' ||
    !RECOMMENDATION_REJECTION_REASONS.includes(
      value as RecommendationRejectionReason,
    )
  ) {
    return null
  }

  return value as RecommendationRejectionReason
}

export function parseRejectionComment(
  reason: RecommendationRejectionReason,
  value: unknown,
): { ok: true; comment: string | undefined } | { ok: false } {
  if (reason !== 'OTHER') {
    return { ok: true, comment: undefined }
  }

  if (typeof value !== 'string') {
    return { ok: false }
  }

  const comment = value.trim()
  const characterCount = countCodePoints(comment)

  if (characterCount < 1 || characterCount > MAX_ACTION_TEXT_LENGTH) {
    return { ok: false }
  }

  return { ok: true, comment }
}

export function recommendationActionPath(
  businessId: string,
  recommendationId: string,
  action: 'accept' | 'snooze' | 'modify' | 'reject',
): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/recommendations/${encodeURIComponent(recommendationId)}/${action}`
}

function readErrorCode(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code
  }

  return null
}

export function getRecommendationActionErrorMessage(error: unknown): string {
  const code = readErrorCode(error)
  if (code && code in ACTION_ERROR_CODES) {
    return ACTION_ERROR_CODES[code as keyof typeof ACTION_ERROR_CODES]
  }

  return ru.today.actionFailed
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
