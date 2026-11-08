import type { TodayAttention } from '@/domain/tasks/todayAttention'

export type TodayAttentionQuerySnapshot = {
  dataBusinessId: string | null
  data: TodayAttention | null
  errorBusinessId: string | null
  error: Error | null
}

export type TodayAttentionQueryView = {
  data: TodayAttention | null
  error: Error | null
  isLoading: boolean
}

export function createTodayAttentionQuerySnapshot(): TodayAttentionQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: null,
    error: null,
  }
}

export function beginTodayAttentionQuery(): TodayAttentionQuerySnapshot {
  return createTodayAttentionQuerySnapshot()
}

export function succeedTodayAttentionQuery(
  businessId: string,
  data: TodayAttention,
): TodayAttentionQuerySnapshot {
  return {
    dataBusinessId: businessId,
    data,
    errorBusinessId: null,
    error: null,
  }
}

export function failTodayAttentionQuery(
  businessId: string,
  error: Error,
): TodayAttentionQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: businessId,
    error,
  }
}

export function selectTodayAttentionQueryView(
  snapshot: TodayAttentionQuerySnapshot,
  businessId: string | null,
): TodayAttentionQueryView {
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
