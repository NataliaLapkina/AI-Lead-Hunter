import { KnowledgeVerificationStatus } from '@prisma/client'
import type { VerifyKnowledgeResult } from '../../domain/knowledge/verifyKnowledgeResult.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findKnowledgeVerifyContextInBusiness,
  tryVerifyKnowledgeAtomic,
  type VerifiedKnowledgeRow,
} from '../../infrastructure/knowledge/knowledgeRepository.js'

export class KnowledgeNotFoundError extends Error {
  constructor() {
    super('Knowledge not found.')
    this.name = 'KnowledgeNotFoundError'
  }
}

export class KnowledgeVerificationConflictError extends Error {
  constructor() {
    super('Knowledge cannot be verified from its current status.')
    this.name = 'KnowledgeVerificationConflictError'
  }
}

function toIsoOrNull(value: Date | null): string | null {
  if (value === null) {
    return null
  }

  return value.toISOString()
}

function toResult(knowledge: VerifiedKnowledgeRow): VerifyKnowledgeResult {
  return {
    knowledge: {
      id: knowledge.id,
      verificationStatus: knowledge.verificationStatus,
      lastCheckedAt: toIsoOrNull(knowledge.lastCheckedAt),
      updatedAt: knowledge.updatedAt.toISOString(),
    },
  }
}

export async function verifyKnowledge(input: {
  businessId: string
  knowledgeId: string
}): Promise<VerifyKnowledgeResult> {
  const business = await findBusinessById(input.businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  const verified = await tryVerifyKnowledgeAtomic(input.businessId, input.knowledgeId)

  if (verified) {
    return toResult(verified)
  }

  const knowledge = await findKnowledgeVerifyContextInBusiness(
    input.businessId,
    input.knowledgeId,
  )

  if (!knowledge) {
    throw new KnowledgeNotFoundError()
  }

  if (knowledge.verificationStatus === KnowledgeVerificationStatus.VERIFIED) {
    return toResult(knowledge)
  }

  throw new KnowledgeVerificationConflictError()
}
