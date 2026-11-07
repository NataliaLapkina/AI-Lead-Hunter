import { ru } from '@/i18n/ru'

export const RESCHEDULED_TASK_STATUSES = ['TODO', 'IN_PROGRESS'] as const

export type RescheduledTaskStatus = (typeof RESCHEDULED_TASK_STATUSES)[number]

export type RescheduledTask = {
  id: string
  status: RescheduledTaskStatus
  dueAt: string
}

export type RescheduleTaskResult = {
  task: RescheduledTask
}

export class InvalidRescheduleTaskResponseError extends Error {
  constructor(message = 'Reschedule task response is malformed.') {
    super(message)
    this.name = 'InvalidRescheduleTaskResponseError'
  }
}

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidRescheduleTaskResponseError()
  }

  return value
}

function readStatus(value: unknown): RescheduledTaskStatus {
  if (value === 'TODO' || value === 'IN_PROGRESS') {
    return value
  }

  throw new InvalidRescheduleTaskResponseError()
}

function readDueAt(value: unknown): string {
  const dueAt = readNonEmptyString(value)
  if (!RFC3339_DATE_TIME.test(dueAt) || !Number.isFinite(Date.parse(dueAt))) {
    throw new InvalidRescheduleTaskResponseError()
  }

  return dueAt
}

export function parseRescheduleTaskResult(value: unknown): RescheduleTaskResult {
  if (!isRecord(value) || !isRecord(value.task)) {
    throw new InvalidRescheduleTaskResponseError()
  }

  return {
    task: {
      id: readNonEmptyString(value.task.id),
      status: readStatus(value.task.status),
      dueAt: readDueAt(value.task.dueAt),
    },
  }
}

function readBackendError(error: unknown): { status: number; code: string } | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  if (typeof error.code !== 'string') {
    return null
  }

  const status = 'status' in error && typeof error.status === 'number' ? error.status : 0
  return { status, code: error.code }
}

export function getRescheduleTaskErrorMessage(error: unknown): string {
  const backendError = readBackendError(error)
  if (backendError?.code === 'DUE_AT_NOT_IN_FUTURE') {
    return ru.today.reschedule.notInFuture
  }

  if (backendError?.code === 'TASK_STATUS_CONFLICT') {
    return ru.today.reschedule.statusConflict
  }

  if (
    backendError &&
    (backendError.status === 404 ||
      backendError.code === 'TASK_NOT_FOUND' ||
      backendError.code === 'BUSINESS_NOT_FOUND')
  ) {
    return ru.today.reschedule.notFound
  }

  return ru.today.reschedule.failed
}
