import {
  parseVerifyKnowledgeResult,
  InvalidVerifyKnowledgeResponseError,
  type VerifyKnowledgeResult,
} from '@/domain/knowledge/verifyKnowledge'
import { apiPost } from '@/services/api/apiClient'

export function verifyKnowledgePath(businessId: string, knowledgeId: string): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/knowledge/${encodeURIComponent(knowledgeId)}/verify`
}

export async function verifyKnowledge(
  businessId: string,
  knowledgeId: string,
  options?: { signal?: AbortSignal },
): Promise<VerifyKnowledgeResult> {
  const data = await apiPost<unknown>(
    verifyKnowledgePath(businessId, knowledgeId),
    undefined,
    options,
  )
  const result = parseVerifyKnowledgeResult(data)

  if (result.knowledge.id !== knowledgeId) {
    throw new InvalidVerifyKnowledgeResponseError()
  }

  return result
}
