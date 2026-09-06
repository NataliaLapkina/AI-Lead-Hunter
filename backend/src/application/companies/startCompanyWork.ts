import { CompanyAssessment, CompanyWorkState } from '@prisma/client'
import type { CompanyWorkStartResult } from '../../domain/companies/companyWorkStartResult.js'
import { BusinessNotFoundError } from './listCompanies.js'
import { CompanyNotFoundError } from './updateCompanyAssessment.js'
import {
  findBusinessById,
  findCompanyWorkContextInBusiness,
  tryStartCompanyWorkAtomic,
} from '../../infrastructure/companies/companyRepository.js'

export class CompanyNotSuitableForWorkError extends Error {
  constructor() {
    super('Company must be suitable before work can be started.')
    this.name = 'CompanyNotSuitableForWorkError'
  }
}

export class CompanyWorkStateConflictError extends Error {
  constructor() {
    super('Company work cannot be started from its current state.')
    this.name = 'CompanyWorkStateConflictError'
  }
}

function toWorkStartResult(company: {
  id: string
  workState: CompanyWorkState
  updatedAt: Date
}): CompanyWorkStartResult {
  return {
    id: company.id,
    workState: company.workState,
    updatedAt: company.updatedAt.toISOString(),
  }
}

function resolveAfterUnchangedState(company: {
  id: string
  assessment: CompanyAssessment
  workState: CompanyWorkState
  updatedAt: Date
}): CompanyWorkStartResult {
  if (company.workState === CompanyWorkState.ACTIVE) {
    return toWorkStartResult(company)
  }

  if (company.assessment !== CompanyAssessment.SUITABLE) {
    throw new CompanyNotSuitableForWorkError()
  }

  if (
    company.workState === CompanyWorkState.PAUSED ||
    company.workState === CompanyWorkState.COMPLETED ||
    company.workState === CompanyWorkState.ARCHIVED
  ) {
    throw new CompanyWorkStateConflictError()
  }

  throw new CompanyWorkStateConflictError()
}

export async function startCompanyWork(input: {
  businessId: string
  companyId: string
}): Promise<CompanyWorkStartResult> {
  const business = await findBusinessById(input.businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  const started = await tryStartCompanyWorkAtomic(
    input.businessId,
    input.companyId,
  )

  if (started) {
    return toWorkStartResult(started)
  }

  const company = await findCompanyWorkContextInBusiness(
    input.businessId,
    input.companyId,
  )

  if (!company) {
    throw new CompanyNotFoundError()
  }

  return resolveAfterUnchangedState(company)
}
