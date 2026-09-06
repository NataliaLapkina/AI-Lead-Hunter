import type { FastifyInstance } from 'fastify'
import { BusinessNotFoundError } from '../../application/companies/listCompanies.js'
import {
  CompanyNotFoundError,
  InvalidCompanyAssessmentError,
  updateCompanyAssessment,
} from '../../application/companies/updateCompanyAssessment.js'

type UpdateCompanyAssessmentParams = {
  businessId: string
  companyId: string
}

type UpdateCompanyAssessmentBody = {
  assessment?: unknown
}

export async function registerUpdateCompanyAssessmentRoute(
  app: FastifyInstance,
  apiPrefix: string,
): Promise<void> {
  app.patch<{
    Params: UpdateCompanyAssessmentParams
    Body: UpdateCompanyAssessmentBody
  }>(
    `${apiPrefix}/businesses/:businessId/companies/:companyId/assessment`,
    async (request, reply) => {
      try {
        const body = request.body

        if (body === null || typeof body !== 'object' || Array.isArray(body)) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_COMPANY_ASSESSMENT',
              message: 'Invalid company assessment.',
              details: {},
            },
          })
        }

        const company = await updateCompanyAssessment({
          businessId: request.params.businessId,
          companyId: request.params.companyId,
          assessment: body.assessment,
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

        if (error instanceof InvalidCompanyAssessmentError) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_COMPANY_ASSESSMENT',
              message: 'Invalid company assessment.',
              details: {},
            },
          })
        }

        throw error
      }
    },
  )
}
