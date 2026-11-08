export const TODAY_ATTENTION_ITEM_LIMIT = 20

export type TodayAttentionCompanyDto = {
  id: string
  name: string
}

export type TodayAttentionDecisionDto = {
  id: string
  title: string
  status: string
}

export type TodayAttentionItemDto = {
  id: string
  completedAt: string
  completionOutcome: 'FOLLOW_UP'
  title: string
  company: TodayAttentionCompanyDto | null
  decision: TodayAttentionDecisionDto | null
}

export type TodayAttentionResponse = {
  items: TodayAttentionItemDto[]
}
