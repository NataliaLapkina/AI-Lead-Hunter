import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '@/domain/tasks/task'

export const TODAY_TASK_DECISION_STATUSES = [
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'SUPERSEDED',
] as const

export type TodayTaskDecisionStatus = (typeof TODAY_TASK_DECISION_STATUSES)[number]

export type TodayTaskCompany = {
  id: string
  name: string
}

export type TodayTaskDecision = {
  id: string
  title: string
  status: TodayTaskDecisionStatus
}

export type TodayTask = {
  id: string
  title: string
  status: TaskStatus
  dueAt: string
  priority: TaskPriority
  isOverdue: boolean
  company: TodayTaskCompany | null
  decision: TodayTaskDecision | null
}

export type TodayTasks = {
  tasks: TodayTask[]
}

export class InvalidTodayTasksResponseError extends Error {
  constructor(message = 'Today tasks response is malformed.') {
    super(message)
    this.name = 'InvalidTodayTasksResponseError'
  }
}

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i

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

function readNonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidTodayTasksResponseError()
  }

  return value
}

function readAllowed<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string') {
    throw new InvalidTodayTasksResponseError()
  }

  for (const candidate of allowed) {
    if (candidate === value) {
      return candidate
    }
  }

  throw new InvalidTodayTasksResponseError()
}

function readDueAt(value: unknown): string {
  const dueAt = readNonEmptyString(value)
  const match = RFC3339_DATE_TIME.exec(dueAt)
  if (!match) {
    throw new InvalidTodayTasksResponseError()
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
    second > 59 ||
    !Number.isFinite(Date.parse(dueAt))
  ) {
    throw new InvalidTodayTasksResponseError()
  }

  return dueAt
}

function readBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new InvalidTodayTasksResponseError()
  }

  return value
}

function parseCompany(value: unknown): TodayTaskCompany | null {
  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    throw new InvalidTodayTasksResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    name: readNonEmptyString(value.name),
  }
}

function parseDecision(value: unknown): TodayTaskDecision | null {
  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    throw new InvalidTodayTasksResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    title: readNonEmptyString(value.title),
    status: readAllowed(value.status, TODAY_TASK_DECISION_STATUSES),
  }
}

function parseTodayTask(value: unknown): TodayTask {
  if (!isRecord(value)) {
    throw new InvalidTodayTasksResponseError()
  }

  return {
    id: readNonEmptyString(value.id),
    title: readNonEmptyString(value.title),
    status: readAllowed(value.status, TASK_STATUSES),
    dueAt: readDueAt(value.dueAt),
    priority: readAllowed(value.priority, TASK_PRIORITIES),
    isOverdue: readBoolean(value.isOverdue),
    company: parseCompany(value.company),
    decision: parseDecision(value.decision),
  }
}

export function parseTodayTasks(value: unknown): TodayTasks {
  if (!isRecord(value) || !Array.isArray(value.tasks)) {
    throw new InvalidTodayTasksResponseError()
  }

  return {
    tasks: value.tasks.map(parseTodayTask),
  }
}
