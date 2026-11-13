import { KnowledgeType, KnowledgeVerificationStatus } from '@prisma/client'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import {
  KNOWLEDGE_RECHECK_ITEM_LIMIT,
  type KnowledgeRecheckCompanyDto,
  type KnowledgeRecheckResponse,
  type KnowledgeRecheckType,
  type KnowledgeRecheckVerificationStatus,
} from '../../domain/knowledge/knowledgeRecheckResponse.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findKnowledgeRequiringRecheck,
  type KnowledgeRecheckRow,
} from '../../infrastructure/knowledge/knowledgeRepository.js'

function readVerificationStatus(
  status: KnowledgeVerificationStatus,
): KnowledgeRecheckVerificationStatus {
  if (
    status !== KnowledgeVerificationStatus.OUTDATED &&
    status !== KnowledgeVerificationStatus.NEEDS_VERIFICATION
  ) {
    throw new Error('Knowledge recheck verification status is invalid.')
  }

  return status
}

function readType(type: KnowledgeType): KnowledgeRecheckType {
  if (
    type !== KnowledgeType.FACT &&
    type !== KnowledgeType.OBSERVATION &&
    type !== KnowledgeType.AI_INFERENCE &&
    type !== KnowledgeType.USER_INFO
  ) {
    throw new Error('Knowledge recheck type is invalid.')
  }

  return type
}

function toIsoOrNull(value: Date | null): string | null {
  if (value === null) {
    return null
  }

  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Knowledge recheck date is invalid.')
  }

  return value.toISOString()
}

function toCompany(row: KnowledgeRecheckRow): KnowledgeRecheckCompanyDto | null {
  if (!row.companyId || !row.companyName) {
    return null
  }

  return {
    id: row.companyId,
    name: row.companyName,
  }
}

export async function listKnowledgeRecheck(
  businessId: string,
): Promise<KnowledgeRecheckResponse> {
  const business = await findBusinessById(businessId)
  if (!business) {
    throw new BusinessNotFoundError()
  }

  const rows = await findKnowledgeRequiringRecheck(
    businessId,
    KNOWLEDGE_RECHECK_ITEM_LIMIT,
  )

  return {
    items: rows.map((row) => ({
      knowledgeId: row.knowledgeId,
      content: row.content,
      type: readType(row.type),
      verificationStatus: readVerificationStatus(row.verificationStatus),
      sourceLabel: row.sourceLabel,
      sourceUrl: row.sourceUrl,
      obtainedAt: toIsoOrNull(row.obtainedAt),
      lastCheckedAt: toIsoOrNull(row.lastCheckedAt),
      company: toCompany(row),
    })),
  }
}
