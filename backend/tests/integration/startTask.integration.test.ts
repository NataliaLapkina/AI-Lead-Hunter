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
import { registerStartTaskRoute } from '../../src/api/tasks/startTaskRoute.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'
const PRESERVED_COMPLETED_AT = new Date('2026-01-15T08:00:00.000Z')
const PRESERVED_DUE_AT = new Date('2026-10-11T12:00:00.000Z')
const PRESERVED_UPDATED_AT = new Date('2020-01-01T00:00:00.000Z')

type StartTaskSuccessBody = {
  data: {
    task: {
      id: string
      status: TaskStatus
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

describe('POST /api/v1/businesses/:businessId/tasks/:taskId/start', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-start-task-${label}-${randomUUID()}`
  }

  function startUrl(businessId: string, taskId: string): string {
    return `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/tasks/${encodeURIComponent(taskId)}/start`
  }

  function startTask(businessId: string, taskId: string) {
    return app.inject({
      method: 'POST',
      url: startUrl(businessId, taskId),
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
        dueAt: PRESERVED_DUE_AT,
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

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerStartTaskRoute(app, API_PREFIX)
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

  it('starts a TODO task and preserves unrelated fields', async () => {
    const workspace = await seedWorkspace('todo')
    const decisionId = await seedDecision(workspace)
    const before = await seedTask({
      workspace,
      decisionId,
    })

    const response = await startTask(workspace.businessId, before.id)
    const body = response.json<StartTaskSuccessBody>()
    const after = await prisma.task.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(body).toEqual({
      data: {
        task: {
          id: before.id,
          status: TaskStatus.IN_PROGRESS,
        },
      },
    })
    expect(after.status).toBe(TaskStatus.IN_PROGRESS)
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
    expect(after.dueAt).toEqual(before.dueAt)
    expect(after.priority).toBe(before.priority)
    expect(after.companyId).toBe(before.companyId)
    expect(after.decisionId).toBe(before.decisionId)
    expect(after.title).toBe(before.title)
    expect(after.description).toBe(before.description)
    expect(after.completedAt).toEqual(before.completedAt)
    expect(after.assignedToId).toBe(before.assignedToId)
    expect(after.createdById).toBe(before.createdById)
    expect(after.businessId).toBe(before.businessId)
  })

  it('returns success for a repeated start without changing the task', async () => {
    const workspace = await seedWorkspace('repeat')
    const decisionId = await seedDecision(workspace)
    const task = await seedTask({
      workspace,
      decisionId,
      status: TaskStatus.IN_PROGRESS,
    })

    const response = await startTask(workspace.businessId, task.id)
    const body = response.json<StartTaskSuccessBody>()
    const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } })

    expect(response.statusCode).toBe(200)
    expect(body.data.task).toEqual({
      id: task.id,
      status: TaskStatus.IN_PROGRESS,
    })
    expect(after).toEqual(task)
  })

  it('rejects start for DONE and CANCELLED without changing the task', async () => {
    const workspace = await seedWorkspace('terminal')

    for (const status of [TaskStatus.DONE, TaskStatus.CANCELLED]) {
      const task = await seedTask({ workspace, status })
      const response = await startTask(workspace.businessId, task.id)
      const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } })

      expect(response.statusCode).toBe(409)
      expect(response.json<ErrorBody>().error.code).toBe('TASK_STATUS_CONFLICT')
      expect(after).toEqual(task)
    }
  })

  it('returns not found for a missing task', async () => {
    const workspace = await seedWorkspace('missing')

    const response = await startTask(workspace.businessId, uniqueId('absent-task'))

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('TASK_NOT_FOUND')
  })

  it('does not start a task that belongs to another business', async () => {
    const owner = await seedWorkspace('owner')
    const other = await seedWorkspace('other')
    const task = await seedTask({ workspace: owner })

    const response = await startTask(other.businessId, task.id)
    const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('TASK_NOT_FOUND')
    expect(after).toEqual(task)
  })

  it('returns business not found without reading another tenant task', async () => {
    const owner = await seedWorkspace('unknown-business')
    const task = await seedTask({ workspace: owner })

    const response = await startTask(uniqueId('absent-business'), task.id)
    const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('BUSINESS_NOT_FOUND')
    expect(after).toEqual(task)
  })

  it('lets two concurrent starts finish as one IN_PROGRESS task', async () => {
    const workspace = await seedWorkspace('concurrent')
    const decisionId = await seedDecision(workspace)
    const task = await seedTask({
      workspace,
      decisionId,
    })

    const [firstResponse, secondResponse] = await Promise.all([
      startTask(workspace.businessId, task.id),
      startTask(workspace.businessId, task.id),
    ])
    const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(firstResponse.json<StartTaskSuccessBody>().data.task).toEqual({
      id: task.id,
      status: TaskStatus.IN_PROGRESS,
    })
    expect(secondResponse.json<StartTaskSuccessBody>().data.task).toEqual({
      id: task.id,
      status: TaskStatus.IN_PROGRESS,
    })
    expect(after.status).toBe(TaskStatus.IN_PROGRESS)
    expect(after.dueAt).toEqual(task.dueAt)
    expect(after.companyId).toBe(task.companyId)
    expect(after.decisionId).toBe(task.decisionId)
    expect(after.completedAt).toEqual(task.completedAt)
    expect(after.priority).toBe(task.priority)
    expect(after.title).toBe(task.title)
  })
})
