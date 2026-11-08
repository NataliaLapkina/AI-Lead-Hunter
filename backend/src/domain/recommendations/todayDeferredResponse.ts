export const TODAY_DEFERRED_ITEM_LIMIT = 20

export type TodayDeferredStatus = 'NEW' | 'VIEWED'

export type TodayDeferredCompanyDto = {
  id: string
  name: string
}

export type TodayDeferredItemDto = {
  id: string
  title: string
  status: TodayDeferredStatus
  snoozedUntil: string
  company: TodayDeferredCompanyDto | null
}

export type TodayDeferredResponse = {
  items: TodayDeferredItemDto[]
}
