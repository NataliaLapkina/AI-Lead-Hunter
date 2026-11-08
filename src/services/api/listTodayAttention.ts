import { parseTodayAttention, type TodayAttention } from '@/domain/tasks/todayAttention'
import { apiGet } from '@/services/api/apiClient'

export function todayAttentionPath(businessId: string): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/today/attention`
}

export async function listTodayAttention(
  businessId: string,
  options?: { signal?: AbortSignal },
): Promise<TodayAttention> {
  const data = await apiGet<unknown>(todayAttentionPath(businessId), options)

  return parseTodayAttention(data)
}
