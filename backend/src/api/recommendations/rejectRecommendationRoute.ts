import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  RecommendationCompanyConflictError,
  RecommendationNotFoundError,
  RecommendationStatusConflictError,
} from '../../application/recommendations/acceptRecommendation.js'
import {
  InvalidRejectionCommentError,
  InvalidRejectionReasonError,
  RecommendationRejectionConflictError,
  rejectRecommendation,
} from '../../application/recommendations/rejectRecommendation.js'

type RejectRecommendationParams = {
  businessId: string
  recommendationId: string
}

type RejectRecommendationBody = {
  rejectionReason?: unknown
  rejectionComment?: unknown
}

function readBody(body: unknown): RejectRecommendationBody {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {}
  }

  return body as RejectRecommendationBody
}

export async function registerRejectRecommendationRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{
    Params: RejectRecommendationParams
    Body: RejectRecommendationBody
  }>(
    `${apiPrefix}/businesses/:businessId/recommendations/:recommendationId/reject`,
    async (request, reply) => {
      const body = readBody(request.body)

      try {
        const result = await rejectRecommendation({
          businessId: request.params.businessId,
          recommendationId: request.params.recommendationId,
          rejectionReason: body.rejectionReason,
          rejectionComment: body.rejectionComment,
        })

        return reply.status(200).send({
          data: result,
        })
      } catch (error) {
        if (error instanceof InvalidRejectionReasonError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_REJECTION_REASON',
              message: 'Invalid rejectionReason.',
              details: {},
            },
          })
        }

        if (error instanceof InvalidRejectionCommentError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_REJECTION_COMMENT',
              message: 'Invalid rejectionComment.',
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

        if (error instanceof RecommendationStatusConflictError) {
          return reply.status(409).send({
            error: {
              code: 'RECOMMENDATION_STATUS_CONFLICT',
              message:
                'Recommendation cannot be rejected from its current status.',
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

        if (error instanceof RecommendationRejectionConflictError) {
          return reply.status(409).send({
            error: {
              code: 'RECOMMENDATION_REJECTION_CONFLICT',
              message:
                'Recommendation rejection feedback conflicts with this request.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
