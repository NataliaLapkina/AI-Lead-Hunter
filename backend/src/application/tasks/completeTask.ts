import { TaskStatus } from '@prisma/client'
import {
  CommentRequiredError,
  InvalidCommentError,
  InvalidOutcomeError,
  parseCompleteTaskInput,
} from '../../domain/tasks/completeTaskInput.js'
import type { CompleteTaskResult } from '../../domain/tasks/completeTaskResult.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findTaskCompleteContextInBusiness,
  tryCompleteTaskAtomic,
  type CompletedTaskRow,
} from '../../infrastructure/tasks/taskRepository.js'

export { CommentRequiredError, InvalidCommentError, InvalidOutcomeError }

export class TaskNotFoundError extends Error {
  constructor() {
    super('Task not found.')
    this.name = 'TaskNotFoundError'
  }
}

export class TaskStatusConflictError extends Error {
  constructor() {
    super('Task cannot be completed from its current status.')
    this.name = 'TaskStatusConflictError'
  }
}

function isCompletableStatus(status: TaskStatus): boolean {
  return status === TaskStatus.TODO || status === TaskStatus.IN_PROGRESS
}

function toResult(task: CompletedTaskRow): CompleteTaskResult {
  return {
    task: {
      id: task.id,
      status: task.status,
      completedAt: task.completedAt.toISOString(),
      completionOutcome: task.completionOutcome,
      completionComment: task.completionComment,
    },
  }
}

export async function completeTask(input: {
  businessId: string
  taskId: string
  body: unknown
}): Promise<CompleteTaskResult> {
  const parsed = parseCompleteTaskInput(input.body)
  const business = await findBusinessById(input.businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const updated = await tryCompleteTaskAtomic(
      input.businessId,
      input.taskId,
      parsed.outcome,
      parsed.comment,
    )

    if (updated) {
      return toResult(updated)
    }

    const task = await findTaskCompleteContextInBusiness(input.businessId, input.taskId)

    if (!task) {
      throw new TaskNotFoundError()
    }

    if (!isCompletableStatus(task.status)) {
      throw new TaskStatusConflictError()
    }
  }

  throw new Error('Task completion failed due to a concurrent change.')
}
