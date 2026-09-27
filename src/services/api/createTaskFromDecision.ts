import {
  createTaskFromDecisionPath,
  parseCreateTaskFromDecisionResult,
  type CreateTaskFromDecisionCommand,
  type CreateTaskFromDecisionResult,
} from '@/domain/tasks/task'
import { apiPost } from '@/services/api/apiClient'

export async function createTaskFromDecision(input: {
  businessId: string
  decisionId: string
  command: CreateTaskFromDecisionCommand
  signal?: AbortSignal
}): Promise<CreateTaskFromDecisionResult> {
  const data = await apiPost<unknown>(
    createTaskFromDecisionPath(input.businessId, input.decisionId),
    {
      createdById: input.command.createdById,
      title: input.command.title,
      dueAt: input.command.dueAt,
      priority: input.command.priority,
    },
    { signal: input.signal },
  )

  return parseCreateTaskFromDecisionResult(data)
}
