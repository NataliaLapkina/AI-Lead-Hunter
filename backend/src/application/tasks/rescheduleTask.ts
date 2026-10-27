import { TaskStatus } from '@prisma/client'
import type { RescheduleTaskResult } from '../../domain/tasks/rescheduleTaskResult.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import { findBusinessById } from '../../infrastructure/companies/companyRepository.js'
import {
  findTaskRescheduleContextInBusiness,
  tryRescheduleTaskAtomic,
  type RescheduledTaskRow,
} from '../../infrastructure/tasks/taskRepository.js'

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/i

export class InvalidDueAtError extends Error {
  constructor() {
    super('Invalid dueAt.')
    this.name = 'InvalidDueAtError'
  }
}

export class DueAtNotInFutureError extends Error {
  constructor() {
    super('dueAt must be in the future.')
    this.name = 'DueAtNotInFutureError'
  }
}

export class TaskNotFoundError extends Error {
  constructor() {
    super('Task not found.')
    this.name = 'TaskNotFoundError'
  }
}

export class TaskStatusConflictError extends Error {
  constructor() {
    super('Task cannot be rescheduled from its current status.')
    this.name = 'TaskStatusConflictError'
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] ?? 0
}

function parseDueAt(value: unknown, now: () => number): Date {
  if (typeof value !== 'string') {
    throw new InvalidDueAtError()
  }

  const match = RFC3339_DATE_TIME.exec(value)
  if (!match) {
    throw new InvalidDueAtError()
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = match[10] === undefined ? 0 : Number(match[10])
  const offsetMinute = match[11] === undefined ? 0 : Number(match[11])

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    throw new InvalidDueAtError()
  }

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    throw new InvalidDueAtError()
  }

  const dueAt = new Date(timestamp)
  if (dueAt.getTime() <= now()) {
    throw new DueAtNotInFutureError()
  }

  return dueAt
}

function isReschedulableStatus(status: TaskStatus): boolean {
  return status === TaskStatus.TODO || status === TaskStatus.IN_PROGRESS
}

function toResult(task: RescheduledTaskRow): RescheduleTaskResult {
  return {
    task: {
      id: task.id,
      status: task.status,
      dueAt: task.dueAt.toISOString(),
    },
  }
}

async function validateFailedReschedule(
  businessId: string,
  taskId: string,
  dueAt: Date,
  now: () => number,
): Promise<void> {
  const task = await findTaskRescheduleContextInBusiness(businessId, taskId)

  if (!task) {
    throw new TaskNotFoundError()
  }

  if (!isReschedulableStatus(task.status)) {
    throw new TaskStatusConflictError()
  }

  if (dueAt.getTime() <= now()) {
    throw new DueAtNotInFutureError()
  }
}

export type RescheduleTaskDependencies = {
  now?: () => number
}

export function createRescheduleTask(dependencies: RescheduleTaskDependencies = {}) {
  const now = dependencies.now ?? Date.now

  return async function rescheduleTask(input: {
    businessId: string
    taskId: string
    dueAt: unknown
  }): Promise<RescheduleTaskResult> {
    const dueAt = parseDueAt(input.dueAt, now)
    const business = await findBusinessById(input.businessId)

    if (!business) {
      throw new BusinessNotFoundError()
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const updated = await tryRescheduleTaskAtomic(
        input.businessId,
        input.taskId,
        dueAt,
      )

      if (updated) {
        return toResult(updated)
      }

      await validateFailedReschedule(input.businessId, input.taskId, dueAt, now)
    }

    throw new Error('Task reschedule failed due to a concurrent change.')
  }
}
