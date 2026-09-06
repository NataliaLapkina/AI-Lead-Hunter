export type SearchDetailTargetProfileDto = {
  id: string
  name: string
}

export type SearchDetailSearchDto = {
  id: string
  name: string
  status: string
  targetProfile: SearchDetailTargetProfileDto | null
}

export type SearchDetailSearchResultDto = {
  id: string
  source: string
  sourceUrl: string | null
  foundAt: string
}

export type SearchDetailCompanyDto = {
  id: string
  name: string
  niche: string | null
  city: string | null
  region: string | null
  country: string | null
  website: string | null
  assessment: string
  workState: string
}

export type SearchDetailContactPointDto = {
  id: string
  type: string
  value: string
  verificationStatus: string
  isPrimary: boolean
  sourceType: string | null
  sourceLabel: string | null
  sourceUrl: string | null
}

export type SearchDetailContactDto = {
  id: string
  name: string
  position: string | null
  contactPoints: SearchDetailContactPointDto[]
}

export type SearchDetailKnowledgeItemDto = {
  id: string
  content: string
  type: string
  verificationStatus: string
  sourceType: string | null
  sourceLabel: string | null
  sourceUrl: string | null
  obtainedAt: string | null
  lastCheckedAt: string | null
}

export type SearchDetailKnowledgeGroupsDto = {
  confirmed: SearchDetailKnowledgeItemDto[]
  observations: SearchDetailKnowledgeItemDto[]
  aiInferences: SearchDetailKnowledgeItemDto[]
  needsVerification: SearchDetailKnowledgeItemDto[]
}

export type SearchResultDetailResponseDto = {
  search: SearchDetailSearchDto
  searchResult: SearchDetailSearchResultDto
  company: SearchDetailCompanyDto
  companyContactPoints: SearchDetailContactPointDto[]
  contacts: SearchDetailContactDto[]
  knowledge: SearchDetailKnowledgeGroupsDto
}
