import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  DecisionStatus,
  TaskPriority,
  TaskStatus,
  type PrismaClient,
  type Task,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerRescheduleTaskRoute } from '../../src/api/tasks/rescheduleTaskRoute.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'
const NOW = Date.parse('2099-01-01T15:00:00.000Z')
const INITIAL_DUE_AT = new Date('2099-12-01T00:00:00.000Z')
const FUTURE_DUE_AT = '2099-06-15T12:00:00.000Z'
const OTHER_FUTURE_DUE_AT = '2099-07-01T09:30:00.000Z'
const PAST_DUE_AT = '2098-12-31T12:00:00.000Z'
const NOW_DUE_AT = '2099-01-01T15:00:00.000Z'
const OFFSET_DUE_AT = '2099-06-15T15:00:00+03:00'
const OFFSET_DUE_AT_UTC = '2099-06-15T12:00:00.000Z'
const PRESERVED_COMPLETED_AT = new Date('2026-01-15T08:00:00.000Z')
const PRESERVED_UPDATED_AT = new Date('2020-01-01T00:00:00.000Z')

type RescheduleTaskSuccessBody = {
  data: {
    task: {
      id: string
      status: TaskStatus
      dueAt: string
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

describe('POST /api/v1/businesses/:businessId/tasks/:taskId/reschedule', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-reschedule-task-${label}-${randomUUID()}`
  }

  function rescheduleUrl(businessId: string, taskId: string): string {
    return `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/tasks/${encodeURIComponent(taskId)}/reschedule`
  }

  function rescheduleTask(
    businessId: string,
    taskId: string,
    payload: Record<string, unknown> | undefined,
  ) {
    return app.inject({
      method: 'POST',
      url: rescheduleUrl(businessId, taskId),
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
    companyId?: string | null
    decisionId?: string | null
    completedAt?: Date | null
    dueAt?: Date | null
  }): Promise<Task> {
    const taskId = uniqueId('task')
    fixtureIds.taskIds.push(taskId)
    const task = await prisma.task.create({
      data: {
        id: taskId,
        businessId: input.businessId ?? input.workspace.businessId,
        companyId:
          input.companyId === undefined ? input.workspace.companyId : input.companyId,
        decisionId: input.decisionId === undefined ? null : input.decisionId,
        title: 'Call today',
        description: 'Keep the original description',
        dueAt: input.dueAt === undefined ? INITIAL_DUE_AT : input.dueAt,
        priority: TaskPriority.HIGH,
        status: input.status ?? TaskStatus.TODO,
        assignedToId: input.workspace.userId,
        createdById: input.workspace.userId,
        completedAt:
          input.completedAt === undefined ? PRESERVED_COMPLETED_AT : input.completedAt,
      },
    })

    await prisma.$executeRaw`
      UPDATE "Task"
      SET "updatedAt" = ${PRESERVED_UPDATED_AT}
      WHERE id = ${task.id}
    `

    return prisma.task.findUniqueOrThrow({ where: { id: task.id } })
  }

  function expectPreservedTask(after: Task, before: Task) {
    expect(after.status).toBe(before.status)
    expect(after.title).toBe(before.title)
    expect(after.description).toBe(before.description)
    expect(after.priority).toBe(before.priority)
    expect(after.companyId).toBe(before.companyId)
    expect(after.decisionId).toBe(before.decisionId)
    expect(after.completedAt).toEqual(before.completedAt)
    expect(after.assignedToId).toBe(before.assignedToId)
    expect(after.createdById).toBe(before.createdById)
    expect(after.businessId).toBe(before.businessId)
  }

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerRescheduleTaskRoute(app, API_PREFIX, {
      now: () => NOW,
    })
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

  it('reschedules a TODO task to a future dueAt and preserves unrelated fields', async () => {
    const workspace = await seedWorkspace('todo')
    const decisionId = await seedDecision(workspace)
    const before = await seedTask({
      workspace,
      decisionId,
    })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt: FUTURE_DUE_AT,
    })
    const body = response.json<RescheduleTaskSuccessBody>()
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(body).toEqual({
      data: {
        task: {
          id: before.id,
          status: TaskStatus.TODO,
          dueAt: FUTURE_DUE_AT,
        },
      },
    })
    expect(after.dueAt?.toISOString()).toBe(FUTURE_DUE_AT)
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
    expectPreservedTask(after, before)
  })

  it('reschedules an IN_PROGRESS task and keeps its status', async () => {
    const workspace = await seedWorkspace('in-progress')
    const decisionId = await seedDecision(workspace)
    const before = await seedTask({
      workspace,
      decisionId,
      status: TaskStatus.IN_PROGRESS,
    })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt: FUTURE_DUE_AT,
    })
    const body = response.json<RescheduleTaskSuccessBody>()
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(body.data.task).toEqual({
      id: before.id,
      status: TaskStatus.IN_PROGRESS,
      dueAt: FUTURE_DUE_AT,
    })
    expect(after.dueAt?.toISOString()).toBe(FUTURE_DUE_AT)
    expect(after.status).toBe(TaskStatus.IN_PROGRESS)
    expectPreservedTask(after, before)
  })

  it('rejects reschedule for DONE without changing the task', async () => {
    const workspace = await seedWorkspace('done')
    const decisionId = await seedDecision(workspace)
    const before = await seedTask({
      workspace,
      decisionId,
      status: TaskStatus.DONE,
    })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt: FUTURE_DUE_AT,
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(409)
    expect(response.json<ErrorBody>().error.code).toBe('TASK_STATUS_CONFLICT')
    expect(after).toEqual(before)
  })

  it('rejects reschedule for CANCELLED without changing the task', async () => {
    const workspace = await seedWorkspace('cancelled')
    const decisionId = await seedDecision(workspace)
    const before = await seedTask({
      workspace,
      decisionId,
      status: TaskStatus.CANCELLED,
    })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt: FUTURE_DUE_AT,
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(409)
    expect(response.json<ErrorBody>().error.code).toBe('TASK_STATUS_CONFLICT')
    expect(after).toEqual(before)
  })

  it('returns not found for a missing task', async () => {
    const workspace = await seedWorkspace('missing')

    const response = await rescheduleTask(workspace.businessId, uniqueId('absent-task'), {
      dueAt: FUTURE_DUE_AT,
    })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('TASK_NOT_FOUND')
  })

  it('does not reschedule a task that belongs to another business', async () => {
    const owner = await seedWorkspace('owner')
    const other = await seedWorkspace('other')
    const before = await seedTask({ workspace: owner })

    const response = await rescheduleTask(other.businessId, before.id, {
      dueAt: FUTURE_DUE_AT,
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('TASK_NOT_FOUND')
    expect(after).toEqual(before)
  })

  it('returns business not found without changing another tenant task', async () => {
    const owner = await seedWorkspace('unknown-business')
    const before = await seedTask({ workspace: owner })

    const response = await rescheduleTask(uniqueId('absent-business'), before.id, {
      dueAt: FUTURE_DUE_AT,
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('BUSINESS_NOT_FOUND')
    expect(after).toEqual(before)
  })

  it('rejects a missing dueAt without changing the task', async () => {
    const workspace = await seedWorkspace('missing-due')
    const before = await seedTask({ workspace })

    const response = await rescheduleTask(workspace.businessId, before.id, {})
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(400)
    expect(response.json<ErrorBody>().error.code).toBe('INVALID_DUE_AT')
    expect(after).toEqual(before)
  })

  it('rejects a malformed dueAt without changing the task', async () => {
    const workspace = await seedWorkspace('malformed-due')
    const before = await seedTask({ workspace })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt: 'not-a-date',
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(400)
    expect(response.json<ErrorBody>().error.code).toBe('INVALID_DUE_AT')
    expect(after).toEqual(before)
  })

  it.each([
    ['overdue', new Date('2098-12-20T12:00:00.000Z')],
    ['earlier today', new Date('2099-01-01T09:00:00.000Z')],
    ['null', null],
  ])(
    'reschedules a task whose current dueAt is %s when the new dueAt is in the future',
    async (label, storedDueAt) => {
      const workspace = await seedWorkspace(label)
      const before = await seedTask({
        workspace,
        dueAt: storedDueAt,
      })

      const response = await rescheduleTask(workspace.businessId, before.id, {
        dueAt: FUTURE_DUE_AT,
      })
      const body = response.json<RescheduleTaskSuccessBody>()
      const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

      expect(response.statusCode).toBe(200)
      expect(body.data.task).toEqual({
        id: before.id,
        status: TaskStatus.TODO,
        dueAt: FUTURE_DUE_AT,
      })
      expect(after.dueAt?.toISOString()).toBe(FUTURE_DUE_AT)
      expect(after.status).toBe(before.status)
    },
  )

  it.each([
    ['non-string', 42],
    ['date-only', '2099-06-15'],
    ['local datetime without offset', '2099-06-15T12:00:00'],
    ['impossible calendar date', '2099-02-30T12:00:00.000Z'],
  ])('rejects %s dueAt without changing the task', async (label, dueAt) => {
    const workspace = await seedWorkspace(label)
    const before = await seedTask({ workspace })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt,
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(400)
    expect(response.json<ErrorBody>().error.code).toBe('INVALID_DUE_AT')
    expect(after).toEqual(before)
  })

  it('accepts a numeric offset and stores the UTC instant', async () => {
    const workspace = await seedWorkspace('offset')
    const before = await seedTask({ workspace })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt: OFFSET_DUE_AT,
    })
    const body = response.json<RescheduleTaskSuccessBody>()
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(body.data.task).toEqual({
      id: before.id,
      status: TaskStatus.TODO,
      dueAt: OFFSET_DUE_AT_UTC,
    })
    expect(after.dueAt?.toISOString()).toBe(OFFSET_DUE_AT_UTC)
    expect(after.status).toBe(before.status)
  })

  it('rejects dueAt equal to the current instant', async () => {
    const workspace = await seedWorkspace('equal-now')
    const before = await seedTask({ workspace })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt: NOW_DUE_AT,
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(400)
    expect(response.json<ErrorBody>().error.code).toBe('DUE_AT_NOT_IN_FUTURE')
    expect(after).toEqual(before)
  })

  it('rejects a past dueAt', async () => {
    const workspace = await seedWorkspace('past-due')
    const before = await seedTask({ workspace })

    const response = await rescheduleTask(workspace.businessId, before.id, {
      dueAt: PAST_DUE_AT,
    })
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(400)
    expect(response.json<ErrorBody>().error.code).toBe('DUE_AT_NOT_IN_FUTURE')
    expect(after).toEqual(before)
  })

  it('keeps one of two concurrent future dueAt values and does not change status', async () => {
    const workspace = await seedWorkspace('concurrent')
    const decisionId = await seedDecision(workspace)
    const before = await seedTask({
      workspace,
      decisionId,
    })

    const [firstResponse, secondResponse] = await Promise.all([
      rescheduleTask(workspace.businessId, before.id, { dueAt: FUTURE_DUE_AT }),
      rescheduleTask(workspace.businessId, before.id, { dueAt: OTHER_FUTURE_DUE_AT }),
    ])
    const firstBody = firstResponse.json<RescheduleTaskSuccessBody>()
    const secondBody = secondResponse.json<RescheduleTaskSuccessBody>()
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(firstBody.data.task).toEqual({
      id: before.id,
      status: TaskStatus.TODO,
      dueAt: FUTURE_DUE_AT,
    })
    expect(secondBody.data.task).toEqual({
      id: before.id,
      status: TaskStatus.TODO,
      dueAt: OTHER_FUTURE_DUE_AT,
    })
    expect([FUTURE_DUE_AT, OTHER_FUTURE_DUE_AT]).toContain(after.dueAt?.toISOString())
    expect(after.status).toBe(TaskStatus.TODO)
    expectPreservedTask(after, before)
  })
})
