import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import { listNeedsDecisionRecommendations } from '../../application/recommendations/listNeedsDecisionRecommendations.js'

type ListNeedsDecisionRecommendationsParams = {
  businessId: string
}

export async function registerListNeedsDecisionRecommendationsRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.get<{ Params: ListNeedsDecisionRecommendationsParams }>(
    `${apiPrefix}/businesses/:businessId/recommendations/needs-decision`,
    async (request, reply) => {
      try {
        const result = await listNeedsDecisionRecommendations(
          request.params.businessId,
        )

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
