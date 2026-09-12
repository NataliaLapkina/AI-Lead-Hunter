import type { FastifyInstance } from 'fastify'
import {
  InvalidDecidedByIdError,
  RecommendationCompanyConflictError,
  RecommendationNotFoundError,
  RecommendationStatusConflictError,
  UserNotBusinessMemberError,
  UserNotFoundError,
  acceptRecommendation,
} from '../../application/recommendations/acceptRecommendation.js'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'

type AcceptRecommendationParams = {
  businessId: string
  recommendationId: string
}

type AcceptRecommendationBody = {
  decidedById?: unknown
}

function readDecidedById(body: unknown): unknown {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return undefined
  }

  return (body as AcceptRecommendationBody).decidedById
}

export async function registerAcceptRecommendationRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{
    Params: AcceptRecommendationParams
    Body: AcceptRecommendationBody
  }>(
    `${apiPrefix}/businesses/:businessId/recommendations/:recommendationId/accept`,
    async (request, reply) => {
      try {
        const result = await acceptRecommendation({
          businessId: request.params.businessId,
          recommendationId: request.params.recommendationId,
          decidedById: readDecidedById(request.body),
        })

        return reply.status(200).send({
          data: result,
        })
      } catch (error) {
        if (error instanceof InvalidDecidedByIdError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_DECIDED_BY_ID',
              message: 'Invalid decidedById.',
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

        if (error instanceof RecommendationNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'RECOMMENDATION_NOT_FOUND',
              message: 'Recommendation not found.',
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

        if (error instanceof RecommendationStatusConflictError) {
          return reply.status(409).send({
            error: {
              code: 'RECOMMENDATION_STATUS_CONFLICT',
              message:
                'Recommendation cannot be accepted from its current status.',
              details: {},
            },
          })
        }

        if (error instanceof RecommendationCompanyConflictError) {
          return reply.status(409).send({
            error: {
              code: 'RECOMMENDATION_COMPANY_CONFLICT',
              message:
                'Recommendation company does not belong to this business.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
