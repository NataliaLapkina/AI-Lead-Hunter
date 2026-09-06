import {
  ContactPointType,
  KnowledgeType,
  KnowledgeVerificationStatus,
} from '@prisma/client'
import type {
  CompanyContactabilityDto,
} from '../../domain/searches/searchResultsResponse.js'

export function buildContactability(input: {
  website: string | null
  contactPointTypes: ContactPointType[]
}): CompanyContactabilityDto {
  const types = new Set(input.contactPointTypes)

  return {
    website: Boolean(input.website && input.website.trim().length > 0),
    email: types.has(ContactPointType.EMAIL),
    phone: types.has(ContactPointType.PHONE),
    vk: types.has(ContactPointType.VK),
    telegram: types.has(ContactPointType.TELEGRAM),
  }
}

/**
 * Temporary Knowledge panels for Search Results.
 * whyInteresting stays empty until Knowledge↔TargetProfile is modeled.
 * needsVerification uses existing content for statuses that need attention.
 * USER_INFO is never shown in either panel.
 */
export function mapKnowledgePanels(
  items: Array<{
    content: string
    type: KnowledgeType
    verificationStatus: KnowledgeVerificationStatus
  }>,
): {
  whyInteresting: string[]
  needsVerification: string[]
} {
  const needsVerification: string[] = []

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
      needsVerification.push(item.content)
    }
  }

  return {
    whyInteresting: [],
    needsVerification,
  }
}
