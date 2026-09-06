import type { CompanyListItem } from '../../domain/companies/companyListItem.js'
import {
  findBusinessById,
  findWorkingCompaniesByBusinessId,
} from '../../infrastructure/companies/companyRepository.js'

export class BusinessNotFoundError extends Error {
  constructor() {
    super('Business not found.')
    this.name = 'BusinessNotFoundError'
  }
}

export async function listCompanies(
  businessId: string,
): Promise<CompanyListItem[]> {
  const business = await findBusinessById(businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  const companies = await findWorkingCompaniesByBusinessId(businessId)

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    website: company.website,
    niche: company.niche,
    city: company.city,
    assessment: company.assessment,
    interactionStage: company.interactionStage,
    workState: company.workState,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  }))
}
