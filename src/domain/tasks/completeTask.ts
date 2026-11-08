import { ru } from '@/i18n/ru'

export const TASK_COMPLETION_OUTCOMES = [
  'CONTACTED',
  'NO_RESPONSE',
  'FOLLOW_UP',
  'DECLINED',
  'OTHER',
] as const

export type TaskCompletionOutcome = (typeof TASK_COMPLETION_OUTCOMES)[number]

export type CompletedTask = {
  id: string
  status: 'DONE'
  completedAt: string
  completionOutcome: TaskCompletionOutcome
  completionComment: string | null
}

export type CompleteTaskResult = {
  task: CompletedTask
}

export class InvalidCompleteTaskResponseError extends Error {
  constructor(message = 'Complete task response is malformed.') {
    super(message)
    this.name = 'InvalidCompleteTaskResponseError'
  }
}

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidCompleteTaskResponseError()
  }

  return value
}

function readOutcome(value: unknown): TaskCompletionOutcome {
  if (
    value === 'CONTACTED' ||
    value === 'NO_RESPONSE' ||
    value === 'FOLLOW_UP' ||
    value === 'DECLINED' ||
    value === 'OTHER'
  ) {
    return value
  }

  throw new InvalidCompleteTaskResponseError()
}

function readCompletedAt(value: unknown): string {
  const completedAt = readNonEmptyString(value)
  if (!RFC3339_DATE_TIME.test(completedAt) || !Number.isFinite(Date.parse(completedAt))) {
    throw new InvalidCompleteTaskResponseError()
  }

  return completedAt
}

function readComment(value: unknown): string | null {
  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new InvalidCompleteTaskResponseError()
  }

  return value
}

export function parseCompleteTaskResult(value: unknown): CompleteTaskResult {
  if (!isRecord(value) || !isRecord(value.task)) {
    throw new InvalidCompleteTaskResponseError()
  }

  if (value.task.status !== 'DONE') {
    throw new InvalidCompleteTaskResponseError()
  }

  return {
    task: {
      id: readNonEmptyString(value.task.id),
      status: 'DONE',
      completedAt: readCompletedAt(value.task.completedAt),
      completionOutcome: readOutcome(value.task.completionOutcome),
      completionComment: readComment(value.task.completionComment),
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

export function getCompleteTaskErrorMessage(error: unknown): string {
  const backendError = readBackendError(error)
  if (backendError?.code === 'COMMENT_REQUIRED') {
    return ru.today.complete.commentRequired
  }

  if (backendError?.code === 'INVALID_OUTCOME') {
    return ru.today.complete.invalidOutcome
  }

  if (backendError?.code === 'INVALID_COMMENT') {
    return ru.today.complete.invalidComment
  }

  if (backendError?.code === 'TASK_STATUS_CONFLICT') {
    return ru.today.complete.statusConflict
  }

  if (
    backendError &&
    (backendError.status === 404 ||
      backendError.code === 'TASK_NOT_FOUND' ||
      backendError.code === 'BUSINESS_NOT_FOUND')
  ) {
    return ru.today.complete.notFound
  }

  return ru.today.complete.failed
}
