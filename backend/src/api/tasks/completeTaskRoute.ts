import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  CommentRequiredError,
  InvalidCommentError,
  InvalidOutcomeError,
  TaskNotFoundError,
  TaskStatusConflictError,
  completeTask,
} from '../../application/tasks/completeTask.js'

type CompleteTaskParams = {
  businessId: string
  taskId: string
}

export async function registerCompleteTaskRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{ Params: CompleteTaskParams }>(
    `${apiPrefix}/businesses/:businessId/tasks/:taskId/complete`,
    async (request, reply) => {
      try {
        const result = await completeTask({
          businessId: request.params.businessId,
          taskId: request.params.taskId,
          body: request.body,
        })

        return reply.status(200).send({
          data: result,
        })
      } catch (error) {
        if (error instanceof InvalidOutcomeError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_OUTCOME',
              message: 'Invalid outcome.',
              details: {},
            },
          })
        }

        if (error instanceof InvalidCommentError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_COMMENT',
              message: 'Invalid comment.',
              details: {},
            },
          })
        }

        if (error instanceof CommentRequiredError) {
          return reply.status(400).send({
            error: {
              code: 'COMMENT_REQUIRED',
              message: 'Comment is required.',
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
              message: 'Task cannot be completed from its current status.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
