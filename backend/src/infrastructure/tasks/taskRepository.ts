import {
  DecisionStatus,
  TaskPriority,
  TaskStatus,
  type Prisma,
} from '@prisma/client'
import { prisma } from '../prisma.js'

export type LockedDecision = {
  id: string
  businessId: string
  companyId: string | null
  status: DecisionStatus
}

export type TaskRow = {
  id: string
  businessId: string
  companyId: string | null
  decisionId: string | null
  title: string
  description: string | null
  dueAt: Date | null
  priority: TaskPriority
  status: TaskStatus
  assignedToId: string | null
  createdById: string
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type CreateTaskInput = {
  businessId: string
  companyId: string | null
  decisionId: string
  title: string
  dueAt: Date
  priority: TaskPriority
  createdById: string
  assignedToId: string
}

export type TaskTransactionRepository = {
  businessExists(businessId: string): Promise<boolean>
  lockUser(userId: string): Promise<boolean>
  lockMembership(businessId: string, userId: string): Promise<boolean>
  lockDecision(businessId: string, decisionId: string): Promise<LockedDecision | null>
  lockCompanyInBusiness(businessId: string, companyId: string): Promise<boolean>
  findOpenTask(businessId: string, decisionId: string): Promise<TaskRow | null>
  createTask(input: CreateTaskInput): Promise<TaskRow>
  backendPid(): Promise<number>
}

function createTransactionRepository(
  tx: Prisma.TransactionClient,
): TaskTransactionRepository {
  return {
    async businessExists(businessId) {
      const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { id: true },
      })

      return business !== null
    },

    async lockUser(userId) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "User"
        WHERE id = ${userId}
        FOR SHARE
      `

      return rows.length === 1
    },

    async lockMembership(businessId, userId) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "Membership"
        WHERE "businessId" = ${businessId}
          AND "userId" = ${userId}
        FOR SHARE
      `

      return rows.length === 1
    },

    async lockDecision(businessId, decisionId) {
      const rows = await tx.$queryRaw<LockedDecision[]>`
        SELECT id, "businessId", "companyId", status
        FROM "Decision"
        WHERE id = ${decisionId}
          AND "businessId" = ${businessId}
        FOR UPDATE
      `

      return rows[0] ?? null
    },

    async lockCompanyInBusiness(businessId, companyId) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "Company"
        WHERE id = ${companyId}
          AND "businessId" = ${businessId}
        FOR SHARE
      `

      return rows.length === 1
    },

    findOpenTask(businessId, decisionId) {
      return tx.task.findFirst({
        where: {
          businessId,
          decisionId,
          status: {
            in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
    },

    createTask(input) {
      return tx.task.create({
        data: {
          businessId: input.businessId,
          companyId: input.companyId,
          decisionId: input.decisionId,
          title: input.title,
          description: null,
          dueAt: input.dueAt,
          priority: input.priority,
          status: TaskStatus.TODO,
          assignedToId: input.assignedToId,
          createdById: input.createdById,
          completedAt: null,
        },
      })
    },

    async backendPid() {
      const rows = await tx.$queryRaw<Array<{ pid: number }>>`
        SELECT pg_backend_pid() AS pid
      `
      const pid = Number(rows[0]?.pid)

      if (!Number.isInteger(pid) || pid <= 0) {
        throw new Error('Unable to read transaction backend pid.')
      }

      return pid
    },
  }
}

export async function runCreateTaskFromDecisionTransaction<T>(
  operation: (repository: TaskTransactionRepository) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return operation(createTransactionRepository(tx))
  })
}
