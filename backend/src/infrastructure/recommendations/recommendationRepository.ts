import {
  DecisionStatus,
  RecommendationRejectionReason,
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
  rejectionReason: RecommendationRejectionReason | null
  rejectionComment: string | null
  updatedAt: Date
}

export type RejectedRecommendation = {
  id: string
  status: RecommendationStatus
  rejectionReason: RecommendationRejectionReason | null
  rejectionComment: string | null
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

export type RecommendationTransactionRepository = {
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
  findExistingDecisions(
    businessId: string,
    recommendationId: string,
  ): Promise<RecommendationDecision[]>
  markRecommendationAccepted(
    recommendationId: string,
  ): Promise<{ id: string; status: RecommendationStatus; updatedAt: Date }>
  markRecommendationModified(
    recommendationId: string,
  ): Promise<{ id: string; status: RecommendationStatus; updatedAt: Date }>
  markRecommendationRejected(input: {
    recommendationId: string
    rejectionReason: RecommendationRejectionReason
    rejectionComment: string | null
  }): Promise<RejectedRecommendation>
  createDecision(input: {
    businessId: string
    companyId: string | null
    recommendationId: string
    title: string
    description: string | null
    decidedById: string
  }): Promise<RecommendationDecision>
}

function createTransactionRepository(
  tx: Prisma.TransactionClient,
): RecommendationTransactionRepository {
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
          "rejectionReason",
          "rejectionComment",
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

    findExistingDecisions(businessId, recommendationId) {
      return tx.decision.findMany({
        where: {
          businessId,
          recommendationId,
        },
        orderBy: [
          {
            createdAt: 'asc',
          },
          {
            id: 'asc',
          },
        ],
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

    markRecommendationModified(recommendationId) {
      return tx.recommendation.update({
        where: { id: recommendationId },
        data: {
          status: RecommendationStatus.MODIFIED,
          snoozedUntil: null,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      })
    },

    markRecommendationRejected(input) {
      return tx.recommendation.update({
        where: { id: input.recommendationId },
        data: {
          status: RecommendationStatus.REJECTED,
          rejectionReason: input.rejectionReason,
          rejectionComment: input.rejectionComment,
          snoozedUntil: null,
        },
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          rejectionComment: true,
          snoozedUntil: true,
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
    repository: RecommendationTransactionRepository,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return operation(createTransactionRepository(tx))
  })
}

export async function runModifyRecommendationTransaction<T>(
  operation: (
    repository: RecommendationTransactionRepository,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return operation(createTransactionRepository(tx))
  })
}

export async function runRejectRecommendationTransaction<T>(
  operation: (
    repository: RecommendationTransactionRepository,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return operation(createTransactionRepository(tx))
  })
}

export type SnoozedRecommendationRow = {
  id: string
  status: RecommendationStatus
  snoozedUntil: Date
  updatedAt: Date
}

export async function findRecommendationActionBusinessById(
  businessId: string,
) {
  return prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true },
  })
}

export async function findRecommendationsNeedingDecision(
  businessId: string,
  now: Date,
) {
  return prisma.recommendation.findMany({
    where: {
      businessId,
      status: {
        in: [RecommendationStatus.NEW, RecommendationStatus.VIEWED],
      },
      AND: [
        {
          OR: [
            { snoozedUntil: null },
            {
              snoozedUntil: {
                lte: now,
              },
            },
          ],
        },
        {
          OR: [
            { companyId: null },
            {
              company: {
                businessId,
              },
            },
          ],
        },
      ],
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      reason: true,
      priority: true,
      status: true,
      snoozedUntil: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      knowledgeLinks: {
        where: {
          knowledge: {
            businessId,
          },
        },
        orderBy: {
          knowledgeId: 'asc',
        },
        select: {
          knowledge: {
            select: {
              id: true,
              content: true,
              type: true,
              verificationStatus: true,
              sourceType: true,
              sourceLabel: true,
              sourceUrl: true,
              obtainedAt: true,
              lastCheckedAt: true,
            },
          },
        },
      },
    },
  })
}

export async function trySnoozeRecommendationAtomic(
  businessId: string,
  recommendationId: string,
  snoozedUntil: Date,
): Promise<SnoozedRecommendationRow | null> {
  const rows = await prisma.$queryRaw<SnoozedRecommendationRow[]>`
    UPDATE "Recommendation" AS recommendation
    SET
      status = CAST(${RecommendationStatus.VIEWED} AS "RecommendationStatus"),
      "snoozedUntil" = ${snoozedUntil},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      recommendation.id = ${recommendationId}
      AND recommendation."businessId" = ${businessId}
      AND recommendation.status IN (
        CAST(${RecommendationStatus.NEW} AS "RecommendationStatus"),
        CAST(${RecommendationStatus.VIEWED} AS "RecommendationStatus")
      )
      AND ${snoozedUntil} > CURRENT_TIMESTAMP
      AND (
        recommendation."companyId" IS NULL
        OR EXISTS (
          SELECT 1
          FROM "Company" AS company
          WHERE company.id = recommendation."companyId"
            AND company."businessId" = ${businessId}
        )
      )
    RETURNING id, status, "snoozedUntil", "updatedAt"
  `

  return rows[0] ?? null
}

export async function findRecommendationSnoozeContextInBusiness(
  businessId: string,
  recommendationId: string,
) {
  return prisma.recommendation.findFirst({
    where: {
      id: recommendationId,
      businessId,
    },
    select: {
      id: true,
      companyId: true,
      status: true,
    },
  })
}

export async function recommendationCompanyBelongsToBusiness(
  businessId: string,
  companyId: string,
): Promise<boolean> {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      businessId,
    },
    select: { id: true },
  })

  return company !== null
}
