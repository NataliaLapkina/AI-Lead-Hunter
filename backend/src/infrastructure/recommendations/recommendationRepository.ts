import {
  DecisionStatus,
  RecommendationStatus,
  type Prisma,
} from '@prisma/client'
import { prisma } from '../prisma.js'

export type LockedRecommendation = {
  id: string
  businessId: string
  companyId: string | null
  title: string
  description: string
  status: RecommendationStatus
  snoozedUntil: Date | null
  updatedAt: Date
}

export type RecommendationDecision = {
  id: string
  recommendationId: string | null
  companyId: string | null
  title: string
  description: string | null
  status: DecisionStatus
  decidedById: string
  createdAt: Date
  updatedAt: Date
}

export type AcceptRecommendationTransactionRepository = {
  businessExists(businessId: string): Promise<boolean>
  lockRecommendation(
    businessId: string,
    recommendationId: string,
  ): Promise<LockedRecommendation | null>
  lockCompanyInBusiness(
    businessId: string,
    companyId: string,
  ): Promise<boolean>
  lockUser(userId: string): Promise<boolean>
  lockMembership(businessId: string, userId: string): Promise<boolean>
  findExistingDecision(
    businessId: string,
    recommendationId: string,
    companyId: string | null,
  ): Promise<RecommendationDecision | null>
  markRecommendationAccepted(
    recommendationId: string,
  ): Promise<{ id: string; status: RecommendationStatus; updatedAt: Date }>
  createDecision(input: {
    businessId: string
    companyId: string | null
    recommendationId: string
    title: string
    description: string
    decidedById: string
  }): Promise<RecommendationDecision>
}

function createTransactionRepository(
  tx: Prisma.TransactionClient,
): AcceptRecommendationTransactionRepository {
  return {
    async businessExists(businessId) {
      const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { id: true },
      })

      return business !== null
    },

    async lockRecommendation(businessId, recommendationId) {
      const rows = await tx.$queryRaw<LockedRecommendation[]>`
        SELECT
          id,
          "businessId",
          "companyId",
          title,
          description,
          status,
          "snoozedUntil",
          "updatedAt"
        FROM "Recommendation"
        WHERE id = ${recommendationId}
          AND "businessId" = ${businessId}
        FOR UPDATE
      `

      return rows[0] ?? null
    },

    async lockCompanyInBusiness(businessId, companyId) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "Company"
        WHERE id = ${companyId}
          AND "businessId" = ${businessId}
        FOR SHARE
      `

      return rows.length === 1
    },

    async lockUser(userId) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "User"
        WHERE id = ${userId}
        FOR SHARE
      `

      return rows.length === 1
    },

    async lockMembership(businessId, userId) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "Membership"
        WHERE "businessId" = ${businessId}
          AND "userId" = ${userId}
        FOR SHARE
      `

      return rows.length === 1
    },

    findExistingDecision(businessId, recommendationId, companyId) {
      return tx.decision.findFirst({
        where: {
          businessId,
          recommendationId,
          companyId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          recommendationId: true,
          companyId: true,
          title: true,
          description: true,
          status: true,
          decidedById: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    },

    markRecommendationAccepted(recommendationId) {
      return tx.recommendation.update({
        where: { id: recommendationId },
        data: {
          status: RecommendationStatus.ACCEPTED,
          snoozedUntil: null,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      })
    },

    createDecision(input) {
      return tx.decision.create({
        data: {
          businessId: input.businessId,
          companyId: input.companyId,
          recommendationId: input.recommendationId,
          title: input.title,
          description: input.description,
          decidedById: input.decidedById,
          status: DecisionStatus.ACTIVE,
        },
        select: {
          id: true,
          recommendationId: true,
          companyId: true,
          title: true,
          description: true,
          status: true,
          decidedById: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    },
  }
}

export async function runAcceptRecommendationTransaction<T>(
  operation: (
    repository: AcceptRecommendationTransactionRepository,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return operation(createTransactionRepository(tx))
  })
}
