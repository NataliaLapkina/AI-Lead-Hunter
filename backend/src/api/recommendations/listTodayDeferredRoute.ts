import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import { listTodayDeferred } from '../../application/recommendations/listTodayDeferred.js'

type ListTodayDeferredParams = {
  businessId: string
}

export async function registerListTodayDeferredRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.get<{ Params: ListTodayDeferredParams }>(
    `${apiPrefix}/businesses/:businessId/today/deferred`,
    async (request, reply) => {
      try {
        const result = await listTodayDeferred(request.params.businessId)

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
