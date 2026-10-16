import { parseStartTaskResult, type StartTaskResult } from '@/domain/tasks/startTask'
import { apiPost } from '@/services/api/apiClient'

export function startTaskPath(businessId: string, taskId: string): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/tasks/${encodeURIComponent(taskId)}/start`
}

export async function startTask(
  businessId: string,
  taskId: string,
  options?: { signal?: AbortSignal },
): Promise<StartTaskResult> {
  const data = await apiPost<unknown>(startTaskPath(businessId, taskId), undefined, options)

  return parseStartTaskResult(data)
}
