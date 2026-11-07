import {
  parseRescheduleTaskResult,
  type RescheduleTaskResult,
} from '@/domain/tasks/rescheduleTask'
import { apiPost } from '@/services/api/apiClient'

export function rescheduleTaskPath(businessId: string, taskId: string): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/tasks/${encodeURIComponent(taskId)}/reschedule`
}

export async function rescheduleTask(
  businessId: string,
  taskId: string,
  dueAt: string,
  options?: { signal?: AbortSignal },
): Promise<RescheduleTaskResult> {
  const data = await apiPost<unknown>(
    rescheduleTaskPath(businessId, taskId),
    { dueAt },
    options,
  )

  return parseRescheduleTaskResult(data)
}
