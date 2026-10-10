import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  DecisionStatus,
  TaskPriority,
  TaskStatus,
  type PrismaClient,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerListTodayTasksRoute } from '../../src/api/tasks/listTodayTasksRoute.js'
import { resolveTodayTaskWindow } from '../../src/application/tasks/todayTaskWindow.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'
const NOW = new Date('2026-10-11T02:30:00.000Z')
const MOSCOW_START_OF_TODAY = '2026-10-10T21:00:00.000Z'
const MOSCOW_START_OF_TOMORROW = '2026-10-11T21:00:00.000Z'
const NEW_YORK_START_OF_TODAY = '2026-10-10T04:00:00.000Z'
const NEW_YORK_START_OF_TOMORROW = '2026-10-11T04:00:00.000Z'

type TodayTaskJson = {
  id: string
  title: string
  status: TaskStatus
  dueAt: string
  priority: TaskPriority
  isOverdue: boolean
  company: { id: string; name: string } | null
  decision: { id: string; title: string; status: DecisionStatus } | null
}

type TodayTasksSuccessBody = {
  data: {
    tasks: TodayTaskJson[]
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
  companyName: string
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

describe('GET /api/v1/businesses/:businessId/today/tasks', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-today-tasks-${label}-${randomUUID()}`
  }

  function todayUrl(businessId: string, timezone?: string): string {
    const path = `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/today/tasks`
    if (timezone === undefined) {
      return path
    }

    return `${path}?timezone=${encodeURIComponent(timezone)}`
  }

  function listTasks(
    businessId: string,
    timezone = 'Europe/Moscow',
    target: FastifyInstance = app,
  ) {
    return target.inject({
      method: 'GET',
      url: todayUrl(businessId, timezone),
    })
  }

  async function openTodayApp(now: Date): Promise<FastifyInstance> {
    const instance = Fastify({ logger: false })
    await registerListTodayTasksRoute(instance, API_PREFIX, {
      now: () => now,
    })
    await instance.ready()
    return instance
  }

  async function seedWorkspace(label: string): Promise<Workspace> {
    const businessId = uniqueId(`${label}-business`)
    const userId = uniqueId(`${label}-user`)
    const companyId = uniqueId(`${label}-company`)
    const companyName = `${label} company`

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
        name: companyName,
        origin: CompanyOrigin.MANUAL,
        assessment: CompanyAssessment.SUITABLE,
        workState: CompanyWorkState.ACTIVE,
      },
    })

    return { businessId, userId, companyId, companyName }
  }

  async function seedDecision(
    workspace: Workspace,
    title: string,
    businessId = workspace.businessId,
    companyId: string | null = workspace.companyId,
    decidedById = workspace.userId,
  ): Promise<string> {
    const decisionId = uniqueId('decision')
    fixtureIds.decisionIds.push(decisionId)
    await prisma.decision.create({
      data: {
        id: decisionId,
        businessId,
        companyId,
        title,
        decidedById,
        status: DecisionStatus.ACTIVE,
      },
    })
    return decisionId
  }

  async function seedTask(input: {
    workspace: Workspace
    title: string
    dueAt: Date | null
    status?: TaskStatus
    priority?: TaskPriority
    companyId?: string | null
    decisionId?: string | null
    businessId?: string
    id?: string
  }): Promise<string> {
    const taskId = input.id ?? uniqueId('task')
    fixtureIds.taskIds.push(taskId)
    await prisma.task.create({
      data: {
        id: taskId,
        businessId: input.businessId ?? input.workspace.businessId,
        companyId:
          input.companyId === undefined ? input.workspace.companyId : input.companyId,
        decisionId: input.decisionId ?? null,
        title: input.title,
        dueAt: input.dueAt,
        priority: input.priority ?? TaskPriority.MEDIUM,
        status: input.status ?? TaskStatus.TODO,
        createdById: input.workspace.userId,
      },
    })
    return taskId
  }

  async function expectFixturesRemoved(
    ids: Required<KnownTestFixtureIds>,
  ): Promise<void> {
    const [tasks, decisions, companies, businesses, users] = await Promise.all([
      ids.taskIds.length > 0
        ? prisma.task.count({ where: { id: { in: ids.taskIds } } })
        : Promise.resolve(0),
      ids.decisionIds.length > 0
        ? prisma.decision.count({ where: { id: { in: ids.decisionIds } } })
        : Promise.resolve(0),
      ids.companyIds.length > 0
        ? prisma.company.count({ where: { id: { in: ids.companyIds } } })
        : Promise.resolve(0),
      ids.businessIds.length > 0
        ? prisma.business.count({ where: { id: { in: ids.businessIds } } })
        : Promise.resolve(0),
      ids.userIds.length > 0
        ? prisma.user.count({ where: { id: { in: ids.userIds } } })
        : Promise.resolve(0),
    ])

    expect({ tasks, decisions, companies, businesses, users }).toEqual({
      tasks: 0,
      decisions: 0,
      companies: 0,
      businesses: 0,
      users: 0,
    })
  }

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerListTodayTasksRoute(app, API_PREFIX, {
      now: () => NOW,
    })
    await app.ready()
  })

  afterEach(async () => {
    const completedFixtureIds = fixtureIds
    fixtureIds = emptyFixtureIds()
    await cleanupKnownTestFixtures(prisma, completedFixtureIds)
    await expectFixturesRemoved(completedFixtureIds)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
    await disconnectPrisma()
  })

  it('returns a TODO task due today with company and decision context', async () => {
    const workspace = await seedWorkspace('todo')
    const decisionId = await seedDecision(workspace, 'Follow up with the company')
    const dueAt = new Date('2026-10-11T12:00:00.000Z')
    const taskId = await seedTask({
      workspace,
      decisionId,
      title: 'Call the company',
      dueAt,
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
    })

    const response = await listTasks(workspace.businessId)
    const body = response.json<TodayTasksSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.tasks).toEqual([
      {
        id: taskId,
        title: 'Call the company',
        status: TaskStatus.TODO,
        dueAt: dueAt.toISOString(),
        priority: TaskPriority.HIGH,
        isOverdue: false,
        company: {
          id: workspace.companyId,
          name: workspace.companyName,
        },
        decision: {
          id: decisionId,
          title: 'Follow up with the company',
          status: DecisionStatus.ACTIVE,
        },
      },
    ])
  })

  it('returns an IN_PROGRESS task due today', async () => {
    const workspace = await seedWorkspace('progress')
    const dueAt = new Date('2026-10-11T09:00:00.000Z')
    const taskId = await seedTask({
      workspace,
      title: 'Prepare the notes',
      dueAt,
      status: TaskStatus.IN_PROGRESS,
    })

    const response = await listTasks(workspace.businessId)
    const body = response.json<TodayTasksSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.tasks).toEqual([
      expect.objectContaining({
        id: taskId,
        status: TaskStatus.IN_PROGRESS,
        dueAt: dueAt.toISOString(),
        isOverdue: false,
        company: {
          id: workspace.companyId,
          name: workspace.companyName,
        },
        decision: null,
      }),
    ])
  })

  it('returns an overdue task from before the local day', async () => {
    const workspace = await seedWorkspace('overdue')
    const dueAt = new Date('2026-10-10T18:00:00.000Z')
    const taskId = await seedTask({
      workspace,
      title: 'Send the overdue follow-up',
      dueAt,
    })

    const response = await listTasks(workspace.businessId)

    expect(response.statusCode).toBe(200)
    expect(response.json<TodayTasksSuccessBody>().data.tasks).toEqual([
      expect.objectContaining({
        id: taskId,
        dueAt: dueAt.toISOString(),
        isOverdue: true,
      }),
    ])
  })

  it('keeps a task due earlier today in the today group', async () => {
    const workspace = await seedWorkspace('earlier-today')
    const dueAt = new Date('2026-10-10T22:00:00.000Z')
    const taskId = await seedTask({
      workspace,
      title: 'Call earlier today',
      dueAt,
    })

    const response = await listTasks(workspace.businessId)

    expect(response.statusCode).toBe(200)
    expect(response.json<TodayTasksSuccessBody>().data.tasks).toEqual([
      expect.objectContaining({
        id: taskId,
        dueAt: dueAt.toISOString(),
        isOverdue: false,
      }),
    ])
  })

  it('excludes a future task', async () => {
    const workspace = await seedWorkspace('future')
    const todayId = await seedTask({
      workspace,
      title: 'Due today',
      dueAt: new Date('2026-10-11T12:00:00.000Z'),
    })
    const futureId = await seedTask({
      workspace,
      title: 'Due tomorrow',
      dueAt: new Date(MOSCOW_START_OF_TOMORROW),
    })

    const response = await listTasks(workspace.businessId)
    const ids = response.json<TodayTasksSuccessBody>().data.tasks.map((task) => task.id)

    expect(response.statusCode).toBe(200)
    expect(ids).toEqual([todayId])
    expect(ids).not.toContain(futureId)
  })

  it('excludes a DONE task', async () => {
    const workspace = await seedWorkspace('done')
    const openId = await seedTask({
      workspace,
      title: 'Still open',
      dueAt: new Date('2026-10-11T12:00:00.000Z'),
      status: TaskStatus.TODO,
    })
    const doneId = await seedTask({
      workspace,
      title: 'Already done',
      dueAt: new Date('2026-10-11T08:00:00.000Z'),
      status: TaskStatus.DONE,
    })

    const response = await listTasks(workspace.businessId)
    const ids = response.json<TodayTasksSuccessBody>().data.tasks.map((task) => task.id)

    expect(response.statusCode).toBe(200)
    expect(ids).toEqual([openId])
    expect(ids).not.toContain(doneId)
  })

  it('returns company null when the task has no company', async () => {
    const workspace = await seedWorkspace('no-company')
    const decisionId = await seedDecision(
      workspace,
      'Decision without a company',
      workspace.businessId,
      null,
    )
    const taskId = await seedTask({
      workspace,
      companyId: null,
      decisionId,
      title: 'Task without a company',
      dueAt: new Date('2026-10-11T11:00:00.000Z'),
    })

    const response = await listTasks(workspace.businessId)
    const task = response.json<TodayTasksSuccessBody>().data.tasks[0]

    expect(response.statusCode).toBe(200)
    expect(task).toMatchObject({
      id: taskId,
      company: null,
      decision: {
        id: decisionId,
        title: 'Decision without a company',
        status: DecisionStatus.ACTIVE,
      },
    })
  })

  it('returns a task without a decision', async () => {
    const workspace = await seedWorkspace('no-decision')
    const taskId = await seedTask({
      workspace,
      title: 'Task without a decision',
      dueAt: new Date('2026-10-11T10:00:00.000Z'),
      decisionId: null,
    })

    const response = await listTasks(workspace.businessId)
    const task = response.json<TodayTasksSuccessBody>().data.tasks[0]

    expect(response.statusCode).toBe(200)
    expect(task).toMatchObject({
      id: taskId,
      company: {
        id: workspace.companyId,
        name: workspace.companyName,
      },
      decision: null,
    })
  })

  it('excludes a task with null dueAt', async () => {
    const workspace = await seedWorkspace('null-due')
    const visibleId = await seedTask({
      workspace,
      title: 'Has a due date',
      dueAt: new Date('2026-10-11T12:00:00.000Z'),
    })
    const nullDueId = await seedTask({
      workspace,
      title: 'No due date',
      dueAt: null,
    })

    const response = await listTasks(workspace.businessId)
    const ids = response.json<TodayTasksSuccessBody>().data.tasks.map((task) => task.id)

    expect(response.statusCode).toBe(200)
    expect(ids).toEqual([visibleId])
    expect(ids).not.toContain(nullDueId)
  })

  it('sorts overdue tasks before today and by dueAt then id inside each group', async () => {
    const workspace = await seedWorkspace('sort')
    const prefix = uniqueId('sort-task')
    const specs = [
      ['overdue-tie-b', '2026-10-10T12:00:00.000Z'],
      ['overdue-tie-a', '2026-10-10T12:00:00.000Z'],
      ['today-tie-b', '2026-10-11T12:00:00.000Z'],
      ['overdue-late', '2026-10-10T20:00:00.000Z'],
      ['today-early', MOSCOW_START_OF_TODAY],
      ['overdue-early', '2026-10-09T08:00:00.000Z'],
      ['today-tie-a', '2026-10-11T12:00:00.000Z'],
      ['today-late', '2026-10-11T18:00:00.000Z'],
      ['future', MOSCOW_START_OF_TOMORROW],
    ] as const

    for (const [suffix, dueAt] of specs) {
      await seedTask({
        workspace,
        id: `${prefix}-${suffix}`,
        title: suffix,
        dueAt: new Date(dueAt),
      })
    }

    const response = await listTasks(workspace.businessId)
    const tasks = response.json<TodayTasksSuccessBody>().data.tasks

    expect(response.statusCode).toBe(200)
    expect(tasks.map((task) => task.id)).toEqual([
      `${prefix}-overdue-early`,
      `${prefix}-overdue-tie-a`,
      `${prefix}-overdue-tie-b`,
      `${prefix}-overdue-late`,
      `${prefix}-today-early`,
      `${prefix}-today-tie-a`,
      `${prefix}-today-tie-b`,
      `${prefix}-today-late`,
    ])
    expect(tasks.map((task) => task.isOverdue)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ])
  })

  it('classifies the same instants with the supplied timezone instead of UTC', async () => {
    const moscowWindow = resolveTodayTaskWindow(NOW, 'Europe/Moscow')
    const newYorkWindow = resolveTodayTaskWindow(NOW, 'America/New_York')

    expect(moscowWindow.startOfToday.toISOString()).toBe(MOSCOW_START_OF_TODAY)
    expect(moscowWindow.startOfTomorrow.toISOString()).toBe(MOSCOW_START_OF_TOMORROW)
    expect(newYorkWindow.startOfToday.toISOString()).toBe(NEW_YORK_START_OF_TODAY)
    expect(newYorkWindow.startOfTomorrow.toISOString()).toBe(NEW_YORK_START_OF_TOMORROW)

    const workspace = await seedWorkspace('boundary')
    const moscowOverdueNewYorkToday = await seedTask({
      workspace,
      title: 'Before Moscow midnight, during the New York day',
      dueAt: new Date('2026-10-10T20:00:00.000Z'),
    })
    const moscowTodayNewYorkFuture = await seedTask({
      workspace,
      title: 'During the Moscow day, after New York midnight',
      dueAt: new Date('2026-10-11T05:00:00.000Z'),
    })
    const localMidnight = await seedTask({
      workspace,
      title: 'Moscow local midnight',
      dueAt: new Date(MOSCOW_START_OF_TODAY),
    })
    const justBeforeNextMidnight = await seedTask({
      workspace,
      title: 'Last second of the Moscow day',
      dueAt: new Date('2026-10-11T20:59:59.000Z'),
    })
    const nextLocalMidnight = await seedTask({
      workspace,
      title: 'Next Moscow midnight',
      dueAt: new Date(MOSCOW_START_OF_TOMORROW),
    })

    const moscow = await listTasks(workspace.businessId, 'Europe/Moscow')
    const moscowTasks = moscow.json<TodayTasksSuccessBody>().data.tasks
    const newYork = await listTasks(workspace.businessId, 'America/New_York')
    const newYorkTasks = newYork.json<TodayTasksSuccessBody>().data.tasks

    expect(moscow.statusCode).toBe(200)
    expect(newYork.statusCode).toBe(200)
    expect(moscowTasks.map((task) => [task.id, task.isOverdue])).toEqual([
      [moscowOverdueNewYorkToday, true],
      [localMidnight, false],
      [moscowTodayNewYorkFuture, false],
      [justBeforeNextMidnight, false],
    ])
    expect(moscowTasks.map((task) => task.id)).not.toContain(nextLocalMidnight)
    expect(newYorkTasks.map((task) => [task.id, task.isOverdue])).toEqual([
      [moscowOverdueNewYorkToday, false],
      [localMidnight, false],
    ])
    expect(newYorkTasks.map((task) => task.id)).not.toContain(moscowTodayNewYorkFuture)
    expect(newYorkTasks.map((task) => task.id)).not.toContain(justBeforeNextMidnight)
    expect(newYorkTasks.map((task) => task.id)).not.toContain(nextLocalMidnight)
  })

  it('rejects an invalid timezone', async () => {
    const workspace = await seedWorkspace('timezone')
    const missing = await app.inject({
      method: 'GET',
      url: todayUrl(workspace.businessId),
    })
    const empty = await listTasks(workspace.businessId, ' ')
    const unknown = await listTasks(workspace.businessId, 'Not/AZone')
    const unknownBeforeLookup = await listTasks(uniqueId('missing-business'), 'Not/AZone')

    expect(missing.statusCode).toBe(400)
    expect(missing.json<ErrorBody>().error).toEqual({
      code: 'INVALID_TIME_ZONE',
      message: 'Invalid timezone.',
      details: {},
    })
    expect(empty.statusCode).toBe(400)
    expect(empty.json<ErrorBody>().error.code).toBe('INVALID_TIME_ZONE')
    expect(unknown.statusCode).toBe(400)
    expect(unknown.json<ErrorBody>().error.code).toBe('INVALID_TIME_ZONE')
    expect(unknownBeforeLookup.statusCode).toBe(400)
    expect(unknownBeforeLookup.json<ErrorBody>().error.code).toBe('INVALID_TIME_ZONE')
  })

  it('returns 404 when the business does not exist', async () => {
    const response = await listTasks(uniqueId('missing-business'))

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error).toEqual({
      code: 'BUSINESS_NOT_FOUND',
      message: 'Business not found.',
      details: {},
    })
  })

  it('excludes a task whose company belongs to another business', async () => {
    const alpha = await seedWorkspace('alpha-company')
    const beta = await seedWorkspace('beta-company')
    const alphaDecisionId = await seedDecision(alpha, 'Alpha decision')
    const validId = await seedTask({
      workspace: alpha,
      decisionId: alphaDecisionId,
      title: 'Valid alpha task',
      dueAt: new Date('2026-10-11T12:00:00.000Z'),
    })
    const crossCompanyId = await seedTask({
      workspace: alpha,
      companyId: beta.companyId,
      decisionId: alphaDecisionId,
      title: 'Cross company task',
      dueAt: new Date('2026-10-11T15:00:00.000Z'),
    })

    const response = await listTasks(alpha.businessId)
    const tasks = response.json<TodayTasksSuccessBody>().data.tasks

    expect(response.statusCode).toBe(200)
    expect(tasks.map((task) => task.id)).toEqual([validId])
    expect(tasks.map((task) => task.id)).not.toContain(crossCompanyId)
    expect(tasks[0]).toMatchObject({
      company: { id: alpha.companyId, name: alpha.companyName },
      decision: {
        id: alphaDecisionId,
        title: 'Alpha decision',
        status: DecisionStatus.ACTIVE,
      },
    })
    expect(JSON.stringify(tasks)).not.toContain(beta.companyName)
  })

  it('excludes a task whose decision belongs to another business', async () => {
    const alpha = await seedWorkspace('alpha-decision')
    const beta = await seedWorkspace('beta-decision')
    const alphaDecisionId = await seedDecision(alpha, 'Alpha decision')
    const betaDecisionId = await seedDecision(beta, 'Beta decision')
    const validId = await seedTask({
      workspace: alpha,
      decisionId: alphaDecisionId,
      title: 'Valid alpha task',
      dueAt: new Date('2026-10-11T12:00:00.000Z'),
    })
    const crossDecisionId = await seedTask({
      workspace: alpha,
      decisionId: betaDecisionId,
      title: 'Cross decision task',
      dueAt: new Date('2026-10-11T15:00:00.000Z'),
    })

    const response = await listTasks(alpha.businessId)
    const tasks = response.json<TodayTasksSuccessBody>().data.tasks

    expect(response.statusCode).toBe(200)
    expect(tasks.map((task) => task.id)).toEqual([validId])
    expect(tasks.map((task) => task.id)).not.toContain(crossDecisionId)
    expect(tasks[0]).toMatchObject({
      company: { id: alpha.companyId, name: alpha.companyName },
      decision: {
        id: alphaDecisionId,
        title: 'Alpha decision',
        status: DecisionStatus.ACTIVE,
      },
    })
    expect(JSON.stringify(tasks)).not.toContain('Beta decision')
  })

  it('excludes a task that belongs to another business', async () => {
    const alpha = await seedWorkspace('alpha-business')
    const beta = await seedWorkspace('beta-business')
    const alphaDecisionId = await seedDecision(alpha, 'Alpha decision')
    const betaDecisionId = await seedDecision(beta, 'Beta decision')
    const alphaTaskId = await seedTask({
      workspace: alpha,
      decisionId: alphaDecisionId,
      title: 'Alpha task',
      dueAt: new Date('2026-10-11T12:00:00.000Z'),
    })
    const betaTaskId = await seedTask({
      workspace: beta,
      decisionId: betaDecisionId,
      title: 'Beta task',
      dueAt: new Date('2026-10-10T18:00:00.000Z'),
    })

    const alphaResponse = await listTasks(alpha.businessId)
    const alphaTasks = alphaResponse.json<TodayTasksSuccessBody>().data.tasks
    const betaResponse = await listTasks(beta.businessId)
    const betaTasks = betaResponse.json<TodayTasksSuccessBody>().data.tasks

    expect(alphaResponse.statusCode).toBe(200)
    expect(alphaTasks.map((task) => task.id)).toEqual([alphaTaskId])
    expect(alphaTasks[0]).toMatchObject({
      company: { id: alpha.companyId, name: alpha.companyName },
      decision: {
        id: alphaDecisionId,
        title: 'Alpha decision',
        status: DecisionStatus.ACTIVE,
      },
    })
    expect(alphaTasks.map((task) => task.id)).not.toContain(betaTaskId)
    expect(JSON.stringify(alphaTasks)).not.toContain(beta.companyName)

    expect(betaTasks.map((task) => task.id)).toEqual([betaTaskId])
    expect(betaTasks[0]).toMatchObject({
      company: { id: beta.companyId, name: beta.companyName },
      decision: {
        id: betaDecisionId,
        title: 'Beta decision',
        status: DecisionStatus.ACTIVE,
      },
    })
    expect(betaTasks.map((task) => task.id)).not.toContain(alphaTaskId)
  })

  it('uses the 23-hour America/New_York spring-forward day', async () => {
    const now = new Date('2026-03-08T15:00:00.000Z')
    const window = resolveTodayTaskWindow(now, 'America/New_York')
    const dstApp = await openTodayApp(now)

    try {
      expect(window.startOfToday.toISOString()).toBe('2026-03-08T05:00:00.000Z')
      expect(window.startOfTomorrow.toISOString()).toBe('2026-03-09T04:00:00.000Z')
      expect(window.startOfTomorrow.getTime() - window.startOfToday.getTime()).toBe(
        23 * 60 * 60 * 1000,
      )

      const workspace = await seedWorkspace('ny-spring')
      const overdueId = await seedTask({
        workspace,
        title: 'Before the spring-forward day',
        dueAt: new Date('2026-03-08T04:30:00.000Z'),
      })
      const startId = await seedTask({
        workspace,
        title: 'Local midnight before the 02:00 transition',
        dueAt: new Date('2026-03-08T05:00:00.000Z'),
      })
      const earlierTodayId = await seedTask({
        workspace,
        title: 'Earlier on the spring-forward day',
        dueAt: new Date('2026-03-08T10:00:00.000Z'),
      })
      const lateTodayId = await seedTask({
        workspace,
        title: 'Still the spring-forward day',
        dueAt: new Date('2026-03-09T03:30:00.000Z'),
      })
      const nextDayId = await seedTask({
        workspace,
        title: 'First half-hour of the next local day',
        dueAt: new Date('2026-03-09T04:30:00.000Z'),
      })

      const response = await listTasks(workspace.businessId, 'America/New_York', dstApp)
      const tasks = response.json<TodayTasksSuccessBody>().data.tasks

      expect(response.statusCode).toBe(200)
      expect(tasks.map((task) => [task.id, task.isOverdue])).toEqual([
        [overdueId, true],
        [startId, false],
        [earlierTodayId, false],
        [lateTodayId, false],
      ])
      expect(tasks.map((task) => task.id)).not.toContain(nextDayId)
    } finally {
      await dstApp.close()
    }
  })

  it('uses the 25-hour America/New_York fall-back day', async () => {
    const now = new Date('2026-11-01T18:00:00.000Z')
    const window = resolveTodayTaskWindow(now, 'America/New_York')
    const dstApp = await openTodayApp(now)

    try {
      expect(window.startOfToday.toISOString()).toBe('2026-11-01T04:00:00.000Z')
      expect(window.startOfTomorrow.toISOString()).toBe('2026-11-02T05:00:00.000Z')
      expect(window.startOfTomorrow.getTime() - window.startOfToday.getTime()).toBe(
        25 * 60 * 60 * 1000,
      )

      const workspace = await seedWorkspace('ny-fall')
      const overdueId = await seedTask({
        workspace,
        title: 'Before the fall-back day',
        dueAt: new Date('2026-11-01T03:30:00.000Z'),
      })
      const startId = await seedTask({
        workspace,
        title: 'Local midnight of the fall-back day',
        dueAt: new Date('2026-11-01T04:00:00.000Z'),
      })
      const earlierTodayId = await seedTask({
        workspace,
        title: 'Earlier on the fall-back day',
        dueAt: new Date('2026-11-01T12:00:00.000Z'),
      })
      const extraHourId = await seedTask({
        workspace,
        title: 'Inside the extra hour of the fall-back day',
        dueAt: new Date('2026-11-02T04:30:00.000Z'),
      })
      const nextDayId = await seedTask({
        workspace,
        title: 'Next local midnight after the fall-back',
        dueAt: new Date('2026-11-02T05:00:00.000Z'),
      })

      const response = await listTasks(workspace.businessId, 'America/New_York', dstApp)
      const tasks = response.json<TodayTasksSuccessBody>().data.tasks

      expect(response.statusCode).toBe(200)
      expect(tasks.map((task) => [task.id, task.isOverdue])).toEqual([
        [overdueId, true],
        [startId, false],
        [earlierTodayId, false],
        [extraHourId, false],
      ])
      expect(tasks.map((task) => task.id)).not.toContain(nextDayId)
    } finally {
      await dstApp.close()
    }
  })

  it('starts the Atlantic/Azores spring-forward day after the skipped local midnight', async () => {
    const now = new Date('2026-03-29T12:00:00.000Z')
    const window = resolveTodayTaskWindow(now, 'Atlantic/Azores')
    const dstApp = await openTodayApp(now)

    try {
      expect(window.startOfToday.toISOString()).toBe('2026-03-29T01:00:00.000Z')
      expect(window.startOfToday.toISOString()).not.toBe('2026-03-29T00:00:00.000Z')
      expect(window.startOfTomorrow.toISOString()).toBe('2026-03-30T00:00:00.000Z')
      expect(window.startOfTomorrow.getTime() - window.startOfToday.getTime()).toBe(
        23 * 60 * 60 * 1000,
      )

      const workspace = await seedWorkspace('azores')
      const beforeGapId = await seedTask({
        workspace,
        title: 'Still the previous Azores day',
        dueAt: new Date('2026-03-29T00:30:00.000Z'),
      })
      const firstInstantId = await seedTask({
        workspace,
        title: '01:00 after the skipped midnight',
        dueAt: new Date('2026-03-29T01:00:00.000Z'),
      })
      const earlierTodayId = await seedTask({
        workspace,
        title: 'Earlier on the Azores transition day',
        dueAt: new Date('2026-03-29T04:00:00.000Z'),
      })
      const lateTodayId = await seedTask({
        workspace,
        title: 'Late on the Azores transition day',
        dueAt: new Date('2026-03-29T23:00:00.000Z'),
      })
      const nextDayId = await seedTask({
        workspace,
        title: 'After the Azores transition day',
        dueAt: new Date('2026-03-30T00:30:00.000Z'),
      })

      const response = await listTasks(workspace.businessId, 'Atlantic/Azores', dstApp)
      const tasks = response.json<TodayTasksSuccessBody>().data.tasks

      expect(response.statusCode).toBe(200)
      expect(tasks.map((task) => [task.id, task.isOverdue])).toEqual([
        [beforeGapId, true],
        [firstInstantId, false],
        [earlierTodayId, false],
        [lateTodayId, false],
      ])
      expect(tasks.map((task) => task.id)).not.toContain(nextDayId)
    } finally {
      await dstApp.close()
    }
  })
})
