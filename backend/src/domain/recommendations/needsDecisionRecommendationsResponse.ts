export type NeedsDecisionRecommendationCompanyDto = {
  id: string
  name: string
}

export type NeedsDecisionRecommendationKnowledgeDto = {
  id: string
  content: string
  type: string
  verificationStatus: string
  sourceType: string | null
  sourceLabel: string | null
  sourceUrl: string | null
  obtainedAt: string | null
  lastCheckedAt: string | null
}

export type NeedsDecisionRecommendationDto = {
  id: string
  title: string
  description: string
  reason: string
  priority: string
  status: string
  snoozedUntil: string | null
  createdAt: string
  company: NeedsDecisionRecommendationCompanyDto | null
  knowledge: NeedsDecisionRecommendationKnowledgeDto[]
}

export type NeedsDecisionRecommendationsResponse = {
  recommendations: NeedsDecisionRecommendationDto[]
}
