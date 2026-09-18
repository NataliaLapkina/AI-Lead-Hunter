import type { NeedsDecisionRecommendationsResponse } from '../../domain/recommendations/needsDecisionRecommendationsResponse.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import { findRecommendationsNeedingDecision } from '../../infrastructure/recommendations/recommendationRepository.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'

function toIsoOrNull(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

export async function listNeedsDecisionRecommendations(
  businessId: string,
): Promise<NeedsDecisionRecommendationsResponse> {
  const business = await findBusinessById(businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  const recommendations = await findRecommendationsNeedingDecision(
    businessId,
    new Date(),
  )

  return {
    recommendations: recommendations.map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      description: recommendation.description,
      reason: recommendation.reason,
      priority: recommendation.priority,
      status: recommendation.status,
      snoozedUntil: toIsoOrNull(recommendation.snoozedUntil),
      createdAt: recommendation.createdAt.toISOString(),
      company: recommendation.company,
      knowledge: recommendation.knowledgeLinks.map(({ knowledge }) => ({
        id: knowledge.id,
        content: knowledge.content,
        type: knowledge.type,
        verificationStatus: knowledge.verificationStatus,
        sourceType: knowledge.sourceType,
        sourceLabel: knowledge.sourceLabel,
        sourceUrl: knowledge.sourceUrl,
        obtainedAt: toIsoOrNull(knowledge.obtainedAt),
        lastCheckedAt: toIsoOrNull(knowledge.lastCheckedAt),
      })),
    })),
  }
}
