import {
  parseCompleteTaskResult,
  type CompleteTaskResult,
  type TaskCompletionOutcome,
} from '@/domain/tasks/completeTask'
import { apiPost } from '@/services/api/apiClient'

export function completeTaskPath(businessId: string, taskId: string): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/tasks/${encodeURIComponent(taskId)}/complete`
}

export function completeTaskRequestBody(
  outcome: TaskCompletionOutcome,
  comment: string,
): { outcome: TaskCompletionOutcome; comment?: string } {
  const trimmed = comment.trim()
  if (trimmed.length === 0) {
    return { outcome }
  }

  return { outcome, comment: trimmed }
}

export async function completeTask(
  businessId: string,
  taskId: string,
  outcome: TaskCompletionOutcome,
  comment: string,
  options?: { signal?: AbortSignal },
): Promise<CompleteTaskResult> {
  const data = await apiPost<unknown>(
    completeTaskPath(businessId, taskId),
    completeTaskRequestBody(outcome, comment),
    options,
  )

  return parseCompleteTaskResult(data)
}
