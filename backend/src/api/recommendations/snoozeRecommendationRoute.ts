import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  InvalidSnoozedUntilError,
  SnoozedUntilNotInFutureError,
  SnoozeRecommendationCompanyConflictError,
  SnoozeRecommendationNotFoundError,
  SnoozeRecommendationStatusConflictError,
  snoozeRecommendation,
} from '../../application/recommendations/snoozeRecommendation.js'

type SnoozeRecommendationParams = {
  businessId: string
  recommendationId: string
}

type SnoozeRecommendationBody = {
  snoozedUntil?: unknown
}

function readSnoozedUntil(body: unknown): unknown {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return undefined
  }

  return (body as SnoozeRecommendationBody).snoozedUntil
}

export async function registerSnoozeRecommendationRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{
    Params: SnoozeRecommendationParams
    Body: SnoozeRecommendationBody
  }>(
    `${apiPrefix}/businesses/:businessId/recommendations/:recommendationId/snooze`,
    async (request, reply) => {
      try {
        const result = await snoozeRecommendation({
          businessId: request.params.businessId,
          recommendationId: request.params.recommendationId,
          snoozedUntil: readSnoozedUntil(request.body),
        })

        return reply.status(200).send({
          data: result,
        })
      } catch (error) {
        if (error instanceof InvalidSnoozedUntilError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_SNOOZED_UNTIL',
              message: 'Invalid snoozedUntil.',
              details: {},
            },
          })
        }

        if (error instanceof SnoozedUntilNotInFutureError) {
          return reply.status(400).send({
            error: {
              code: 'SNOOZED_UNTIL_NOT_IN_FUTURE',
              message: 'snoozedUntil must be in the future.',
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

        if (error instanceof SnoozeRecommendationNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'RECOMMENDATION_NOT_FOUND',
              message: 'Recommendation not found.',
              details: {},
            },
          })
        }

        if (error instanceof SnoozeRecommendationStatusConflictError) {
          return reply.status(409).send({
            error: {
              code: 'RECOMMENDATION_STATUS_CONFLICT',
              message:
                'Recommendation cannot be snoozed from its current status.',
              details: {},
            },
          })
        }

        if (error instanceof SnoozeRecommendationCompanyConflictError) {
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
