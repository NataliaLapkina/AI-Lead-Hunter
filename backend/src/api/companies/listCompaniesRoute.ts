import type { FastifyInstance } from 'fastify'
import {
  BusinessNotFoundError,
  listCompanies,
} from '../../application/companies/listCompanies.js'

type ListCompaniesParams = {
  businessId: string
}

export async function registerListCompaniesRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.get<{ Params: ListCompaniesParams }>(
    `${apiPrefix}/businesses/:businessId/companies`,
    async (request, reply) => {
      try {
        const companies = await listCompanies(request.params.businessId)

        return reply.status(200).send({
          data: {
            companies,
          },
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
