import type { TodayTasks } from '@/domain/tasks/todayTask'

export type TodayTasksQuerySnapshot = {
  dataBusinessId: string | null
  data: TodayTasks | null
  errorBusinessId: string | null
  error: Error | null
}

export type TodayTasksQueryView = {
  data: TodayTasks | null
  error: Error | null
  isLoading: boolean
}

export function createTodayTasksQuerySnapshot(): TodayTasksQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: null,
    error: null,
  }
}

export function beginTodayTasksQuery(): TodayTasksQuerySnapshot {
  return createTodayTasksQuerySnapshot()
}

export function succeedTodayTasksQuery(
  businessId: string,
  data: TodayTasks,
): TodayTasksQuerySnapshot {
  return {
    dataBusinessId: businessId,
    data,
    errorBusinessId: null,
    error: null,
  }
}

export function failTodayTasksQuery(
  businessId: string,
  error: Error,
): TodayTasksQuerySnapshot {
  return {
    dataBusinessId: null,
    data: null,
    errorBusinessId: businessId,
    error,
  }
}

export function selectTodayTasksQueryView(
  snapshot: TodayTasksQuerySnapshot,
  businessId: string | null,
): TodayTasksQueryView {
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
