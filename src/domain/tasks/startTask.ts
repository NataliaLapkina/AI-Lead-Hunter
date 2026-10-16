import { ru } from '@/i18n/ru'

export type StartedTask = {
  id: string
  status: 'IN_PROGRESS'
}

export type StartTaskResult = {
  task: StartedTask
}

export class InvalidStartTaskResponseError extends Error {
  constructor(message = 'Start task response is malformed.') {
    super(message)
    this.name = 'InvalidStartTaskResponseError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidStartTaskResponseError()
  }

  return value
}

function readStartedStatus(value: unknown): 'IN_PROGRESS' {
  if (value !== 'IN_PROGRESS') {
    throw new InvalidStartTaskResponseError()
  }

  return 'IN_PROGRESS'
}

export function parseStartTaskResult(value: unknown): StartTaskResult {
  if (!isRecord(value) || !isRecord(value.task)) {
    throw new InvalidStartTaskResponseError()
  }

  return {
    task: {
      id: readNonEmptyString(value.task.id),
      status: readStartedStatus(value.task.status),
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

export function getStartTaskErrorMessage(error: unknown): string {
  const backendError = readBackendError(error)
  if (backendError?.code === 'TASK_STATUS_CONFLICT') {
    return ru.today.taskActions.statusConflict
  }

  if (
    backendError &&
    (backendError.status === 404 ||
      backendError.code === 'TASK_NOT_FOUND' ||
      backendError.code === 'BUSINESS_NOT_FOUND')
  ) {
    return ru.today.taskActions.notFound
  }

  return ru.today.actionFailed
}
