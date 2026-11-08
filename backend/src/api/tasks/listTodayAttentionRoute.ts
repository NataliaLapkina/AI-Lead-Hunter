import type { FastifyInstance } from 'fastify'
import {
  BusinessNotFoundError,
  listTodayAttention,
} from '../../application/tasks/listTodayAttention.js'

type ListTodayAttentionParams = {
  businessId: string
}

export async function registerListTodayAttentionRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.get<{ Params: ListTodayAttentionParams }>(
    `${apiPrefix}/businesses/:businessId/today/attention`,
    async (request, reply) => {
      try {
        const result = await listTodayAttention(request.params.businessId)

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

        throw error
      }
    },
  )
}
