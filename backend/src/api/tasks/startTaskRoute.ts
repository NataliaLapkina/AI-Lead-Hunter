import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  TaskNotFoundError,
  TaskStatusConflictError,
  startTask,
} from '../../application/tasks/startTask.js'

type StartTaskParams = {
  businessId: string
  taskId: string
}

export async function registerStartTaskRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{ Params: StartTaskParams }>(
    `${apiPrefix}/businesses/:businessId/tasks/:taskId/start`,
    async (request, reply) => {
      try {
        const result = await startTask({
          businessId: request.params.businessId,
          taskId: request.params.taskId,
        })

        return reply.status(200).send({
          data: result,
        })
      } catch (error) {
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
              message: 'Task cannot be started from its current status.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
