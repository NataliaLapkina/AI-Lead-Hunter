import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  DueAtNotInFutureError,
  InvalidDueAtError,
  TaskNotFoundError,
  TaskStatusConflictError,
  createRescheduleTask,
  type RescheduleTaskDependencies,
} from '../../application/tasks/rescheduleTask.js'

type RescheduleTaskParams = {
  businessId: string
  taskId: string
}

type RescheduleTaskBody = {
  dueAt?: unknown
}

function readDueAt(body: unknown): unknown {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return undefined
  }

  return (body as RescheduleTaskBody).dueAt
}

export async function registerRescheduleTaskRoute(
  app: FastifyInstance,
  apiPrefix: string,
  dependencies: RescheduleTaskDependencies = {},
): Promise<void> {
  const rescheduleTask = createRescheduleTask(dependencies)

  app.post<{
    Params: RescheduleTaskParams
    Body: RescheduleTaskBody
  }>(
    `${apiPrefix}/businesses/:businessId/tasks/:taskId/reschedule`,
    async (request, reply) => {
      try {
        const result = await rescheduleTask({
          businessId: request.params.businessId,
          taskId: request.params.taskId,
          dueAt: readDueAt(request.body),
        })

        return reply.status(200).send({
          data: result,
        })
      } catch (error) {
        if (error instanceof InvalidDueAtError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_DUE_AT',
              message: 'Invalid dueAt.',
              details: {},
            },
          })
        }

        if (error instanceof DueAtNotInFutureError) {
          return reply.status(400).send({
            error: {
              code: 'DUE_AT_NOT_IN_FUTURE',
              message: 'dueAt must be in the future.',
              details: {},
            },
          })
        }

        if (error instanceof BusinessNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'BUSINESS_NOT_FOUND',
              message: 'Business not found.',
              details: {},
            },
          })
        }

        if (error instanceof TaskNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'TASK_NOT_FOUND',
              message: 'Task not found.',
              details: {},
            },
          })
        }

        if (error instanceof TaskStatusConflictError) {
          return reply.status(409).send({
            error: {
              code: 'TASK_STATUS_CONFLICT',
              message: 'Task cannot be rescheduled from its current status.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
