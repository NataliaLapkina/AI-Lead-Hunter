import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import { CompanyNotFoundError } from '../../application/companies/updateCompanyAssessment.js'
import {
  CompanyNotSuitableForWorkError,
  CompanyWorkStateConflictError,
  startCompanyWork,
} from '../../application/companies/startCompanyWork.js'

type StartCompanyWorkParams = {
  businessId: string
  companyId: string
}

export async function registerStartCompanyWorkRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.post<{ Params: StartCompanyWorkParams }>(
    `${apiPrefix}/businesses/:businessId/companies/:companyId/start-work`,
    async (request, reply) => {
      try {
        const company = await startCompanyWork({
          businessId: request.params.businessId,
          companyId: request.params.companyId,
        })

        return reply.status(200).send({
          data: {
            company,
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

        if (error instanceof CompanyNotFoundError) {
          return reply.status(404).send({
            error: {
              code: 'COMPANY_NOT_FOUND',
              message: 'Company not found.',
              details: {},
            },
          })
        }

        if (error instanceof CompanyNotSuitableForWorkError) {
          return reply.status(409).send({
            error: {
              code: 'COMPANY_NOT_SUITABLE_FOR_WORK',
              message:
                'Company must be suitable before work can be started.',
              details: {},
            },
          })
        }

        if (error instanceof CompanyWorkStateConflictError) {
          return reply.status(409).send({
            error: {
              code: 'COMPANY_WORK_STATE_CONFLICT',
              message:
                'Company work cannot be started from its current state.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
