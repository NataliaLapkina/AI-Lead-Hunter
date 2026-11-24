import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  KnowledgeNotFoundError,
  KnowledgeVerificationConflictError,
  verifyKnowledge,
} from '../../application/knowledge/verifyKnowledge.js'

type VerifyKnowledgeParams = {
  businessId: string
  knowledgeId: string
}

export async function registerVerifyKnowledgeRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{ Params: VerifyKnowledgeParams }>(
    `${apiPrefix}/businesses/:businessId/knowledge/:knowledgeId/verify`,
    async (request, reply) => {
      try {
        const result = await verifyKnowledge({
          businessId: request.params.businessId,
          knowledgeId: request.params.knowledgeId,
        })

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

        if (error instanceof KnowledgeNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'KNOWLEDGE_NOT_FOUND',
              message: 'Knowledge not found.',
              details: {},
            },
          })
        }

        if (error instanceof KnowledgeVerificationConflictError) {
          return reply.status(409).send({
            error: {
              code: 'KNOWLEDGE_VERIFICATION_CONFLICT',
              message: 'Knowledge cannot be verified from its current status.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
