export type ModifiedRecommendationDto = {
  id: string
  status: string
  snoozedUntil: null
  updatedAt: string
}

export type ModifiedRecommendationDecisionDto = {
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

export type ModifyRecommendationResult = {
  recommendation: ModifiedRecommendationDto
  decision: ModifiedRecommendationDecisionDto
}
