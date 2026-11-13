import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import { listKnowledgeRecheck } from '../../application/knowledge/listKnowledgeRecheck.js'

type ListKnowledgeRecheckParams = {
  businessId: string
}

export async function registerListKnowledgeRecheckRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.get<{ Params: ListKnowledgeRecheckParams }>(
    `${apiPrefix}/businesses/:businessId/knowledge/recheck`,
    async (request, reply) => {
      try {
        const result = await listKnowledgeRecheck(request.params.businessId)

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
