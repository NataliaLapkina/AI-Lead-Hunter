import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  UserNotBusinessMemberError,
  UserNotFoundError,
} from '../../application/recommendations/acceptRecommendation.js'
import {
  DecisionCompanyConflictError,
  DecisionNotFoundError,
  DecisionStatusConflictError,
  DueAtNotInFutureError,
  InvalidCreatedByIdError,
  InvalidDueAtError,
  InvalidTaskPriorityError,
  InvalidTaskTitleError,
  createTaskFromDecision,
} from '../../application/tasks/createTaskFromDecision.js'

type CreateTaskParams = {
  businessId: string
  decisionId: string
}

type CreateTaskBody = {
  createdById?: unknown
  title?: unknown
  dueAt?: unknown
  priority?: unknown
}

function readBody(body: unknown): CreateTaskBody {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {}
  }

  return body as CreateTaskBody
}

export async function registerCreateTaskFromDecisionRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{
    Params: CreateTaskParams
    Body: CreateTaskBody
  }>(
    `${apiPrefix}/businesses/:businessId/decisions/:decisionId/tasks`,
    async (request, reply) => {
      const body = readBody(request.body)

      try {
        const result = await createTaskFromDecision({
          businessId: request.params.businessId,
          decisionId: request.params.decisionId,
          createdById: body.createdById,
          title: body.title,
          dueAt: body.dueAt,
          priority: body.priority,
        })

        return reply.status(200).send({
          data: result,
        })
      } catch (error) {
        if (error instanceof InvalidCreatedByIdError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_CREATED_BY_ID',
              message: 'Invalid createdById.',
              details: {},
            },
          })
        }

        if (error instanceof InvalidTaskTitleError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_TASK_TITLE',
              message: 'Invalid title.',
              details: {},
            },
          })
        }

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

        if (error instanceof InvalidTaskPriorityError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_TASK_PRIORITY',
              message: 'Invalid priority.',
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

        if (error instanceof DecisionNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'DECISION_NOT_FOUND',
              message: 'Decision not found.',
              details: {},
            },
          })
        }

        if (error instanceof UserNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found.',
              details: {},
            },
          })
        }

        if (error instanceof UserNotBusinessMemberError) {
          return reply.status(403).send({
            error: {
              code: 'USER_NOT_BUSINESS_MEMBER',
              message: 'User is not a member of this business.',
              details: {},
            },
          })
        }

        if (error instanceof DecisionStatusConflictError) {
          return reply.status(409).send({
            error: {
              code: 'DECISION_STATUS_CONFLICT',
              message: 'Task cannot be created from this Decision status.',
              details: {},
            },
          })
        }

        if (error instanceof DecisionCompanyConflictError) {
          return reply.status(409).send({
            error: {
              code: 'DECISION_COMPANY_CONFLICT',
              message: 'Decision company does not belong to this business.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
