import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  InvalidDecidedByIdError,
  RecommendationCompanyConflictError,
  RecommendationNotFoundError,
  RecommendationStatusConflictError,
  UserNotBusinessMemberError,
  UserNotFoundError,
} from '../../application/recommendations/acceptRecommendation.js'
import {
  InvalidDecisionTitleError,
  RecommendationDecisionConflictError,
  modifyRecommendation,
} from '../../application/recommendations/modifyRecommendation.js'

type ModifyRecommendationParams = {
  businessId: string
  recommendationId: string
}

type ModifyRecommendationBody = {
  decidedById?: unknown
  decisionTitle?: unknown
}

function readBody(body: unknown): ModifyRecommendationBody {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {}
  }

  return body as ModifyRecommendationBody
}

export async function registerModifyRecommendationRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{
    Params: ModifyRecommendationParams
    Body: ModifyRecommendationBody
  }>(
    `${apiPrefix}/businesses/:businessId/recommendations/:recommendationId/modify`,
    async (request, reply) => {
      const body = readBody(request.body)

      try {
        const result = await modifyRecommendation({
          businessId: request.params.businessId,
          recommendationId: request.params.recommendationId,
          decidedById: body.decidedById,
          decisionTitle: body.decisionTitle,
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

        if (error instanceof InvalidDecisionTitleError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_DECISION_TITLE',
              message: 'Invalid decisionTitle.',
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
                'Recommendation cannot be modified from its current status.',
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

        if (error instanceof RecommendationDecisionConflictError) {
          return reply.status(409).send({
            error: {
              code: 'RECOMMENDATION_DECISION_CONFLICT',
              message: 'Recommendation decision conflicts with this request.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
