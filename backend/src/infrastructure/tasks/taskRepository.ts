import {
  DecisionStatus,
  TaskCompletionOutcome,
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

export type OpenTaskDueRecord = {
  id: string
  title: string
  status: TaskStatus
  dueAt: Date
  priority: TaskPriority
  company: {
    id: string
    name: string
  } | null
  decision: {
    id: string
    title: string
    status: DecisionStatus
  } | null
}

export type StartedTaskRow = {
  id: string
  status: TaskStatus
}

export async function tryStartTaskAtomic(
  businessId: string,
  taskId: string,
): Promise<StartedTaskRow | null> {
  // Prisma updateMany cannot RETURNING; use parameterized UPDATE ... RETURNING.
  // updatedAt is set explicitly: raw SQL bypasses Prisma @updatedAt.
  const rows = await prisma.$queryRaw<StartedTaskRow[]>`
    UPDATE "Task"
    SET
      status = CAST(${TaskStatus.IN_PROGRESS} AS "TaskStatus"),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      id = ${taskId}
      AND "businessId" = ${businessId}
      AND status = CAST(${TaskStatus.TODO} AS "TaskStatus")
    RETURNING id, status
  `

  return rows[0] ?? null
}

export async function findTaskStartContextInBusiness(
  businessId: string,
  taskId: string,
) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      businessId,
    },
    select: {
      id: true,
      status: true,
    },
  })
}

export type RescheduledTaskRow = {
  id: string
  status: TaskStatus
  dueAt: Date
}

export async function tryRescheduleTaskAtomic(
  businessId: string,
  taskId: string,
  dueAt: Date,
): Promise<RescheduledTaskRow | null> {
  // Prisma updateMany cannot RETURNING; use parameterized UPDATE ... RETURNING.
  // updatedAt is set explicitly: raw SQL bypasses Prisma @updatedAt.
  const rows = await prisma.$queryRaw<RescheduledTaskRow[]>`
    UPDATE "Task"
    SET
      "dueAt" = ${dueAt},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      id = ${taskId}
      AND "businessId" = ${businessId}
      AND status IN (
        CAST(${TaskStatus.TODO} AS "TaskStatus"),
        CAST(${TaskStatus.IN_PROGRESS} AS "TaskStatus")
      )
    RETURNING id, status, "dueAt"
  `

  return rows[0] ?? null
}

export async function findTaskRescheduleContextInBusiness(
  businessId: string,
  taskId: string,
) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      businessId,
    },
    select: {
      id: true,
      status: true,
    },
  })
}

export type CompletedTaskRow = {
  id: string
  status: TaskStatus
  completedAt: Date
  completionOutcome: TaskCompletionOutcome
  completionComment: string | null
}

export async function tryCompleteTaskAtomic(
  businessId: string,
  taskId: string,
  completionOutcome: TaskCompletionOutcome,
  completionComment: string | null,
): Promise<CompletedTaskRow | null> {
  // Prisma updateMany cannot RETURNING; use parameterized UPDATE ... RETURNING.
  // updatedAt is set explicitly: raw SQL bypasses Prisma @updatedAt.
  const rows = await prisma.$queryRaw<CompletedTaskRow[]>`
    UPDATE "Task"
    SET
      status = CAST(${TaskStatus.DONE} AS "TaskStatus"),
      "completedAt" = CURRENT_TIMESTAMP,
      "completionOutcome" = CAST(${completionOutcome} AS "TaskCompletionOutcome"),
      "completionComment" = ${completionComment},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      id = ${taskId}
      AND "businessId" = ${businessId}
      AND status IN (
        CAST(${TaskStatus.TODO} AS "TaskStatus"),
        CAST(${TaskStatus.IN_PROGRESS} AS "TaskStatus")
      )
    RETURNING
      id,
      status,
      "completedAt",
      "completionOutcome",
      "completionComment"
  `

  return rows[0] ?? null
}

export async function findTaskCompleteContextInBusiness(
  businessId: string,
  taskId: string,
) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      businessId,
    },
    select: {
      id: true,
      status: true,
    },
  })
}

export async function findOpenTasksDueBefore(
  businessId: string,
  startOfTomorrow: Date,
): Promise<OpenTaskDueRecord[]> {
  const tasks = await prisma.task.findMany({
    where: {
      businessId,
      status: {
        in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      },
      dueAt: {
        not: null,
        lt: startOfTomorrow,
      },
      AND: [
        {
          OR: [{ companyId: null }, { company: { businessId } }],
        },
        {
          OR: [{ decisionId: null }, { decision: { businessId } }],
        },
      ],
    },
    orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      priority: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      decision: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  })

  return tasks.flatMap((task) => {
    if (task.dueAt === null) {
      return []
    }

    return [
      {
        id: task.id,
        title: task.title,
        status: task.status,
        dueAt: task.dueAt,
        priority: task.priority,
        company: task.company,
        decision: task.decision,
      },
    ]
  })
}

export type TodayAttentionRow = {
  id: string
  title: string
  completedAt: Date
  completionOutcome: TaskCompletionOutcome
  companyId: string | null
  companyName: string | null
  decisionId: string | null
  decisionTitle: string | null
  decisionStatus: DecisionStatus | null
}

export async function findTodayAttentionItems(
  businessId: string,
  limit: number,
): Promise<TodayAttentionRow[]> {
  // One bounded read: NOT EXISTS drops targets that already have an open task,
  // and the window keeps the earliest FOLLOW_UP per company, otherwise per decision.
  return prisma.$queryRaw<TodayAttentionRow[]>`
    SELECT
      ranked.id,
      ranked.title,
      ranked."completedAt",
      ranked."completionOutcome",
      ranked."companyId",
      ranked."companyName",
      ranked."decisionId",
      ranked."decisionTitle",
      ranked."decisionStatus"
    FROM (
      SELECT
        task.id,
        task.title,
        task."completedAt",
        task."completionOutcome",
        company.id AS "companyId",
        company.name AS "companyName",
        decision.id AS "decisionId",
        decision.title AS "decisionTitle",
        decision.status AS "decisionStatus",
        ROW_NUMBER() OVER (
          PARTITION BY
            CASE
              WHEN task."companyId" IS NOT NULL THEN 'company:' || task."companyId"
              WHEN task."decisionId" IS NOT NULL THEN 'decision:' || task."decisionId"
              ELSE 'task:' || task.id
            END
          ORDER BY task."completedAt" ASC, task.id ASC
        ) AS row_number
      FROM "Task" task
      LEFT JOIN "Company" company
        ON company.id = task."companyId"
        AND company."businessId" = task."businessId"
      LEFT JOIN "Decision" decision
        ON decision.id = task."decisionId"
        AND decision."businessId" = task."businessId"
      WHERE
        task."businessId" = ${businessId}
        AND task.status = CAST(${TaskStatus.DONE} AS "TaskStatus")
        AND task."completionOutcome" = CAST(${TaskCompletionOutcome.FOLLOW_UP} AS "TaskCompletionOutcome")
        AND task."completedAt" IS NOT NULL
        AND (
          task."companyId" IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM "Task" open_company_task
            WHERE
              open_company_task."businessId" = task."businessId"
              AND open_company_task."companyId" = task."companyId"
              AND open_company_task.status IN (
                CAST(${TaskStatus.TODO} AS "TaskStatus"),
                CAST(${TaskStatus.IN_PROGRESS} AS "TaskStatus")
              )
          )
        )
        AND (
          task."decisionId" IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM "Task" open_decision_task
            WHERE
              open_decision_task."businessId" = task."businessId"
              AND open_decision_task."decisionId" = task."decisionId"
              AND open_decision_task.status IN (
                CAST(${TaskStatus.TODO} AS "TaskStatus"),
                CAST(${TaskStatus.IN_PROGRESS} AS "TaskStatus")
              )
          )
        )
    ) ranked
    WHERE ranked.row_number = 1
    ORDER BY ranked."completedAt" ASC, ranked.id ASC
    LIMIT ${limit}
  `
}
