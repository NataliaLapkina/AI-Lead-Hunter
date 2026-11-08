import { parseTodayDeferred, type TodayDeferred } from '@/domain/recommendations/todayDeferred'
import { apiGet } from '@/services/api/apiClient'

export function todayDeferredPath(businessId: string): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/today/deferred`
}

export async function listTodayDeferred(
  businessId: string,
  options?: { signal?: AbortSignal },
): Promise<TodayDeferred> {
  const data = await apiGet<unknown>(todayDeferredPath(businessId), options)

  return parseTodayDeferred(data)
}
