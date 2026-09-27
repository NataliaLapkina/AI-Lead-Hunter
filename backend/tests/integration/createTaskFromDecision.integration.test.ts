import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  DecisionStatus,
  RecommendationPriority,
  TaskPriority,
  TaskStatus,
  type PrismaClient,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerCreateTaskFromDecisionRoute } from '../../src/api/tasks/createTaskFromDecisionRoute.js'
import {
  DueAtNotInFutureError,
  createCreateTaskFromDecision,
} from '../../src/application/tasks/createTaskFromDecision.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import { runCreateTaskFromDecisionTransaction } from '../../src/infrastructure/tasks/taskRepository.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'

type SeedOptions = {
  decisionStatus?: DecisionStatus
  withMembership?: boolean
  withCompany?: boolean
  companyInOtherBusiness?: boolean
  decisionInOtherBusiness?: boolean
  withRecommendation?: boolean
}

type SeededDecision = {
  requestBusinessId: string
  decisionBusinessId: string
  decisionId: string
  companyId: string | null
  userId: string
  title: string
}

type CreateTaskSuccessBody = {
  data: {
    task: {
      id: string
      businessId: string
      companyId: string | null
      decisionId: string
      title: string
      description: string | null
      dueAt: string | null
      priority: string
      status: string
      assignedToId: string | null
      createdById: string
      completedAt: string | null
      createdAt: string
      updatedAt: string
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

function emptyFixtureIds(): Required<KnownTestFixtureIds> {
  return {
    recommendationIds: [],
    decisionIds: [],
    knowledgeIds: [],
    companyIds: [],
    membershipIds: [],
    businessIds: [],
    userIds: [],
  }
}

function futureDueAt(msFromNow = 86_400_000): string {
  return new Date(Date.now() + msFromNow).toISOString()
}

type TaskSnapshot = {
  id: string
  businessId: string
  companyId: string | null
  decisionId: string | null
  title: string
  description: string | null
  dueAt: string | null
  priority: string
  status: string
  assignedToId: string | null
  createdById: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

type HeldDecisionLock = {
  holderPid: number
  release: () => void
  finished: Promise<unknown>
}

function toTaskSnapshot(task: {
  id: string
  businessId: string
  companyId: string | null
  decisionId: string | null
  title: string
  description: string | null
  dueAt: Date | null
  priority: string
  status: string
  assignedToId: string | null
  createdById: string
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): TaskSnapshot {
  return {
    id: task.id,
    businessId: task.businessId,
    companyId: task.companyId,
    decisionId: task.decisionId,
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
  }
}

function asPidList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item))
}

async function waitUntil(
  predicate: () => Promise<boolean>,
  timeoutMs: number,
  failureMessage: string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await predicate()) {
      return
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 25)
    })
  }

  throw new Error(failureMessage)
}

async function holdDecisionLock(
  prisma: PrismaClient,
  businessId: string,
  decisionId: string,
): Promise<HeldDecisionLock> {
  let release!: () => void
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  let acquired!: (pid: number) => void
  const acquiredPid = new Promise<number>((resolve) => {
    acquired = resolve
  })

  const finished = prisma.$transaction(
    async (tx) => {
      const pidRows = await tx.$queryRaw<Array<{ pid: number }>>`
        SELECT pg_backend_pid() AS pid
      `
      await tx.$queryRaw`
        SELECT id
        FROM "Decision"
        WHERE id = ${decisionId}
          AND "businessId" = ${businessId}
        FOR UPDATE
      `
      acquired(Number(pidRows[0]?.pid))
      await released
    },
    { timeout: 15_000, maxWait: 5_000 },
  )

  return {
    holderPid: await acquiredPid,
    release,
    finished,
  }
}

async function isUseCaseBlockedByHolder(
  prisma: PrismaClient,
  waiterPid: number,
  holderPid: number,
): Promise<boolean> {
  const [blockers, activity] = await Promise.all([
    prisma.$queryRaw<Array<{ blockers: unknown }>>`
      SELECT pg_blocking_pids(${waiterPid}) AS blockers
    `,
    prisma.$queryRaw<Array<{ waitEventType: string | null }>>`
      SELECT wait_event_type AS "waitEventType"
      FROM pg_stat_activity
      WHERE pid = ${waiterPid}
    `,
  ])

  return (
    asPidList(blockers[0]?.blockers).includes(holderPid) &&
    activity[0]?.waitEventType === 'Lock'
  )
}

function createLockWaitCreateTask(input: {
  now: () => number
  onBackendPid: (pid: number) => void
}) {
  return createCreateTaskFromDecision({
    now: input.now,
    runTransaction: async (operation) =>
      runCreateTaskFromDecisionTransaction(async (repository) => {
        input.onBackendPid(await repository.backendPid())
        return operation(repository)
      }),
  })
}

async function waitForUseCaseBackendPid(pidKnown: Promise<number>): Promise<number> {
  return Promise.race([
    pidKnown,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Use case backend pid was not observed.'))
      }, 3_000)
    }),
  ])
}

describe('POST /api/v1/businesses/:businessId/decisions/:decisionId/tasks', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-create-task-${label}-${randomUUID()}`
  }

  async function seedDecision(options: SeedOptions = {}): Promise<SeededDecision> {
    const requestBusinessId = uniqueId('business')
    const otherBusinessId =
      options.companyInOtherBusiness || options.decisionInOtherBusiness
        ? uniqueId('other-business')
        : null
    const decisionBusinessId = options.decisionInOtherBusiness
      ? (otherBusinessId as string)
      : requestBusinessId
    const companyBusinessId = options.companyInOtherBusiness
      ? (otherBusinessId as string)
      : decisionBusinessId
    const userId = uniqueId('user')
    const membershipId = uniqueId('membership')
    const companyId = options.withCompany === false ? null : uniqueId('company')
    const decisionId = uniqueId('decision')
    const recommendationId = options.withRecommendation
      ? uniqueId('recommendation')
      : null
    const title = 'Prepare the first outreach'

    fixtureIds.businessIds.push(requestBusinessId)
    if (otherBusinessId) fixtureIds.businessIds.push(otherBusinessId)
    fixtureIds.userIds.push(userId)
    fixtureIds.decisionIds.push(decisionId)
    if (companyId) fixtureIds.companyIds.push(companyId)
    if (options.withMembership !== false) {
      fixtureIds.membershipIds.push(membershipId)
    }
    if (recommendationId) fixtureIds.recommendationIds.push(recommendationId)

    await prisma.business.create({
      data: {
        id: requestBusinessId,
        name: 'Create task test business',
      },
    })

    if (otherBusinessId) {
      await prisma.business.create({
        data: {
          id: otherBusinessId,
          name: 'Other create task test business',
        },
      })
    }

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: 'Create task test user',
      },
    })

    if (options.withMembership !== false) {
      await prisma.membership.create({
        data: {
          id: membershipId,
          businessId: requestBusinessId,
          userId,
        },
      })
    }

    if (companyId) {
      await prisma.company.create({
        data: {
          id: companyId,
          businessId: companyBusinessId,
          name: 'Create task test company',
          origin: CompanyOrigin.MANUAL,
          assessment: CompanyAssessment.SUITABLE,
          workState: CompanyWorkState.ACTIVE,
        },
      })
    }

    if (recommendationId) {
      await prisma.recommendation.create({
        data: {
          id: recommendationId,
          businessId: decisionBusinessId,
          companyId,
          title,
          description: 'Draft a short personalized introduction.',
          reason: 'The company matches the active target profile.',
          priority: RecommendationPriority.HIGH,
        },
      })
    }

    await prisma.decision.create({
      data: {
        id: decisionId,
        businessId: decisionBusinessId,
        companyId,
        recommendationId,
        title,
        description: 'Accepted next action.',
        decidedById: userId,
        status: options.decisionStatus ?? DecisionStatus.ACTIVE,
      },
    })

    return {
      requestBusinessId,
      decisionBusinessId,
      decisionId,
      companyId,
      userId,
      title,
    }
  }

  function createTaskRequest(
    businessId: string,
    decisionId: string,
    payload?: Record<string, unknown>,
  ) {
    const request = {
      method: 'POST' as const,
      url: `${API_PREFIX}/businesses/${businessId}/decisions/${decisionId}/tasks`,
    }

    return payload === undefined
      ? app.inject(request)
      : app.inject({ ...request, payload })
  }

  function validPayload(
    fixture: SeededDecision,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      createdById: fixture.userId,
      title: fixture.title,
      dueAt: futureDueAt(),
      ...overrides,
    }
  }

  async function expectFixturesRemoved(
    ids: Required<KnownTestFixtureIds>,
  ): Promise<void> {
    const [tasks, decisions, companies, memberships, businesses, users] =
      await Promise.all([
        prisma.task.count({
          where: { decisionId: { in: ids.decisionIds } },
        }),
        prisma.decision.count({
          where: { id: { in: ids.decisionIds } },
        }),
        prisma.company.count({
          where: { id: { in: ids.companyIds } },
        }),
        prisma.membership.count({
          where: { id: { in: ids.membershipIds } },
        }),
        prisma.business.count({
          where: { id: { in: ids.businessIds } },
        }),
        prisma.user.count({
          where: { id: { in: ids.userIds } },
        }),
      ])

    expect({
      tasks,
      decisions,
      companies,
      memberships,
      businesses,
      users,
    }).toEqual({
      tasks: 0,
      decisions: 0,
      companies: 0,
      memberships: 0,
      businesses: 0,
      users: 0,
    })
  }

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerCreateTaskFromDecisionRoute(app, API_PREFIX)
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

  it('creates a Task from an ACTIVE Decision with server-derived fields', async () => {
    const fixture = await seedDecision()
    const dueAt = futureDueAt()

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, { dueAt }),
    )
    const body = response.json<CreateTaskSuccessBody>()
    const tasks = await prisma.task.findMany({
      where: {
        businessId: fixture.requestBusinessId,
        decisionId: fixture.decisionId,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(tasks).toHaveLength(1)
    expect(body.data.task).toMatchObject({
      id: tasks[0]?.id,
      businessId: fixture.requestBusinessId,
      companyId: fixture.companyId,
      decisionId: fixture.decisionId,
      title: fixture.title,
      description: null,
      dueAt,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      assignedToId: fixture.userId,
      createdById: fixture.userId,
      completedAt: null,
    })
    expect(tasks[0]).toMatchObject({
      businessId: fixture.requestBusinessId,
      companyId: fixture.companyId,
      decisionId: fixture.decisionId,
      assignedToId: fixture.userId,
      createdById: fixture.userId,
      status: TaskStatus.TODO,
      description: null,
      completedAt: null,
    })
  })

  it('inherits companyId from Decision and does not require a Recommendation', async () => {
    const fixture = await seedDecision({ withRecommendation: false })

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture),
    )
    const body = response.json<CreateTaskSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.task.companyId).toBe(fixture.companyId)
    expect(body.data.task.decisionId).toBe(fixture.decisionId)
    expect(
      await prisma.recommendation.count({
        where: { businessId: fixture.requestBusinessId },
      }),
    ).toBe(0)
  })

  it('defaults omitted priority to MEDIUM and accepts LOW and HIGH', async () => {
    const mediumFixture = await seedDecision()
    const lowFixture = await seedDecision()
    const highFixture = await seedDecision()

    const omitted = await createTaskRequest(
      mediumFixture.requestBusinessId,
      mediumFixture.decisionId,
      {
        createdById: mediumFixture.userId,
        title: mediumFixture.title,
        dueAt: futureDueAt(),
      },
    )
    const low = await createTaskRequest(
      lowFixture.requestBusinessId,
      lowFixture.decisionId,
      validPayload(lowFixture, { priority: 'LOW' }),
    )
    const high = await createTaskRequest(
      highFixture.requestBusinessId,
      highFixture.decisionId,
      validPayload(highFixture, { priority: 'HIGH' }),
    )

    expect(omitted.statusCode).toBe(200)
    expect(omitted.json<CreateTaskSuccessBody>().data.task.priority).toBe(
      TaskPriority.MEDIUM,
    )
    expect(low.json<CreateTaskSuccessBody>().data.task.priority).toBe(
      TaskPriority.LOW,
    )
    expect(high.json<CreateTaskSuccessBody>().data.task.priority).toBe(
      TaskPriority.HIGH,
    )
  })

  it('rejects an invalid priority', async () => {
    const fixture = await seedDecision()

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, { priority: 'CRITICAL' }),
    )

    expect(response.statusCode).toBe(400)
    expect(response.json<ErrorBody>().error.code).toBe('INVALID_TASK_PRIORITY')
    expect(
      await prisma.task.count({ where: { decisionId: fixture.decisionId } }),
    ).toBe(0)
  })

  it('trims title and enforces 1-500 Unicode code points', async () => {
    const fixture = await seedDecision()
    const thumb = '👍'

    const trimmed = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, { title: '  Позвонить  ' }),
    )
    expect(trimmed.statusCode).toBe(200)
    expect(trimmed.json<CreateTaskSuccessBody>().data.task.title).toBe('Позвонить')

    const onePoint = await seedDecision()
    const one = await createTaskRequest(
      onePoint.requestBusinessId,
      onePoint.decisionId,
      validPayload(onePoint, { title: thumb }),
    )
    expect(one.statusCode).toBe(200)
    expect(one.json<CreateTaskSuccessBody>().data.task.title).toBe(thumb)

    const fiveHundred = await seedDecision()
    const exact = await createTaskRequest(
      fiveHundred.requestBusinessId,
      fiveHundred.decisionId,
      validPayload(fiveHundred, { title: thumb.repeat(500) }),
    )
    expect(exact.statusCode).toBe(200)
    expect(
      Array.from(exact.json<CreateTaskSuccessBody>().data.task.title).length,
    ).toBe(500)

    const tooLong = await seedDecision()
    const rejected = await createTaskRequest(
      tooLong.requestBusinessId,
      tooLong.decisionId,
      validPayload(tooLong, { title: thumb.repeat(501) }),
    )
    expect(rejected.statusCode).toBe(400)
    expect(rejected.json<ErrorBody>().error.code).toBe('INVALID_TASK_TITLE')
  })

  it('rejects missing or empty createdById', async () => {
    const fixture = await seedDecision()

    const missing = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      {
        title: fixture.title,
        dueAt: futureDueAt(),
      },
    )
    const empty = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, { createdById: '   ' }),
    )

    expect(missing.statusCode).toBe(400)
    expect(missing.json<ErrorBody>().error.code).toBe('INVALID_CREATED_BY_ID')
    expect(empty.statusCode).toBe(400)
    expect(empty.json<ErrorBody>().error.code).toBe('INVALID_CREATED_BY_ID')
  })

  it('rejects a missing User', async () => {
    const fixture = await seedDecision()

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, { createdById: uniqueId('missing-user') }),
    )

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('USER_NOT_FOUND')
  })

  it('rejects a User without Membership', async () => {
    const fixture = await seedDecision({ withMembership: false })

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture),
    )

    expect(response.statusCode).toBe(403)
    expect(response.json<ErrorBody>().error.code).toBe(
      'USER_NOT_BUSINESS_MEMBER',
    )
  })

  it('rejects invalid, date-only, and past dueAt', async () => {
    const fixture = await seedDecision()

    const invalid = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, { dueAt: 'not-a-date' }),
    )
    const dateOnly = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, { dueAt: '2026-12-01' }),
    )
    const past = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, {
        dueAt: new Date(Date.now() - 86_400_000).toISOString(),
      }),
    )

    expect(invalid.statusCode).toBe(400)
    expect(invalid.json<ErrorBody>().error.code).toBe('INVALID_DUE_AT')
    expect(dateOnly.statusCode).toBe(400)
    expect(dateOnly.json<ErrorBody>().error.code).toBe('INVALID_DUE_AT')
    expect(past.statusCode).toBe(400)
    expect(past.json<ErrorBody>().error.code).toBe('DUE_AT_NOT_IN_FUTURE')
  })

  it('accepts a future RFC3339 dueAt', async () => {
    const fixture = await seedDecision()
    const dueAt = '2030-01-15T09:00:00.000Z'

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, { dueAt }),
    )

    expect(response.statusCode).toBe(200)
    expect(response.json<CreateTaskSuccessBody>().data.task.dueAt).toBe(dueAt)
  })

  it('returns 404 BUSINESS_NOT_FOUND for a missing Business', async () => {
    const response = await createTaskRequest(
      uniqueId('missing-business'),
      uniqueId('decision'),
      {
        createdById: uniqueId('user'),
        title: 'Prepare the first outreach',
        dueAt: futureDueAt(),
      },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error).toEqual({
      code: 'BUSINESS_NOT_FOUND',
      message: 'Business not found.',
      details: {},
    })
  })

  it('returns 404 when the Decision is missing', async () => {
    const fixture = await seedDecision()

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      uniqueId('missing-decision'),
      validPayload(fixture),
    )

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('DECISION_NOT_FOUND')
  })

  it('hides a cross-tenant Decision as DECISION_NOT_FOUND', async () => {
    const fixture = await seedDecision({ decisionInOtherBusiness: true })

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture),
    )

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('DECISION_NOT_FOUND')
    expect(
      await prisma.task.count({ where: { decisionId: fixture.decisionId } }),
    ).toBe(0)
  })

  it.each([
    DecisionStatus.COMPLETED,
    DecisionStatus.CANCELLED,
    DecisionStatus.SUPERSEDED,
  ])('rejects Decision status %s', async (decisionStatus) => {
    const fixture = await seedDecision({ decisionStatus })

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture),
    )

    expect(response.statusCode).toBe(409)
    expect(response.json<ErrorBody>().error.code).toBe(
      'DECISION_STATUS_CONFLICT',
    )
  })

  it('rejects a Decision company that does not belong to the Business', async () => {
    const fixture = await seedDecision({ companyInOtherBusiness: true })

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture),
    )

    expect(response.statusCode).toBe(409)
    expect(response.json<ErrorBody>().error.code).toBe(
      'DECISION_COMPANY_CONFLICT',
    )
  })

  it('returns the same open Task on repeat and does not mutate it', async () => {
    const fixture = await seedDecision()
    const originalDueAt = futureDueAt()

    const first = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, {
        dueAt: originalDueAt,
        priority: 'LOW',
        title: 'Original title',
      }),
    )
    const second = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, {
        dueAt: futureDueAt(172_800_000),
        priority: 'HIGH',
        title: 'Changed title',
      }),
    )
    const firstBody = first.json<CreateTaskSuccessBody>()
    const secondBody = second.json<CreateTaskSuccessBody>()
    const tasks = await prisma.task.findMany({
      where: { decisionId: fixture.decisionId },
    })

    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(200)
    expect(secondBody.data.task.id).toBe(firstBody.data.task.id)
    expect(secondBody.data.task.title).toBe('Original title')
    expect(secondBody.data.task.priority).toBe(TaskPriority.LOW)
    expect(secondBody.data.task.dueAt).toBe(originalDueAt)
    expect(tasks).toHaveLength(1)
  })

  it('rechecks dueAt after the Decision lock wait before creating a Task', async () => {
    const fixture = await seedDecision()
    let currentTime = Date.parse('2030-01-01T00:00:00.000Z')
    const dueAt = '2030-01-01T00:00:05.000Z'
    let waiterPid: number | undefined
    let waiterPidReady!: (pid: number) => void
    const waiterPidIsKnown = new Promise<number>((resolve) => {
      waiterPidReady = resolve
    })
    const heldLock = await holdDecisionLock(
      prisma,
      fixture.requestBusinessId,
      fixture.decisionId,
    )
    const createTask = createLockWaitCreateTask({
      now: () => currentTime,
      onBackendPid: waiterPidReady,
    })
    const createPromise = createTask({
      businessId: fixture.requestBusinessId,
      decisionId: fixture.decisionId,
      createdById: fixture.userId,
      title: fixture.title,
      dueAt,
    })

    try {
      waiterPid = await waitForUseCaseBackendPid(waiterPidIsKnown)
      await waitUntil(
        () => isUseCaseBlockedByHolder(prisma, waiterPid as number, heldLock.holderPid),
        3_000,
        `Use case pid ${waiterPid} was not blocked by holder pid ${heldLock.holderPid}.`,
      )

      currentTime = Date.parse('2030-01-01T00:00:10.000Z')
      heldLock.release()

      await expect(createPromise).rejects.toBeInstanceOf(DueAtNotInFutureError)
      await heldLock.finished
    } finally {
      heldLock.release()
      await Promise.allSettled([createPromise, heldLock.finished])
    }

    expect(
      await prisma.task.count({ where: { decisionId: fixture.decisionId } }),
    ).toBe(0)
  })

  it('returns an existing open Task after lock wait without mutating it', async () => {
    const fixture = await seedDecision()
    let currentTime = Date.parse('2030-01-01T00:00:00.000Z')
    const dueAt = '2030-01-01T00:00:05.000Z'
    const existingTask = await prisma.task.create({
      data: {
        businessId: fixture.requestBusinessId,
        companyId: fixture.companyId,
        decisionId: fixture.decisionId,
        title: 'Original title',
        dueAt: new Date('2030-01-01T01:00:00.000Z'),
        priority: TaskPriority.LOW,
        status: TaskStatus.TODO,
        assignedToId: fixture.userId,
        createdById: fixture.userId,
      },
    })
    const snapshot = toTaskSnapshot(existingTask)
    let waiterPid: number | undefined
    let waiterPidReady!: (pid: number) => void
    const waiterPidIsKnown = new Promise<number>((resolve) => {
      waiterPidReady = resolve
    })
    const heldLock = await holdDecisionLock(
      prisma,
      fixture.requestBusinessId,
      fixture.decisionId,
    )
    const createTask = createLockWaitCreateTask({
      now: () => currentTime,
      onBackendPid: waiterPidReady,
    })
    const createPromise = createTask({
      businessId: fixture.requestBusinessId,
      decisionId: fixture.decisionId,
      createdById: fixture.userId,
      title: 'Changed title',
      dueAt,
      priority: TaskPriority.HIGH,
    })

    try {
      waiterPid = await waitForUseCaseBackendPid(waiterPidIsKnown)
      await waitUntil(
        () => isUseCaseBlockedByHolder(prisma, waiterPid as number, heldLock.holderPid),
        3_000,
        `Use case pid ${waiterPid} was not blocked by holder pid ${heldLock.holderPid}.`,
      )

      currentTime = Date.parse('2030-01-01T00:00:10.000Z')
      heldLock.release()

      const result = await createPromise
      const persisted = await prisma.task.findUniqueOrThrow({
        where: { id: existingTask.id },
      })

      expect(result.task).toEqual(snapshot)
      expect(toTaskSnapshot(persisted)).toEqual(snapshot)
      expect(persisted.updatedAt.toISOString()).toBe(snapshot.updatedAt)
      expect(
        await prisma.task.count({ where: { decisionId: fixture.decisionId } }),
      ).toBe(1)

      await heldLock.finished
    } finally {
      heldLock.release()
      await Promise.allSettled([createPromise, heldLock.finished])
    }
  })

  it('serializes concurrent POSTs into one Task row', async () => {
    const fixture = await seedDecision()
    const payload = validPayload(fixture)

    const [firstResponse, secondResponse] = await Promise.all([
      createTaskRequest(fixture.requestBusinessId, fixture.decisionId, payload),
      createTaskRequest(fixture.requestBusinessId, fixture.decisionId, payload),
    ])
    const firstBody = firstResponse.json<CreateTaskSuccessBody>()
    const secondBody = secondResponse.json<CreateTaskSuccessBody>()
    const tasks = await prisma.task.findMany({
      where: {
        businessId: fixture.requestBusinessId,
        decisionId: fixture.decisionId,
      },
    })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(firstBody.data.task.id).toBe(secondBody.data.task.id)
    expect(tasks).toHaveLength(1)
  })

  it('ignores body attempts to override server-derived fields', async () => {
    const fixture = await seedDecision()

    const response = await createTaskRequest(
      fixture.requestBusinessId,
      fixture.decisionId,
      validPayload(fixture, {
        businessId: uniqueId('spoof-business'),
        companyId: uniqueId('spoof-company'),
        decisionId: uniqueId('spoof-decision'),
        assignedToId: uniqueId('spoof-assignee'),
        status: TaskStatus.DONE,
        description: 'should be ignored',
        now: 0,
      }),
    )
    const body = response.json<CreateTaskSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.task.businessId).toBe(fixture.requestBusinessId)
    expect(body.data.task.companyId).toBe(fixture.companyId)
    expect(body.data.task.decisionId).toBe(fixture.decisionId)
    expect(body.data.task.assignedToId).toBe(fixture.userId)
    expect(body.data.task.status).toBe(TaskStatus.TODO)
    expect(body.data.task.description).toBeNull()
  })
})
