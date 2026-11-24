import { KnowledgeType, KnowledgeVerificationStatus } from '@prisma/client'
import { prisma } from '../prisma.js'

export type KnowledgeRecheckRow = {
  knowledgeId: string
  content: string
  type: KnowledgeType
  verificationStatus: KnowledgeVerificationStatus
  sourceLabel: string | null
  sourceUrl: string | null
  obtainedAt: Date | null
  lastCheckedAt: Date | null
  companyId: string | null
  companyName: string | null
}

export async function findKnowledgeRequiringRecheck(
  businessId: string,
  limit: number,
): Promise<KnowledgeRecheckRow[]> {
  return prisma.$queryRaw<KnowledgeRecheckRow[]>`
    SELECT
      knowledge.id AS "knowledgeId",
      knowledge.content,
      knowledge.type,
      knowledge."verificationStatus",
      knowledge."sourceLabel",
      knowledge."sourceUrl",
      knowledge."obtainedAt",
      knowledge."lastCheckedAt",
      company.id AS "companyId",
      company.name AS "companyName"
    FROM "Knowledge" AS knowledge
    LEFT JOIN "Company" AS company
      ON company.id = knowledge."companyId"
      AND company."businessId" = knowledge."businessId"
    WHERE
      knowledge."businessId" = ${businessId}
      AND knowledge."verificationStatus" IN (
        CAST(${KnowledgeVerificationStatus.OUTDATED} AS "KnowledgeVerificationStatus"),
        CAST(${KnowledgeVerificationStatus.NEEDS_VERIFICATION} AS "KnowledgeVerificationStatus")
      )
    ORDER BY
      CASE
        WHEN knowledge."verificationStatus" = CAST(${KnowledgeVerificationStatus.OUTDATED} AS "KnowledgeVerificationStatus")
        THEN 0
        ELSE 1
      END ASC,
      COALESCE(
        knowledge."lastCheckedAt",
        knowledge."obtainedAt",
        knowledge."createdAt"
      ) ASC,
      knowledge.id ASC
    LIMIT ${limit}
  `
}

export type VerifiedKnowledgeRow = {
  id: string
  verificationStatus: KnowledgeVerificationStatus
  lastCheckedAt: Date | null
  updatedAt: Date
}

export async function tryVerifyKnowledgeAtomic(
  businessId: string,
  knowledgeId: string,
): Promise<VerifiedKnowledgeRow | null> {
  // Prisma updateMany cannot RETURNING; use parameterized UPDATE ... RETURNING.
  // updatedAt is set explicitly: raw SQL bypasses Prisma @updatedAt.
  const rows = await prisma.$queryRaw<VerifiedKnowledgeRow[]>`
    UPDATE "Knowledge"
    SET
      "verificationStatus" = CAST(${KnowledgeVerificationStatus.VERIFIED} AS "KnowledgeVerificationStatus"),
      "lastCheckedAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      id = ${knowledgeId}
      AND "businessId" = ${businessId}
      AND "verificationStatus" IN (
        CAST(${KnowledgeVerificationStatus.OUTDATED} AS "KnowledgeVerificationStatus"),
        CAST(${KnowledgeVerificationStatus.NEEDS_VERIFICATION} AS "KnowledgeVerificationStatus")
      )
    RETURNING id, "verificationStatus", "lastCheckedAt", "updatedAt"
  `

  return rows[0] ?? null
}

export async function findKnowledgeVerifyContextInBusiness(
  businessId: string,
  knowledgeId: string,
) {
  return prisma.knowledge.findFirst({
    where: {
      id: knowledgeId,
      businessId,
    },
    select: {
      id: true,
      verificationStatus: true,
      lastCheckedAt: true,
      updatedAt: true,
    },
  })
}
