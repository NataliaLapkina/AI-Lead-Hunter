export type RejectedRecommendationDto = {
  id: string
  status: string
  rejectionReason: string
  rejectionComment: string | null
  snoozedUntil: string | null
  updatedAt: string
}

export type RejectRecommendationResult = {
  recommendation: RejectedRecommendationDto
}
