import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import { SearchNotFoundError } from '../../application/searches/listSearchResults.js'
import {
  SearchResultNotFoundError,
  getSearchResultDetail,
} from '../../application/searches/getSearchResultDetail.js'

type GetSearchResultDetailParams = {
  businessId: string
  searchId: string
  searchResultId: string
}

export async function registerGetSearchResultDetailRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.get<{ Params: GetSearchResultDetailParams }>(
    `${apiPrefix}/businesses/:businessId/searches/:searchId/results/:searchResultId`,
    async (request, reply) => {
      try {
        const payload = await getSearchResultDetail({
          businessId: request.params.businessId,
          searchId: request.params.searchId,
          searchResultId: request.params.searchResultId,
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

        if (error instanceof SearchResultNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'SEARCH_RESULT_NOT_FOUND',
              message: 'Search result not found.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
