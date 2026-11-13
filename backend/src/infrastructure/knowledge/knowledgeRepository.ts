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
