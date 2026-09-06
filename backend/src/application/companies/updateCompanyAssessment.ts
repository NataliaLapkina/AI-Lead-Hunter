import type { CompanyAssessment } from '@prisma/client'
import type { CompanyAssessmentUpdateResult } from '../../domain/companies/companyAssessmentUpdateResult.js'
import { BusinessNotFoundError } from './listCompanies.js'
import {
  findBusinessById,
  findCompanyInBusiness,
  updateCompanyAssessmentField,
} from '../../infrastructure/companies/companyRepository.js'

const ALLOWED_ASSESSMENTS = [
  'NOT_ASSESSED',
  'SUITABLE',
  'NOT_SUITABLE',
  'UNDECIDED',
] as const

type AllowedAssessment = (typeof ALLOWED_ASSESSMENTS)[number]

export class CompanyNotFoundError extends Error {
  constructor() {
    super('Company not found.')
    this.name = 'CompanyNotFoundError'
  }
}

export class InvalidCompanyAssessmentError extends Error {
  constructor() {
    super('Invalid company assessment.')
    this.name = 'InvalidCompanyAssessmentError'
  }
}

function parseAssessment(value: unknown): AllowedAssessment {
  if (typeof value !== 'string') {
    throw new InvalidCompanyAssessmentError()
  }

  if (
    !ALLOWED_ASSESSMENTS.includes(value as AllowedAssessment)
  ) {
    throw new InvalidCompanyAssessmentError()
  }

  return value as AllowedAssessment
}

export async function updateCompanyAssessment(input: {
  businessId: string
  companyId: string
  assessment: unknown
}): Promise<CompanyAssessmentUpdateResult> {
  const business = await findBusinessById(input.businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  const company = await findCompanyInBusiness(
    input.businessId,
    input.companyId,
  )

  if (!company) {
    throw new CompanyNotFoundError()
  }

  const assessment = parseAssessment(input.assessment)

  const updated = await updateCompanyAssessmentField(
    company.id,
    assessment as CompanyAssessment,
  )

  return {
    id: updated.id,
    assessment: updated.assessment,
    updatedAt: updated.updatedAt.toISOString(),
  }
}
