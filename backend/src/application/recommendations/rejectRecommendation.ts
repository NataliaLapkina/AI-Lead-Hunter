import {
  RecommendationRejectionReason,
  RecommendationStatus,
} from '@prisma/client'
import type { RejectRecommendationResult } from '../../domain/recommendations/rejectRecommendationResult.js'
import {
  runRejectRecommendationTransaction,
  type LockedRecommendation,
  type RejectedRecommendation,
} from '../../infrastructure/recommendations/recommendationRepository.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import {
  RecommendationCompanyConflictError,
  RecommendationNotFoundError,
  RecommendationStatusConflictError,
} from './acceptRecommendation.js'

export class InvalidRejectionReasonError extends Error {
  constructor() {
    super('Invalid rejectionReason.')
    this.name = 'InvalidRejectionReasonError'
  }
}

export class InvalidRejectionCommentError extends Error {
  constructor() {
    super('Invalid rejectionComment.')
    this.name = 'InvalidRejectionCommentError'
  }
}

export class RecommendationRejectionConflictError extends Error {
  constructor() {
    super('Recommendation rejection feedback conflicts with this request.')
    this.name = 'RecommendationRejectionConflictError'
  }
}

function parseRejectionReason(value: unknown): RecommendationRejectionReason {
  if (
    typeof value !== 'string' ||
    !Object.values(RecommendationRejectionReason).includes(
      value as RecommendationRejectionReason,
    )
  ) {
    throw new InvalidRejectionReasonError()
  }

  return value as RecommendationRejectionReason
}

function parseRejectionComment(
  reason: RecommendationRejectionReason,
  value: unknown,
): string | null {
  if (reason !== RecommendationRejectionReason.OTHER) {
    if (value !== undefined && value !== null) {
      throw new InvalidRejectionCommentError()
    }

    return null
  }

  if (typeof value !== 'string') {
    throw new InvalidRejectionCommentError()
  }

  const comment = value.trim()
  const characterCount = Array.from(comment).length

  if (characterCount < 1 || characterCount > 500) {
    throw new InvalidRejectionCommentError()
  }

  return comment
}

function isRejectableStatus(status: RecommendationStatus): boolean {
  return (
    status === RecommendationStatus.NEW ||
    status === RecommendationStatus.VIEWED ||
    status === RecommendationStatus.REJECTED
  )
}

function currentRejectedRecommendation(
  recommendation: LockedRecommendation,
): RejectedRecommendation {
  return {
    id: recommendation.id,
    status: recommendation.status,
    rejectionReason: recommendation.rejectionReason,
    rejectionComment: recommendation.rejectionComment,
    snoozedUntil: recommendation.snoozedUntil,
    updatedAt: recommendation.updatedAt,
  }
}

function toResult(
  recommendation: RejectedRecommendation,
): RejectRecommendationResult {
  if (recommendation.rejectionReason === null) {
    throw new Error('Rejected Recommendation is missing rejectionReason.')
  }

  return {
    recommendation: {
      id: recommendation.id,
      status: recommendation.status,
      rejectionReason: recommendation.rejectionReason,
      rejectionComment: recommendation.rejectionComment,
      snoozedUntil: recommendation.snoozedUntil?.toISOString() ?? null,
      updatedAt: recommendation.updatedAt.toISOString(),
    },
  }
}

export async function rejectRecommendation(input: {
  businessId: string
  recommendationId: string
  rejectionReason: unknown
  rejectionComment: unknown
}): Promise<RejectRecommendationResult> {
  const rejectionReason = parseRejectionReason(input.rejectionReason)
  const rejectionComment = parseRejectionComment(
    rejectionReason,
    input.rejectionComment,
  )

  return runRejectRecommendationTransaction(async (repository) => {
    if (!(await repository.businessExists(input.businessId))) {
      throw new BusinessNotFoundError()
    }

    const recommendation = await repository.lockRecommendation(
      input.businessId,
      input.recommendationId,
    )

    if (!recommendation) {
      throw new RecommendationNotFoundError()
    }

    if (
      recommendation.companyId &&
      !(await repository.lockCompanyInBusiness(
        input.businessId,
        recommendation.companyId,
      ))
    ) {
      throw new RecommendationCompanyConflictError()
    }

    if (!isRejectableStatus(recommendation.status)) {
      throw new RecommendationStatusConflictError()
    }

    if (recommendation.status === RecommendationStatus.REJECTED) {
      if (
        recommendation.rejectionReason !== rejectionReason ||
        recommendation.rejectionComment !== rejectionComment
      ) {
        throw new RecommendationRejectionConflictError()
      }

      return toResult(currentRejectedRecommendation(recommendation))
    }

    const rejectedRecommendation =
      await repository.markRecommendationRejected({
        recommendationId: recommendation.id,
        rejectionReason,
        rejectionComment,
      })

    return toResult(rejectedRecommendation)
  })
}
