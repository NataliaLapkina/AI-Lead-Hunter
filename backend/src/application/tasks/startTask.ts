import { TaskStatus } from '@prisma/client'
import type { StartTaskResult } from '../../domain/tasks/startTaskResult.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findTaskStartContextInBusiness,
  tryStartTaskAtomic,
} from '../../infrastructure/tasks/taskRepository.js'

export class TaskNotFoundError extends Error {
  constructor() {
    super('Task not found.')
    this.name = 'TaskNotFoundError'
  }
}

export class TaskStatusConflictError extends Error {
  constructor() {
    super('Task cannot be started from its current status.')
    this.name = 'TaskStatusConflictError'
  }
}

function toResult(task: { id: string; status: TaskStatus }): StartTaskResult {
  return {
    task: {
      id: task.id,
      status: task.status,
    },
  }
}

export async function startTask(input: {
  businessId: string
  taskId: string
}): Promise<StartTaskResult> {
  const business = await findBusinessById(input.businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  const started = await tryStartTaskAtomic(input.businessId, input.taskId)

  if (started) {
    return toResult(started)
  }

  const task = await findTaskStartContextInBusiness(input.businessId, input.taskId)

  if (!task) {
    throw new TaskNotFoundError()
  }

  if (task.status === TaskStatus.IN_PROGRESS) {
    return toResult(task)
  }

  throw new TaskStatusConflictError()
}
