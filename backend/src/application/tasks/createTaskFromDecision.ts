import { DecisionStatus, TaskPriority } from '@prisma/client'
import type { CreateTaskFromDecisionResult } from '../../domain/tasks/createTaskFromDecisionResult.js'
import {
  runCreateTaskFromDecisionTransaction,
  type TaskRow,
  type TaskTransactionRepository,
} from '../../infrastructure/tasks/taskRepository.js'
import { BusinessNotFoundError } from '../companies/listCompanies.js'
import {
  UserNotBusinessMemberError,
  UserNotFoundError,
} from '../recommendations/acceptRecommendation.js'

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/i

const TASK_PRIORITIES = new Set<string>(Object.values(TaskPriority))

export class InvalidCreatedByIdError extends Error {
  constructor() {
    super('Invalid createdById.')
    this.name = 'InvalidCreatedByIdError'
  }
}

export class InvalidTaskTitleError extends Error {
  constructor() {
    super('Invalid title.')
    this.name = 'InvalidTaskTitleError'
  }
}

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

export class InvalidTaskPriorityError extends Error {
  constructor() {
    super('Invalid priority.')
    this.name = 'InvalidTaskPriorityError'
  }
}

export class DecisionNotFoundError extends Error {
  constructor() {
    super('Decision not found.')
    this.name = 'DecisionNotFoundError'
  }
}

export class DecisionStatusConflictError extends Error {
  constructor() {
    super('Task cannot be created from this Decision status.')
    this.name = 'DecisionStatusConflictError'
  }
}

export class DecisionCompanyConflictError extends Error {
  constructor() {
    super('Decision company does not belong to this business.')
    this.name = 'DecisionCompanyConflictError'
  }
}

function parseCreatedById(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidCreatedByIdError()
  }

  const createdById = value.trim()
  if (createdById.length === 0) {
    throw new InvalidCreatedByIdError()
  }

  return createdById
}

function parseTaskTitle(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidTaskTitleError()
  }

  const title = value.trim()
  const characterCount = Array.from(title).length

  if (characterCount < 1 || characterCount > 500) {
    throw new InvalidTaskTitleError()
  }

  return title
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

function parseTaskPriority(value: unknown): TaskPriority {
  if (value === undefined) {
    return TaskPriority.MEDIUM
  }

  if (typeof value !== 'string' || !TASK_PRIORITIES.has(value)) {
    throw new InvalidTaskPriorityError()
  }

  return value as TaskPriority
}

function toResult(task: TaskRow): CreateTaskFromDecisionResult {
  return {
    task: {
      id: task.id,
      businessId: task.businessId,
      companyId: task.companyId,
      decisionId: task.decisionId as string,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt?.toISOString() ?? null,
      priority: task.priority,
      status: task.status,
      assignedToId: task.assignedToId,
      createdById: task.createdById,
      completedAt: task.completedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    },
  }
}

export type CreateTaskFromDecisionCommand = {
  businessId: string
  decisionId: string
  createdById: unknown
  title: unknown
  dueAt: unknown
  priority: unknown
}

export type CreateTaskFromDecisionDependencies = {
  now?: () => number
  runTransaction?: <T>(
    operation: (repository: TaskTransactionRepository) => Promise<T>,
  ) => Promise<T>
}

export function createCreateTaskFromDecision(
  dependencies: CreateTaskFromDecisionDependencies = {},
) {
  const now = dependencies.now ?? Date.now
  const runTransaction =
    dependencies.runTransaction ?? runCreateTaskFromDecisionTransaction

  return async function createTaskFromDecision(
    command: CreateTaskFromDecisionCommand,
  ): Promise<CreateTaskFromDecisionResult> {
    const createdById = parseCreatedById(command.createdById)
    const title = parseTaskTitle(command.title)
    const dueAt = parseDueAt(command.dueAt, now)
    const priority = parseTaskPriority(command.priority)

    return runTransaction(async (repository) => {
      if (!(await repository.businessExists(command.businessId))) {
        throw new BusinessNotFoundError()
      }

      if (!(await repository.lockUser(createdById))) {
        throw new UserNotFoundError()
      }

      if (!(await repository.lockMembership(command.businessId, createdById))) {
        throw new UserNotBusinessMemberError()
      }

      const decision = await repository.lockDecision(
        command.businessId,
        command.decisionId,
      )

      if (!decision) {
        throw new DecisionNotFoundError()
      }

      if (decision.status !== DecisionStatus.ACTIVE) {
        throw new DecisionStatusConflictError()
      }

      if (
        decision.companyId &&
        !(await repository.lockCompanyInBusiness(command.businessId, decision.companyId))
      ) {
        throw new DecisionCompanyConflictError()
      }

      const existingOpenTask = await repository.findOpenTask(
        command.businessId,
        decision.id,
      )

      if (existingOpenTask) {
        return toResult(existingOpenTask)
      }

      if (dueAt.getTime() <= now()) {
        throw new DueAtNotInFutureError()
      }

      const task = await repository.createTask({
        businessId: command.businessId,
        companyId: decision.companyId,
        decisionId: decision.id,
        title,
        dueAt,
        priority,
        createdById,
        assignedToId: createdById,
      })

      return toResult(task)
    })
  }
}

export const createTaskFromDecision = createCreateTaskFromDecision()
