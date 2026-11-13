export const KNOWLEDGE_RECHECK_ITEM_LIMIT = 20

export type KnowledgeRecheckVerificationStatus = 'OUTDATED' | 'NEEDS_VERIFICATION'

export type KnowledgeRecheckType =
  | 'FACT'
  | 'OBSERVATION'
  | 'AI_INFERENCE'
  | 'USER_INFO'

export type KnowledgeRecheckCompanyDto = {
  id: string
  name: string
}

export type KnowledgeRecheckItemDto = {
  knowledgeId: string
  content: string
  type: KnowledgeRecheckType
  verificationStatus: KnowledgeRecheckVerificationStatus
  sourceLabel: string | null
  sourceUrl: string | null
  obtainedAt: string | null
  lastCheckedAt: string | null
  company: KnowledgeRecheckCompanyDto | null
}

export type KnowledgeRecheckResponse = {
  items: KnowledgeRecheckItemDto[]
}
