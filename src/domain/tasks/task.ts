import { countCodePoints } from '@/domain/recommendations/recommendationActions'
import { ru } from '@/i18n/ru'

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const

export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]

export type CreatedTask = {
  id: string
  businessId: string
  companyId: string | null
  decisionId: string
  title: string
  description: string | null
  dueAt: string | null
  priority: TaskPriority
  status: TaskStatus
  assignedToId: string | null
  createdById: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateTaskFromDecisionResult = {
  task: CreatedTask
}

export type CreateTaskFromDecisionCommand = {
  createdById: string
  title: string
  dueAt: string
  priority: TaskPriority
}

export class InvalidCreateTaskResponseError extends Error {
  constructor(message = 'Create Task response is malformed.') {
    super(message)
    this.name = 'InvalidCreateTaskResponseError'
  }
}

const MAX_TASK_TITLE_LENGTH = 500
const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i

const CREATE_TASK_ERROR_CODES = {
  INVALID_CREATED_BY_ID: ru.today.actionErrors.invalidDecidedById,
  INVALID_TASK_TITLE: ru.today.invalidTaskTitle,
  INVALID_DUE_AT: ru.today.invalidTaskDueAt,
  DUE_AT_NOT_IN_FUTURE: ru.today.invalidTaskDueAt,
  INVALID_TASK_PRIORITY: ru.today.actionErrors.invalidTaskPriority,
  BUSINESS_NOT_FOUND: ru.today.actionErrors.businessNotFound,
  DECISION_NOT_FOUND: ru.today.actionErrors.decisionNotFound,
  USER_NOT_FOUND: ru.today.actionErrors.userNotFound,
  USER_NOT_BUSINESS_MEMBER: ru.today.actionErrors.userNotMember,
  DECISION_STATUS_CONFLICT: ru.today.actionErrors.decisionStatusConflict,
  DECISION_COMPANY_CONFLICT: ru.today.actionErrors.decisionCompanyConflict,
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1] ?? 0
}

function isValidRfc3339DateTime(value: string): boolean {
  const match = RFC3339_DATE_TIME.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false
  }

  return Number.isFinite(Date.parse(value))
}

function readNonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidCreateTaskResponseError()
  }

  return value
}

function readNullableString(value: unknown): string | null {
  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new InvalidCreateTaskResponseError()
  }
  return value
}

function readNullableId(value: unknown): string | null {
  if (value === null) {
    return null
  }

  return readNonEmptyString(value)
}

function readDateTime(value: unknown): string {
  const dateTime = readNonEmptyString(value)
  if (!isValidRfc3339DateTime(dateTime)) {
    throw new InvalidCreateTaskResponseError()
  }
  return dateTime
}

function readNullableDateTime(value: unknown): string | null {
  return value === null ? null : readDateTime(value)
}

function readTaskPriority(value: unknown): TaskPriority {
  const priority = parseTaskPriority(value)
  if (!priority) throw new InvalidCreateTaskResponseError()
  return priority
}

function readTaskStatus(value: unknown): TaskStatus {
  if (!TASK_STATUSES.includes(value as TaskStatus)) {
    throw new InvalidCreateTaskResponseError()
  }
  return value as TaskStatus
}

export function parseTaskTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const title = value.trim()
  const characterCount = countCodePoints(title)

  if (characterCount < 1 || characterCount > MAX_TASK_TITLE_LENGTH) {
    return null
  }

  return title
}

export function parseTaskPriority(value: unknown): TaskPriority | null {
  if (typeof value !== 'string') {
    return null
  }

  for (const candidate of TASK_PRIORITIES) {
    if (candidate === value) {
      return candidate
    }
  }

  return null
}

export function createTaskFromDecisionPath(
  businessId: string,
  decisionId: string,
): string {
  return `/api/v1/businesses/${encodeURIComponent(businessId)}/decisions/${encodeURIComponent(decisionId)}/tasks`
}

export function parseCreatedTask(value: unknown): CreatedTask {
  if (!isRecord(value)) {
    throw new InvalidCreateTaskResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    businessId: readNonEmptyString(value.businessId),
    companyId: readNullableId(value.companyId),
    decisionId: readNonEmptyString(value.decisionId),
    title: readNonEmptyString(value.title),
    description: readNullableString(value.description),
    dueAt: readNullableDateTime(value.dueAt),
    priority: readTaskPriority(value.priority),
    status: readTaskStatus(value.status),
    assignedToId: readNullableId(value.assignedToId),
    createdById: readNonEmptyString(value.createdById),
    completedAt: readNullableDateTime(value.completedAt),
    createdAt: readDateTime(value.createdAt),
    updatedAt: readDateTime(value.updatedAt),
  }
}

export function parseCreateTaskFromDecisionResult(
  value: unknown,
): CreateTaskFromDecisionResult {
  if (!isRecord(value)) {
    throw new InvalidCreateTaskResponseError()
  }

  return {
    task: parseCreatedTask(value.task),
  }
}

function readErrorCode(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code
  }

  return null
}

export function getCreateTaskErrorMessage(error: unknown): string {
  if (
    error instanceof InvalidCreateTaskResponseError ||
    (error instanceof Error && error.name === 'InvalidCreateTaskResponseError')
  ) {
    return ru.today.actionFailed
  }

  const code = readErrorCode(error)
  if (code && code in CREATE_TASK_ERROR_CODES) {
    return CREATE_TASK_ERROR_CODES[code as keyof typeof CREATE_TASK_ERROR_CODES]
  }

  return ru.today.actionFailed
}
