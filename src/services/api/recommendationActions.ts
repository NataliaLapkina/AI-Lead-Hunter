import {
  parseAcceptRecommendationResult,
  type AcceptRecommendationResult,
} from '@/domain/decisions/decision'
import { recommendationActionPath } from '@/domain/recommendations/recommendationActions'
import { apiPost } from '@/services/api/apiClient'

type RecommendationActionOptions = {
  businessId: string
  recommendationId: string
  signal?: AbortSignal
}

export async function acceptRecommendation(
  input: RecommendationActionOptions & { decidedById: string },
): Promise<AcceptRecommendationResult> {
  const data = await apiPost<unknown>(
    recommendationActionPath(input.businessId, input.recommendationId, 'accept'),
    { decidedById: input.decidedById },
    { signal: input.signal },
  )

  return parseAcceptRecommendationResult(data)
}

export async function snoozeRecommendation(
  input: RecommendationActionOptions & { snoozedUntil: string },
): Promise<unknown> {
  return apiPost(
    recommendationActionPath(input.businessId, input.recommendationId, 'snooze'),
    { snoozedUntil: input.snoozedUntil },
    { signal: input.signal },
  )
}

export async function modifyRecommendation(
  input: RecommendationActionOptions & {
    decidedById: string
    decisionTitle: string
  },
): Promise<unknown> {
  return apiPost(
    recommendationActionPath(input.businessId, input.recommendationId, 'modify'),
    {
      decidedById: input.decidedById,
      decisionTitle: input.decisionTitle,
    },
    { signal: input.signal },
  )
}

export async function rejectRecommendation(
  input: RecommendationActionOptions & {
    rejectionReason: string
    rejectionComment?: string
  },
): Promise<unknown> {
  const body: { rejectionReason: string; rejectionComment?: string } = {
    rejectionReason: input.rejectionReason,
  }

  if (input.rejectionComment !== undefined) {
    body.rejectionComment = input.rejectionComment
  }

  return apiPost(
    recommendationActionPath(input.businessId, input.recommendationId, 'reject'),
    body,
    { signal: input.signal },
  )
}
