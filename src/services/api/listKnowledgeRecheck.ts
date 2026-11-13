import {
  parseKnowledgeRecheck,
  type KnowledgeRecheck,
} from '@/domain/knowledge/knowledgeRecheck'
import { apiGet } from '@/services/api/apiClient'

export function knowledgeRecheckPath(businessId: string): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/knowledge/recheck`
}

export async function listKnowledgeRecheck(
  businessId: string,
  options?: { signal?: AbortSignal },
): Promise<KnowledgeRecheck> {
  const data = await apiGet<unknown>(knowledgeRecheckPath(businessId), options)

  return parseKnowledgeRecheck(data)
}
