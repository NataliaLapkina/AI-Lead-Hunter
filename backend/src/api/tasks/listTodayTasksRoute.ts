import type { FastifyInstance } from 'fastify'
import {
  BusinessNotFoundError,
  InvalidTimeZoneError,
  createListTodayTasks,
  type ListTodayTasksDependencies,
} from '../../application/tasks/listTodayTasks.js'

type ListTodayTasksParams = {
  businessId: string
}

type ListTodayTasksQuery = {
  timezone?: unknown
}

function readTimeZone(query: unknown): unknown {
  if (query === null || typeof query !== 'object' || Array.isArray(query)) {
    return undefined
  }

  return (query as ListTodayTasksQuery).timezone
}

export async function registerListTodayTasksRoute(
  app: FastifyInstance,
  apiPrefix: string,
  dependencies: ListTodayTasksDependencies = {},
): Promise<void> {
  const listTodayTasks = createListTodayTasks(dependencies)

  app.get<{
    Params: ListTodayTasksParams
    Querystring: ListTodayTasksQuery
  }>(
    `${apiPrefix}/businesses/:businessId/today/tasks`,
    async (request, reply) => {
      try {
        const result = await listTodayTasks(
          request.params.businessId,
          readTimeZone(request.query),
        )

        return reply.status(200).send({
          data: result,
        })
      } catch (error) {
        if (error instanceof InvalidTimeZoneError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_TIME_ZONE',
              message: 'Invalid timezone.',
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

        throw error
      }
    },
  )
}
