export type SnoozedRecommendationDto = {
  id: string
  status: string
  snoozedUntil: string
  updatedAt: string
}

export type SnoozeRecommendationResult = {
  recommendation: SnoozedRecommendationDto
}
