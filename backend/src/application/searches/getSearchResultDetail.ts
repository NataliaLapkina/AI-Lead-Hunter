import type { SearchResultDetailResponseDto } from '../../domain/searches/searchResultDetailResponse.js'
import { groupKnowledgeForDetail } from '../../domain/searches/searchResultDetailPresentation.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import { SearchNotFoundError } from './listSearchResults.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findSearchDetailInBusiness,
  findSearchResultDetailInBusiness,
  findTargetProfileInBusiness,
} from '../../infrastructure/searches/searchRepository.js'

export class SearchResultNotFoundError extends Error {
  constructor() {
    super('Search result not found.')
    this.name = 'SearchResultNotFoundError'
  }
}

function mapContactPoint(point: {
  id: string
  type: string
  value: string
  verificationStatus: string
  isPrimary: boolean
  sourceType: string | null
  sourceLabel: string | null
  sourceUrl: string | null
}) {
  return {
    id: point.id,
    type: point.type,
    value: point.value,
    verificationStatus: point.verificationStatus,
    isPrimary: point.isPrimary,
    sourceType: point.sourceType,
    sourceLabel: point.sourceLabel,
    sourceUrl: point.sourceUrl,
  }
}

function isCompanyScopedPoint(
  point: { companyId: string },
  companyId: string,
): boolean {
  return point.companyId === companyId
}

export async function getSearchResultDetail(input: {
  businessId: string
  searchId: string
  searchResultId: string
}): Promise<SearchResultDetailResponseDto> {
  const business = await findBusinessById(input.businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  const search = await findSearchDetailInBusiness(
    input.businessId,
    input.searchId,
  )

  if (!search) {
    throw new SearchNotFoundError()
  }

  const row = await findSearchResultDetailInBusiness(
    input.businessId,
    search.id,
    input.searchResultId,
  )

  if (!row) {
    throw new SearchResultNotFoundError()
  }

  let targetProfile: { id: string; name: string } | null = null

  if (search.targetProfileId) {
    targetProfile = await findTargetProfileInBusiness(
      input.businessId,
      search.targetProfileId,
    )
  }

  return {
    search: {
      id: search.id,
      name: search.name,
      status: search.status,
      targetProfile,
    },
    searchResult: {
      id: row.id,
      source: row.source,
      sourceUrl: row.sourceUrl,
      foundAt: row.foundAt.toISOString(),
    },
    company: {
      id: row.company.id,
      name: row.company.name,
      niche: row.company.niche,
      city: row.company.city,
      region: row.company.region,
      country: row.company.country,
      website: row.company.website,
      assessment: row.company.assessment,
      workState: row.company.workState,
    },
    companyContactPoints: row.company.contactPoints
      .filter(
        (point) =>
          isCompanyScopedPoint(point, row.company.id) && point.contactId === null,
      )
      .map(mapContactPoint),
    contacts: row.company.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      position: contact.position,
      contactPoints: contact.contactPoints
        .filter(
          (point) =>
            isCompanyScopedPoint(point, row.company.id) &&
            point.contactId === contact.id,
        )
        .map(mapContactPoint),
    })),
    knowledge: groupKnowledgeForDetail(row.company.knowledge),
  }
}
