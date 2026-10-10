import { parseTodayTasks, type TodayTasks } from '@/domain/tasks/todayTask'
import { apiGet } from '@/services/api/apiClient'

export function todayTasksPath(businessId: string, timeZone: string): string {
  const params = new URLSearchParams({ timezone: timeZone })
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/today/tasks?${params.toString()}`
}

export async function listTodayTasks(
  businessId: string,
  timeZone: string,
  options?: { signal?: AbortSignal },
): Promise<TodayTasks> {
  const data = await apiGet<unknown>(todayTasksPath(businessId, timeZone), options)

  return parseTodayTasks(data)
}
