import { RecommendationStatus } from '@prisma/client'
import type { ModifyRecommendationResult } from '../../domain/recommendations/modifyRecommendationResult.js'
import {
  runModifyRecommendationTransaction,
  type LockedRecommendation,
  type RecommendationDecision,
} from '../../infrastructure/recommendations/recommendationRepository.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import {
  InvalidDecidedByIdError,
  RecommendationCompanyConflictError,
  RecommendationNotFoundError,
  RecommendationStatusConflictError,
  UserNotBusinessMemberError,
  UserNotFoundError,
} from './acceptRecommendation.js'

export class InvalidDecisionTitleError extends Error {
  constructor() {
    super('Invalid decisionTitle.')
    this.name = 'InvalidDecisionTitleError'
  }
}

export class RecommendationDecisionConflictError extends Error {
  constructor() {
    super('Recommendation decision conflicts with this request.')
    this.name = 'RecommendationDecisionConflictError'
  }
}

function parseDecidedById(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidDecidedByIdError()
  }

  return value
}

function parseDecisionTitle(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidDecisionTitleError()
  }

  const title = value.trim()
  const characterCount = Array.from(title).length

  if (characterCount < 1 || characterCount > 500) {
    throw new InvalidDecisionTitleError()
  }

  return title
}

function isModifiableStatus(status: RecommendationStatus): boolean {
  return (
    status === RecommendationStatus.NEW ||
    status === RecommendationStatus.VIEWED ||
    status === RecommendationStatus.MODIFIED
  )
}

function currentModifiedRecommendation(recommendation: LockedRecommendation) {
  return {
    id: recommendation.id,
    status: recommendation.status,
    updatedAt: recommendation.updatedAt,
  }
}

function toResult(
  recommendation: {
    id: string
    status: RecommendationStatus
    updatedAt: Date
  },
  decision: RecommendationDecision,
): ModifyRecommendationResult {
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

export async function modifyRecommendation(input: {
  businessId: string
  recommendationId: string
  decidedById: unknown
  decisionTitle: unknown
}): Promise<ModifyRecommendationResult> {
  const decidedById = parseDecidedById(input.decidedById)
  const decisionTitle = parseDecisionTitle(input.decisionTitle)

  return runModifyRecommendationTransaction(async (repository) => {
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

    if (!isModifiableStatus(recommendation.status)) {
      throw new RecommendationStatusConflictError()
    }

    const existingDecisions = await repository.findExistingDecisions(
      input.businessId,
      recommendation.id,
    )

    if (existingDecisions.length > 1) {
      throw new RecommendationDecisionConflictError()
    }

    const existingDecision = existingDecisions[0]

    if (recommendation.status === RecommendationStatus.MODIFIED) {
      if (existingDecision) {
        if (
          existingDecision.companyId !== recommendation.companyId ||
          existingDecision.decidedById !== decidedById ||
          existingDecision.title !== decisionTitle
        ) {
          throw new RecommendationDecisionConflictError()
        }

        const modifiedRecommendation =
          recommendation.snoozedUntil === null
            ? currentModifiedRecommendation(recommendation)
            : await repository.markRecommendationModified(recommendation.id)

        return toResult(modifiedRecommendation, existingDecision)
      }

      const modifiedRecommendation =
        recommendation.snoozedUntil === null
          ? currentModifiedRecommendation(recommendation)
          : await repository.markRecommendationModified(recommendation.id)

      const decision = await repository.createDecision({
        businessId: recommendation.businessId,
        companyId: recommendation.companyId,
        recommendationId: recommendation.id,
        title: decisionTitle,
        description: null,
        decidedById,
      })

      return toResult(modifiedRecommendation, decision)
    }

    if (existingDecision) {
      throw new RecommendationDecisionConflictError()
    }

    const modifiedRecommendation =
      await repository.markRecommendationModified(recommendation.id)
    const decision = await repository.createDecision({
      businessId: recommendation.businessId,
      companyId: recommendation.companyId,
      recommendationId: recommendation.id,
      title: decisionTitle,
      description: null,
      decidedById,
    })

    return toResult(modifiedRecommendation, decision)
  })
}
