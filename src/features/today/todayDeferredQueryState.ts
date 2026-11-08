import type { TodayDeferred } from '@/domain/recommendations/todayDeferred'

export type TodayDeferredQuerySnapshot = {
  dataBusinessId: string | null
  data: TodayDeferred | null
  errorBusinessId: string | null
  error: Error | null
}

export type TodayDeferredQueryView = {
  data: TodayDeferred | null
  error: Error | null
  isLoading: boolean
}

export function createTodayDeferredQuerySnapshot(): TodayDeferredQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: null,
    error: null,
  }
}

export function beginTodayDeferredQuery(): TodayDeferredQuerySnapshot {
  return createTodayDeferredQuerySnapshot()
}

export function succeedTodayDeferredQuery(
  businessId: string,
  data: TodayDeferred,
): TodayDeferredQuerySnapshot {
  return {
    dataBusinessId: businessId,
    data,
    errorBusinessId: null,
    error: null,
  }
}

export function failTodayDeferredQuery(
  businessId: string,
  error: Error,
): TodayDeferredQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: businessId,
    error,
  }
}

export function selectTodayDeferredQueryView(
  snapshot: TodayDeferredQuerySnapshot,
  businessId: string | null,
): TodayDeferredQueryView {
  if (businessId === null) {
    return {
      data: null,
      error: null,
      isLoading: false,
    }
  }

  const data = snapshot.dataBusinessId === businessId ? snapshot.data : null
  const error = snapshot.errorBusinessId === businessId ? snapshot.error : null

  return {
    data,
    error,
    isLoading: data === null && error === null,
  }
}
