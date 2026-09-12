import { RecommendationStatus } from '@prisma/client'
import type { AcceptRecommendationResult } from '../../domain/recommendations/acceptRecommendationResult.js'
import {
  runAcceptRecommendationTransaction,
  type LockedRecommendation,
  type RecommendationDecision,
} from '../../infrastructure/recommendations/recommendationRepository.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'

export class InvalidDecidedByIdError extends Error {
  constructor() {
    super('Invalid decidedById.')
    this.name = 'InvalidDecidedByIdError'
  }
}

export class RecommendationNotFoundError extends Error {
  constructor() {
    super('Recommendation not found.')
    this.name = 'RecommendationNotFoundError'
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('User not found.')
    this.name = 'UserNotFoundError'
  }
}

export class UserNotBusinessMemberError extends Error {
  constructor() {
    super('User is not a member of this business.')
    this.name = 'UserNotBusinessMemberError'
  }
}

export class RecommendationStatusConflictError extends Error {
  constructor() {
    super('Recommendation cannot be accepted from its current status.')
    this.name = 'RecommendationStatusConflictError'
  }
}

export class RecommendationCompanyConflictError extends Error {
  constructor() {
    super('Recommendation company does not belong to this business.')
    this.name = 'RecommendationCompanyConflictError'
  }
}

function parseDecidedById(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidDecidedByIdError()
  }

  return value
}

function isAcceptableStatus(status: RecommendationStatus): boolean {
  return (
    status === RecommendationStatus.NEW ||
    status === RecommendationStatus.VIEWED ||
    status === RecommendationStatus.ACCEPTED
  )
}

function toResult(
  recommendation: {
    id: string
    status: RecommendationStatus
    updatedAt: Date
  },
  decision: RecommendationDecision,
): AcceptRecommendationResult {
  return {
    recommendation: {
      id: recommendation.id,
      status: recommendation.status,
      snoozedUntil: null,
      updatedAt: recommendation.updatedAt.toISOString(),
    },
    decision: {
      id: decision.id,
      recommendationId: decision.recommendationId as string,
      companyId: decision.companyId,
      title: decision.title,
      description: decision.description,
      status: decision.status,
      decidedById: decision.decidedById,
      createdAt: decision.createdAt.toISOString(),
      updatedAt: decision.updatedAt.toISOString(),
    },
  }
}

function currentAcceptedRecommendation(recommendation: LockedRecommendation) {
  return {
    id: recommendation.id,
    status: recommendation.status,
    updatedAt: recommendation.updatedAt,
  }
}

export async function acceptRecommendation(input: {
  businessId: string
  recommendationId: string
  decidedById: unknown
}): Promise<AcceptRecommendationResult> {
  const decidedById = parseDecidedById(input.decidedById)

  return runAcceptRecommendationTransaction(async (repository) => {
    if (!(await repository.businessExists(input.businessId))) {
      throw new BusinessNotFoundError()
    }

    if (!(await repository.lockUser(decidedById))) {
      throw new UserNotFoundError()
    }

    if (!(await repository.lockMembership(input.businessId, decidedById))) {
      throw new UserNotBusinessMemberError()
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

    if (!isAcceptableStatus(recommendation.status)) {
      throw new RecommendationStatusConflictError()
    }

    const existingDecision = await repository.findExistingDecision(
      input.businessId,
      recommendation.id,
      recommendation.companyId,
    )

    const mustUpdateRecommendation =
      recommendation.status !== RecommendationStatus.ACCEPTED ||
      recommendation.snoozedUntil !== null

    const acceptedRecommendation = mustUpdateRecommendation
      ? await repository.markRecommendationAccepted(recommendation.id)
      : currentAcceptedRecommendation(recommendation)

    const decision =
      existingDecision ??
      (await repository.createDecision({
        businessId: recommendation.businessId,
        companyId: recommendation.companyId,
        recommendationId: recommendation.id,
        title: recommendation.title,
        description: recommendation.description,
        decidedById,
      }))

    return toResult(acceptedRecommendation, decision)
  })
}
