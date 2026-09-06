export type SearchSummaryDto = {
  id: string
  name: string
  status: string
  startedAt: string | null
  finishedAt: string | null
}

export type CompanyContactabilityDto = {
  website: boolean
  email: boolean
  phone: boolean
  vk: boolean
  telegram: boolean
}

export type SearchResultCompanyDto = {
  id: string
  name: string
  niche: string | null
  city: string | null
  website: string | null
  assessment: string
  workState: string
  contactability: CompanyContactabilityDto
  whyInteresting: string[]
  needsVerification: string[]
}

export type SearchResultItemDto = {
  id: string
  source: string
  sourceUrl: string | null
  foundAt: string
  company: SearchResultCompanyDto
}

export type SearchResultsResponseDto = {
  search: SearchSummaryDto
  results: SearchResultItemDto[]
}
