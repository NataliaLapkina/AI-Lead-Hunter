import type { SearchResultsResponseDto } from '../../domain/searches/searchResultsResponse.js'
import {
  buildContactability,
  mapKnowledgePanels,
} from '../../domain/searches/searchResultPresentation.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findSearchInBusiness,
  findSearchResultsWithCompanyContext,
} from '../../infrastructure/searches/searchRepository.js'

export class SearchNotFoundError extends Error {
  constructor() {
    super('Search not found.')
    this.name = 'SearchNotFoundError'
  }
}

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

export async function listSearchResults(input: {
  businessId: string
  searchId: string
}): Promise<SearchResultsResponseDto> {
  const business = await findBusinessById(input.businessId)

  if (!business) {
    throw new BusinessNotFoundError()
  }

  const search = await findSearchInBusiness(input.businessId, input.searchId)

  if (!search) {
    throw new SearchNotFoundError()
  }

  const rows = await findSearchResultsWithCompanyContext(
    input.businessId,
    search.id,
  )

  return {
    search: {
      id: search.id,
      name: search.name,
      status: search.status,
      startedAt: toIsoOrNull(search.startedAt),
      finishedAt: toIsoOrNull(search.finishedAt),
    },
    results: rows.map((row) => {
      const { whyInteresting, needsVerification } = mapKnowledgePanels(
        row.company.knowledge,
      )

      return {
        id: row.id,
        source: row.source,
        sourceUrl: row.sourceUrl,
        foundAt: row.foundAt.toISOString(),
        company: {
          id: row.company.id,
          name: row.company.name,
          niche: row.company.niche,
          city: row.company.city,
          website: row.company.website,
          assessment: row.company.assessment,
          workState: row.company.workState,
          contactability: buildContactability({
            website: row.company.website,
            contactPointTypes: row.company.contactPoints.map(
              (point) => point.type,
            ),
          }),
          whyInteresting,
          needsVerification,
        },
      }
    }),
  }
}
