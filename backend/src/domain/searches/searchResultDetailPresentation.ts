import {
  KnowledgeType,
  KnowledgeVerificationStatus,
} from '@prisma/client'
import type {
  SearchDetailKnowledgeGroupsDto,
  SearchDetailKnowledgeItemDto,
} from './searchResultDetailResponse.js'

type KnowledgeRow = {
  id: string
  content: string
  type: KnowledgeType
  verificationStatus: KnowledgeVerificationStatus
  sourceType: string | null
  sourceLabel: string | null
  sourceUrl: string | null
  obtainedAt: Date | null
  lastCheckedAt: Date | null
}

function toKnowledgeItem(row: KnowledgeRow): SearchDetailKnowledgeItemDto {
  return {
    id: row.id,
    content: row.content,
    type: row.type,
    verificationStatus: row.verificationStatus,
    sourceType: row.sourceType,
    sourceLabel: row.sourceLabel,
    sourceUrl: row.sourceUrl,
    obtainedAt: row.obtainedAt ? row.obtainedAt.toISOString() : null,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
  }
}

/**
 * Step 4 Knowledge grouping.
 * verificationStatus has priority over type; USER_INFO is never shown;
 * each Knowledge appears in at most one group.
 */
export function groupKnowledgeForDetail(
  items: KnowledgeRow[],
): SearchDetailKnowledgeGroupsDto {
  const confirmed: SearchDetailKnowledgeItemDto[] = []
  const observations: SearchDetailKnowledgeItemDto[] = []
  const aiInferences: SearchDetailKnowledgeItemDto[] = []
  const needsVerification: SearchDetailKnowledgeItemDto[] = []

  for (const item of items) {
    if (item.type === KnowledgeType.USER_INFO) {
      continue
    }

    if (
      item.verificationStatus ===
        KnowledgeVerificationStatus.NEEDS_VERIFICATION ||
      item.verificationStatus === KnowledgeVerificationStatus.ASSUMPTION ||
      item.verificationStatus === KnowledgeVerificationStatus.OUTDATED
    ) {
      needsVerification.push(toKnowledgeItem(item))
      continue
    }

    if (item.verificationStatus !== KnowledgeVerificationStatus.VERIFIED) {
      continue
    }

    if (item.type === KnowledgeType.FACT) {
      confirmed.push(toKnowledgeItem(item))
      continue
    }

    if (item.type === KnowledgeType.OBSERVATION) {
      observations.push(toKnowledgeItem(item))
      continue
    }

    if (item.type === KnowledgeType.AI_INFERENCE) {
      aiInferences.push(toKnowledgeItem(item))
    }
  }

  return {
    confirmed,
    observations,
    aiInferences,
    needsVerification,
  }
}
