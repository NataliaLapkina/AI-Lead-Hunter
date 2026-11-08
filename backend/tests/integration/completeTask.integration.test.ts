import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  DecisionStatus,
  TaskCompletionOutcome,
  TaskPriority,
  TaskStatus,
  type PrismaClient,
  type Task,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerCompleteTaskRoute } from '../../src/api/tasks/completeTaskRoute.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import { findOpenTasksDueBefore } from '../../src/infrastructure/tasks/taskRepository.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'
const PRESERVED_COMPLETED_AT = new Date('2026-01-15T08:00:00.000Z')
const PRESERVED_DUE_AT = new Date('2026-10-11T12:00:00.000Z')
const PRESERVED_UPDATED_AT = new Date('2020-01-01T00:00:00.000Z')
const TODAY_WINDOW_END = new Date('2027-01-01T00:00:00.000Z')

type CompleteTaskSuccessBody = {
  data: {
    task: {
      id: string
      status: TaskStatus
      completedAt: string
      completionOutcome: TaskCompletionOutcome
      completionComment: string | null
    }
  }
}

type ErrorBody = {
  error: {
    code: string
    message: string
    details: Record<string, unknown>
  }
}

type Workspace = {
  businessId: string
  userId: string
  companyId: string
}

function emptyFixtureIds(): Required<KnownTestFixtureIds> {
  return {
    recommendationIds: [],
    decisionIds: [],
    taskIds: [],
    knowledgeIds: [],
    companyIds: [],
    membershipIds: [],
    businessIds: [],
    userIds: [],
  }
}

describe('POST /api/v1/businesses/:businessId/tasks/:taskId/complete', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-complete-task-${label}-${randomUUID()}`
  }

  function completeUrl(businessId: string, taskId: string): string {
    return `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/tasks/${encodeURIComponent(taskId)}/complete`
  }

  function completeTask(
    businessId: string,
    taskId: string,
    payload?: Record<string, unknown>,
  ) {
    return app.inject({
      method: 'POST',
      url: completeUrl(businessId, taskId),
      payload,
    })
  }

  async function seedWorkspace(label: string): Promise<Workspace> {
    const businessId = uniqueId(`${label}-business`)
    const userId = uniqueId(`${label}-user`)
    const companyId = uniqueId(`${label}-company`)

    fixtureIds.businessIds.push(businessId)
    fixtureIds.userIds.push(userId)
    fixtureIds.companyIds.push(companyId)

    await prisma.business.create({
      data: {
        id: businessId,
        name: `${label} business`,
      },
    })
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: `${label} user`,
      },
    })
    await prisma.company.create({
      data: {
        id: companyId,
        businessId,
        name: `${label} company`,
        origin: CompanyOrigin.MANUAL,
        assessment: CompanyAssessment.SUITABLE,
        workState: CompanyWorkState.ACTIVE,
      },
    })

    return { businessId, userId, companyId }
  }

  async function seedDecision(workspace: Workspace): Promise<string> {
    const decisionId = uniqueId('decision')
    fixtureIds.decisionIds.push(decisionId)
    await prisma.decision.create({
      data: {
        id: decisionId,
        businessId: workspace.businessId,
        companyId: workspace.companyId,
        title: 'Call the company',
        decidedById: workspace.userId,
        status: DecisionStatus.ACTIVE,
      },
    })
    return decisionId
  }

  async function seedTask(input: {
    workspace: Workspace
    status?: TaskStatus
    businessId?: string
    decisionId?: string | null
    completedAt?: Date | null
    completionOutcome?: TaskCompletionOutcome | null
    completionComment?: string | null
  }): Promise<Task> {
    const taskId = uniqueId('task')
    fixtureIds.taskIds.push(taskId)
    const task = await prisma.task.create({
      data: {
        id: taskId,
        businessId: input.businessId ?? input.workspace.businessId,
        companyId: input.workspace.companyId,
        decisionId: input.decisionId === undefined ? null : input.decisionId,
        title: 'Call today',
        description: 'Keep the original description',
        dueAt: PRESERVED_DUE_AT,
        priority: TaskPriority.HIGH,
        status: input.status ?? TaskStatus.TODO,
        assignedToId: input.workspace.userId,
        createdById: input.workspace.userId,
        completedAt: input.completedAt === undefined ? null : input.completedAt,
        completionOutcome: input.completionOutcome ?? null,
        completionComment: input.completionComment ?? null,
      },
    })

    await prisma.$executeRaw`
      UPDATE "Task"
      SET "updatedAt" = ${PRESERVED_UPDATED_AT}
      WHERE id = ${task.id}
    `

    return prisma.task.findUniqueOrThrow({ where: { id: task.id } })
  }

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerCompleteTaskRoute(app, API_PREFIX)
    await app.ready()
  })

  afterEach(async () => {
    const completedFixtureIds = fixtureIds
    fixtureIds = emptyFixtureIds()
    await cleanupKnownTestFixtures(prisma, completedFixtureIds)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
    await disconnectPrisma()
  })

  it.each([
    TaskCompletionOutcome.CONTACTED,
    TaskCompletionOutcome.NO_RESPONSE,
    TaskCompletionOutcome.FOLLOW_UP,
    TaskCompletionOutcome.DECLINED,
  ] as const)('completes a TODO task as %s and stores an empty comment as null', async (outcome) => {
    const workspace = await seedWorkspace(`todo-${outcome}`)
    const decisionId = await seedDecision(workspace)
    const before = await seedTask({ workspace, decisionId })
    const visibleBefore = await findOpenTasksDueBefore(workspace.businessId, TODAY_WINDOW_END)
    const startedAt = Date.now()

    const response = await completeTask(workspace.businessId, before.id, {
      outcome,
      comment: '   ',
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })
    const body = response.json<CompleteTaskSuccessBody>()
    const visible = await findOpenTasksDueBefore(workspace.businessId, TODAY_WINDOW_END)
    const decision = await prisma.decision.findUniqueOrThrow({ where: { id: decisionId } })
    const [interactions, outcomes, tasks] = await Promise.all([
      prisma.interaction.count({ where: { businessId: workspace.businessId } }),
      prisma.outcome.count({ where: { businessId: workspace.businessId } }),
      prisma.task.count({ where: { businessId: workspace.businessId } }),
    ])

    expect(response.statusCode).toBe(200)
    expect(body.data.task).toEqual({
      id: before.id,
      status: TaskStatus.DONE,
      completedAt: after.completedAt?.toISOString(),
      completionOutcome: outcome,
      completionComment: null,
    })
    expect(after.status).toBe(TaskStatus.DONE)
    expect(after.completionOutcome).toBe(outcome)
    expect(after.completionComment).toBeNull()
    expect(after.completedAt).toBeInstanceOf(Date)
    expect(after.completedAt!.getTime()).toBeGreaterThanOrEqual(startedAt - 1000)
    expect(after.description).toBe(before.description)
    expect(after.dueAt).toEqual(before.dueAt)
    expect(after.companyId).toBe(before.companyId)
    expect(after.decisionId).toBe(decisionId)
    expect(after.priority).toBe(before.priority)
    expect(after.title).toBe(before.title)
    expect(decision.status).toBe(DecisionStatus.ACTIVE)
    expect(visibleBefore.map((task) => task.id)).toContain(before.id)
    expect(visible.map((task) => task.id)).not.toContain(before.id)
    expect(interactions).toBe(0)
    expect(outcomes).toBe(0)
    expect(tasks).toBe(1)
  })

  it('completes an IN_PROGRESS task and keeps a trimmed optional comment', async () => {
    const workspace = await seedWorkspace('in-progress')
    const before = await seedTask({
      workspace,
      status: TaskStatus.IN_PROGRESS,
    })

    const response = await completeTask(workspace.businessId, before.id, {
      outcome: TaskCompletionOutcome.CONTACTED,
      comment: '  spoke with the owner  ',
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(response.json<CompleteTaskSuccessBody>().data.task).toEqual({
      id: before.id,
      status: TaskStatus.DONE,
      completedAt: after.completedAt?.toISOString(),
      completionOutcome: TaskCompletionOutcome.CONTACTED,
      completionComment: 'spoke with the owner',
    })
    expect(after.status).toBe(TaskStatus.DONE)
    expect(after.completionComment).toBe('spoke with the owner')
    expect(after.completedAt).not.toBeNull()
  })

  it('stores a trimmed OTHER comment and rejects a missing or blank one', async () => {
    const workspace = await seedWorkspace('other')
    const accepted = await seedTask({ workspace })
    const missing = await seedTask({ workspace })
    const blank = await seedTask({ workspace })

    const missingResponse = await completeTask(workspace.businessId, missing.id, {
      outcome: TaskCompletionOutcome.OTHER,
    })
    const blankResponse = await completeTask(workspace.businessId, blank.id, {
      outcome: TaskCompletionOutcome.OTHER,
      comment: ' \n\t ',
    })
    const acceptedResponse = await completeTask(workspace.businessId, accepted.id, {
      outcome: TaskCompletionOutcome.OTHER,
      comment: '  left a voicemail  ',
    })
    const missingAfter = await prisma.task.findUniqueOrThrow({ where: { id: missing.id } })
    const blankAfter = await prisma.task.findUniqueOrThrow({ where: { id: blank.id } })
    const acceptedAfter = await prisma.task.findUniqueOrThrow({ where: { id: accepted.id } })

    expect(missingResponse.statusCode).toBe(400)
    expect(missingResponse.json<ErrorBody>().error.code).toBe('COMMENT_REQUIRED')
    expect(blankResponse.statusCode).toBe(400)
    expect(blankResponse.json<ErrorBody>().error.code).toBe('COMMENT_REQUIRED')
    expect(missingAfter).toEqual(missing)
    expect(blankAfter).toEqual(blank)
    expect(acceptedResponse.statusCode).toBe(200)
    expect(acceptedAfter.status).toBe(TaskStatus.DONE)
    expect(acceptedAfter.completionOutcome).toBe(TaskCompletionOutcome.OTHER)
    expect(acceptedAfter.completionComment).toBe('left a voicemail')
  })

  it.each([
    [{}, 'INVALID_OUTCOME'],
    [{ outcome: 1 }, 'INVALID_OUTCOME'],
    [{ outcome: 'POSITIVE' }, 'INVALID_OUTCOME'],
    [{ outcome: TaskCompletionOutcome.CONTACTED, comment: null }, 'INVALID_COMMENT'],
    [{ outcome: TaskCompletionOutcome.DECLINED, comment: 4 }, 'INVALID_COMMENT'],
  ] as const)('rejects invalid input %j as %s and leaves the task unchanged', async (payload, code) => {
    const workspace = await seedWorkspace(`invalid-${code}`)
    const before = await seedTask({ workspace })

    const response = await completeTask(workspace.businessId, before.id, payload)
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(400)
    expect(response.json<ErrorBody>().error.code).toBe(code)
    expect(after).toEqual(before)
  })

  it('returns business not found without changing the task', async () => {
    const workspace = await seedWorkspace('unknown-business')
    const before = await seedTask({ workspace })

    const response = await completeTask(uniqueId('absent-business'), before.id, {
      outcome: TaskCompletionOutcome.CONTACTED,
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('BUSINESS_NOT_FOUND')
    expect(after).toEqual(before)
  })

  it('returns not found for a missing task', async () => {
    const workspace = await seedWorkspace('missing')

    const response = await completeTask(workspace.businessId, uniqueId('absent-task'), {
      outcome: TaskCompletionOutcome.NO_RESPONSE,
    })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('TASK_NOT_FOUND')
  })

  it('does not complete a task that belongs to another business', async () => {
    const owner = await seedWorkspace('owner')
    const other = await seedWorkspace('other')
    const before = await seedTask({ workspace: owner })

    const response = await completeTask(other.businessId, before.id, {
      outcome: TaskCompletionOutcome.DECLINED,
      comment: 'wrong tenant',
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('TASK_NOT_FOUND')
    expect(after).toEqual(before)
  })

  it.each([TaskStatus.DONE, TaskStatus.CANCELLED] as const)(
    'rejects a %s task and keeps the stored completion',
    async (status) => {
      const workspace = await seedWorkspace(`terminal-${status}`)
      const before = await seedTask({
        workspace,
        status,
        completedAt: PRESERVED_COMPLETED_AT,
        completionOutcome: TaskCompletionOutcome.CONTACTED,
        completionComment: 'original',
      })

      const response = await completeTask(workspace.businessId, before.id, {
        outcome: TaskCompletionOutcome.DECLINED,
        comment: 'replacement',
      })
      const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

      expect(response.statusCode).toBe(409)
      expect(response.json<ErrorBody>().error.code).toBe('TASK_STATUS_CONFLICT')
      expect(after).toEqual(before)
      expect(after.completionOutcome).toBe(TaskCompletionOutcome.CONTACTED)
      expect(after.completionComment).toBe('original')
      expect(after.completedAt).toEqual(PRESERVED_COMPLETED_AT)
    },
  )

  it('lets one of two concurrent completions win and keeps that outcome', async () => {
    const workspace = await seedWorkspace('concurrent')
    const before = await seedTask({ workspace })

    const [firstResponse, secondResponse] = await Promise.all([
      completeTask(workspace.businessId, before.id, {
        outcome: TaskCompletionOutcome.CONTACTED,
        comment: '  first caller  ',
      }),
      completeTask(workspace.businessId, before.id, {
        outcome: TaskCompletionOutcome.DECLINED,
        comment: 'second caller',
      }),
    ])
    const responses = [firstResponse, secondResponse]
    const success = responses.find((response) => response.statusCode === 200)
    const conflict = responses.find((response) => response.statusCode === 409)
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })
    const stored = success?.json<CompleteTaskSuccessBody>().data.task

    expect(success).toBeDefined()
    expect(conflict?.statusCode).toBe(409)
    expect(conflict?.json<ErrorBody>().error.code).toBe('TASK_STATUS_CONFLICT')
    expect(stored).toEqual({
      id: before.id,
      status: TaskStatus.DONE,
      completedAt: after.completedAt?.toISOString(),
      completionOutcome: after.completionOutcome,
      completionComment: after.completionComment,
    })
    expect([
      TaskCompletionOutcome.CONTACTED,
      TaskCompletionOutcome.DECLINED,
    ]).toContain(after.completionOutcome)
    expect(['first caller', 'second caller']).toContain(after.completionComment)
    if (after.completionOutcome === TaskCompletionOutcome.CONTACTED) {
      expect(after.completionComment).toBe('first caller')
    }
    if (after.completionOutcome === TaskCompletionOutcome.DECLINED) {
      expect(after.completionComment).toBe('second caller')
    }
    expect(after.status).toBe(TaskStatus.DONE)
    expect(await prisma.task.count({ where: { businessId: workspace.businessId } })).toBe(1)
  })
})
