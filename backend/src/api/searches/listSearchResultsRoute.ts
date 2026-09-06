import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  SearchNotFoundError,
  listSearchResults,
} from '../../application/searches/listSearchResults.js'

type ListSearchResultsParams = {
  businessId: string
  searchId: string
}

export async function registerListSearchResultsRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.get<{ Params: ListSearchResultsParams }>(
    `${apiPrefix}/businesses/:businessId/searches/:searchId/results`,
    async (request, reply) => {
      try {
        const payload = await listSearchResults({
          businessId: request.params.businessId,
          searchId: request.params.searchId,
        })

        return reply.status(200).send({
          data: payload,
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

        if (error instanceof SearchNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'SEARCH_NOT_FOUND',
              message: 'Search not found.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
