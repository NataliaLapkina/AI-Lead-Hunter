import {
  parseNeedsDecisionRecommendations,
  type NeedsDecisionRecommendations,
} from '@/domain/recommendations/needsDecision'
import { apiGet } from '@/services/api/apiClient'

export function needsDecisionRecommendationsPath(businessId: string): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/recommendations/needs-decision`
}

export async function listNeedsDecisionRecommendations(
  businessId: string,
  options?: { signal?: AbortSignal },
): Promise<NeedsDecisionRecommendations> {
  const data = await apiGet<unknown>(
    needsDecisionRecommendationsPath(businessId),
    options,
  )

  return parseNeedsDecisionRecommendations(data)
}
