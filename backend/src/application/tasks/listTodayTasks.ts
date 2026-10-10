import type { TodayTasksResponse } from '../../domain/tasks/todayTasksResponse.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findOpenTasksDueBefore,
  type OpenTaskDueRecord,
} from '../../infrastructure/tasks/taskRepository.js'
import {
  isValidIanaTimeZone,
  resolveTodayTaskWindow,
} from './todayTaskWindow.js'

export class InvalidTimeZoneError extends Error {
  constructor() {
    super('Invalid timezone.')
    this.name = 'InvalidTimeZoneError'
  }
}

export class BusinessNotFoundError extends Error {
  constructor() {
    super('Business not found.')
    this.name = 'BusinessNotFoundError'
  }
}

const MAX_TIME_ZONE_LENGTH = 100

export function parseTimeZone(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidTimeZoneError()
  }

  const timeZone = value.trim()
  if (timeZone.length === 0 || timeZone.length > MAX_TIME_ZONE_LENGTH) {
    throw new InvalidTimeZoneError()
  }

  if (!isValidIanaTimeZone(timeZone)) {
    throw new InvalidTimeZoneError()
  }

  return timeZone
}

function toCompany(
  company: OpenTaskDueRecord['company'],
): TodayTasksResponse['tasks'][number]['company'] {
  if (!company) {
    return null
  }

  return {
    id: company.id,
    name: company.name,
  }
}

function toDecision(
  decision: OpenTaskDueRecord['decision'],
): TodayTasksResponse['tasks'][number]['decision'] {
  if (!decision) {
    return null
  }

  return {
    id: decision.id,
    title: decision.title,
    status: decision.status,
  }
}

export type ListTodayTasksDependencies = {
  now?: () => Date
}

export function createListTodayTasks(
  dependencies: ListTodayTasksDependencies = {},
) {
  const now = dependencies.now ?? (() => new Date())

  return async function listTodayTasks(
    businessId: string,
    timeZoneInput: unknown,
  ): Promise<TodayTasksResponse> {
    const timeZone = parseTimeZone(timeZoneInput)
    const business = await findBusinessById(businessId)

    if (!business) {
      throw new BusinessNotFoundError()
    }

    const { startOfToday, startOfTomorrow } = resolveTodayTaskWindow(
      now(),
      timeZone,
    )
    const tasks = await findOpenTasksDueBefore(businessId, startOfTomorrow)

    return {
      tasks: tasks
        .filter((task) => task.dueAt.getTime() < startOfTomorrow.getTime())
        .map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          dueAt: task.dueAt.toISOString(),
          priority: task.priority,
          isOverdue: task.dueAt.getTime() < startOfToday.getTime(),
          company: toCompany(task.company),
          decision: toDecision(task.decision),
        })),
    }
  }
}

export const listTodayTasks = createListTodayTasks()
