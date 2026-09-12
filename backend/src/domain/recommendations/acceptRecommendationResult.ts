export type AcceptedRecommendationDto = {
  id: string
  status: string
  snoozedUntil: null
  updatedAt: string
}

export type AcceptedRecommendationDecisionDto = {
  id: string
  recommendationId: string
  companyId: string | null
  title: string
  description: string | null
  status: string
  decidedById: string
  createdAt: string
  updatedAt: string
}

export type AcceptRecommendationResult = {
  recommendation: AcceptedRecommendationDto
  decision: AcceptedRecommendationDecisionDto
}
