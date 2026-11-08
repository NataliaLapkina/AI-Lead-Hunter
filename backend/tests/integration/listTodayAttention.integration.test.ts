import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  DecisionStatus,
  RecommendationPriority,
  RecommendationStatus,
  TaskCompletionOutcome,
  TaskPriority,
  TaskStatus,
  type PrismaClient,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerListTodayAttentionRoute } from '../../src/api/tasks/listTodayAttentionRoute.js'
import { registerListTodayTasksRoute } from '../../src/api/tasks/listTodayTasksRoute.js'
import { TODAY_ATTENTION_ITEM_LIMIT } from '../../src/domain/tasks/todayAttentionResponse.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'
const NOW = new Date('2026-10-11T02:30:00.000Z')

type AttentionItemJson = {
  id: string
  completedAt: string
  completionOutcome: 'FOLLOW_UP'
  title: string
  company: { id: string; name: string } | null
  decision: { id: string; title: string; status: DecisionStatus } | null
}

type AttentionSuccessBody = {
  data: {
    items: AttentionItemJson[]
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

describe('GET /api/v1/businesses/:businessId/today/attention', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-today-attention-${label}-${randomUUID()}`
  }

  function attentionUrl(businessId: string): string {
    return `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/today/attention`
  }

  function listAttention(businessId: string) {
    return app.inject({
      method: 'GET',
      url: attentionUrl(businessId),
    })
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

  async function seedCompany(
    workspace: Workspace,
    label: string,
    businessId = workspace.businessId,
  ): Promise<{ id: string; name: string }> {
    const id = uniqueId(`${label}-company`)
    const name = `${label} company`
    fixtureIds.companyIds.push(id)
    await prisma.company.create({
      data: {
        id,
        businessId,
        name,
        origin: CompanyOrigin.MANUAL,
        assessment: CompanyAssessment.SUITABLE,
        workState: CompanyWorkState.ACTIVE,
      },
    })
    return { id, name }
  }

  async function seedDecision(input: {
    workspace: Workspace
    title: string
    status?: DecisionStatus
    companyId?: string | null
    businessId?: string
  }): Promise<string> {
    const decisionId = uniqueId('decision')
    fixtureIds.decisionIds.push(decisionId)
    await prisma.decision.create({
      data: {
        id: decisionId,
        businessId: input.businessId ?? input.workspace.businessId,
        companyId:
          input.companyId === undefined ? input.workspace.companyId : input.companyId,
        title: input.title,
        decidedById: input.workspace.userId,
        status: input.status ?? DecisionStatus.ACTIVE,
      },
    })
    return decisionId
  }

  async function seedTask(input: {
    workspace: Workspace
    title: string
    status?: TaskStatus
    completionOutcome?: TaskCompletionOutcome | null
    completedAt?: Date | null
    dueAt?: Date | null
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
        dueAt: input.dueAt === undefined ? new Date('2026-10-01T09:00:00.000Z') : input.dueAt,
        priority: TaskPriority.MEDIUM,
        status: input.status ?? TaskStatus.DONE,
        completionOutcome: input.completionOutcome ?? null,
        completedAt: input.completedAt === undefined ? null : input.completedAt,
        createdById: input.workspace.userId,
      },
    })
    return taskId
  }

  async function seedFollowUp(input: {
    workspace: Workspace
    title: string
    completedAt: Date
    companyId?: string | null
    decisionId?: string | null
    businessId?: string
    id?: string
  }): Promise<string> {
    return seedTask({
      ...input,
      status: TaskStatus.DONE,
      completionOutcome: TaskCompletionOutcome.FOLLOW_UP,
    })
  }

  async function expectFixturesRemoved(
    ids: Required<KnownTestFixtureIds>,
  ): Promise<void> {
    const [tasks, decisions, recommendations, companies, businesses, users] = await Promise.all([
      ids.taskIds.length > 0
        ? prisma.task.count({ where: { id: { in: ids.taskIds } } })
        : Promise.resolve(0),
      ids.decisionIds.length > 0
        ? prisma.decision.count({ where: { id: { in: ids.decisionIds } } })
        : Promise.resolve(0),
      ids.recommendationIds.length > 0
        ? prisma.recommendation.count({ where: { id: { in: ids.recommendationIds } } })
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

    expect({ tasks, decisions, recommendations, companies, businesses, users }).toEqual({
      tasks: 0,
      decisions: 0,
      recommendations: 0,
      companies: 0,
      businesses: 0,
      users: 0,
    })
  }

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerListTodayAttentionRoute(app, API_PREFIX)
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

  it('includes a completed follow-up when no open task remains', async () => {
    const workspace = await seedWorkspace('include')
    const decisionId = await seedDecision({
      workspace,
      title: 'Return to this company',
    })
    const completedAt = new Date('2026-09-01T10:00:00.000Z')
    const taskId = await seedFollowUp({
      workspace,
      decisionId,
      title: 'Agreed to call again',
      completedAt,
    })

    const response = await listAttention(workspace.businessId)
    const body = response.json<AttentionSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.items).toEqual([
      {
        id: taskId,
        completedAt: completedAt.toISOString(),
        completionOutcome: 'FOLLOW_UP',
        title: 'Agreed to call again',
        company: {
          id: workspace.companyId,
          name: workspace.companyName,
        },
        decision: {
          id: decisionId,
          title: 'Return to this company',
          status: DecisionStatus.ACTIVE,
        },
      },
    ])
  })

  it('excludes other completion outcomes and non-done tasks', async () => {
    const workspace = await seedWorkspace('outcomes')
    const completedAt = new Date('2026-09-02T10:00:00.000Z')
    const includedId = await seedFollowUp({
      workspace,
      title: 'Follow up later',
      completedAt,
    })

    for (const outcome of [
      TaskCompletionOutcome.CONTACTED,
      TaskCompletionOutcome.NO_RESPONSE,
      TaskCompletionOutcome.DECLINED,
      TaskCompletionOutcome.OTHER,
    ]) {
      const company = await seedCompany(workspace, outcome)
      await seedTask({
        workspace,
        companyId: company.id,
        title: outcome,
        status: TaskStatus.DONE,
        completionOutcome: outcome,
        completedAt,
      })
    }

    const cancelledCompany = await seedCompany(workspace, 'cancelled')
    await seedTask({
      workspace,
      companyId: cancelledCompany.id,
      title: 'Cancelled follow up',
      status: TaskStatus.CANCELLED,
      completionOutcome: TaskCompletionOutcome.FOLLOW_UP,
      completedAt,
    })

    const todoCompany = await seedCompany(workspace, 'todo')
    await seedTask({
      workspace,
      companyId: todoCompany.id,
      title: 'Still open',
      status: TaskStatus.TODO,
      completionOutcome: TaskCompletionOutcome.FOLLOW_UP,
      completedAt,
    })

    const progressCompany = await seedCompany(workspace, 'progress')
    await seedTask({
      workspace,
      companyId: progressCompany.id,
      title: 'Still in progress',
      status: TaskStatus.IN_PROGRESS,
      completionOutcome: TaskCompletionOutcome.FOLLOW_UP,
      completedAt,
    })

    const missingCompletedAtCompany = await seedCompany(workspace, 'missing-time')
    await seedTask({
      workspace,
      companyId: missingCompletedAtCompany.id,
      title: 'Missing completedAt',
      status: TaskStatus.DONE,
      completionOutcome: TaskCompletionOutcome.FOLLOW_UP,
      completedAt: null,
    })

    const response = await listAttention(workspace.businessId)
    const body = response.json<AttentionSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.items.map((item) => item.id)).toEqual([includedId])
    expect(body.data.items[0]?.completionOutcome).toBe('FOLLOW_UP')
  })

  it('excludes a follow-up when an open task exists for the company or decision', async () => {
    const workspace = await seedWorkspace('open')
    const completedAt = new Date('2026-09-03T10:00:00.000Z')

    const todoCompany = await seedCompany(workspace, 'open-todo')
    await seedFollowUp({
      workspace,
      companyId: todoCompany.id,
      title: 'Follow up blocked by todo',
      completedAt,
    })
    await seedTask({
      workspace,
      companyId: todoCompany.id,
      title: 'Due tomorrow',
      status: TaskStatus.TODO,
      dueAt: new Date('2026-10-12T09:00:00.000Z'),
    })

    const progressCompany = await seedCompany(workspace, 'open-progress')
    await seedFollowUp({
      workspace,
      companyId: progressCompany.id,
      title: 'Follow up blocked by progress',
      completedAt,
    })
    await seedTask({
      workspace,
      companyId: progressCompany.id,
      title: 'Overdue open task',
      status: TaskStatus.IN_PROGRESS,
      dueAt: new Date('2026-10-01T09:00:00.000Z'),
    })

    const sourceCompany = await seedCompany(workspace, 'decision-source')
    const otherCompany = await seedCompany(workspace, 'decision-open')
    const decisionId = await seedDecision({
      workspace,
      title: 'Shared decision',
      companyId: sourceCompany.id,
    })
    await seedFollowUp({
      workspace,
      companyId: sourceCompany.id,
      decisionId,
      title: 'Follow up blocked by decision task',
      completedAt,
    })
    await seedTask({
      workspace,
      companyId: otherCompany.id,
      decisionId,
      title: 'Open task on the same decision',
      status: TaskStatus.TODO,
      dueAt: new Date('2026-10-20T09:00:00.000Z'),
    })

    const visibleCompany = await seedCompany(workspace, 'still-visible')
    const visibleId = await seedFollowUp({
      workspace,
      companyId: visibleCompany.id,
      title: 'Unblocked follow up',
      completedAt,
    })

    const response = await listAttention(workspace.businessId)
    const body = response.json<AttentionSuccessBody>()

    expect(body.data.items.map((item) => item.id)).toEqual([visibleId])
  })

  it('ignores needs-decision recommendations', async () => {
    const workspace = await seedWorkspace('recommendations')
    const recommendationIds: string[] = []
    for (const status of [RecommendationStatus.NEW, RecommendationStatus.VIEWED]) {
      const recommendationId = uniqueId(status)
      recommendationIds.push(recommendationId)
      fixtureIds.recommendationIds.push(recommendationId)
      await prisma.recommendation.create({
        data: {
          id: recommendationId,
          businessId: workspace.businessId,
          companyId: workspace.companyId,
          title: `${status} recommendation`,
          description: 'This belongs to needs decision.',
          reason: 'Not an attention item.',
          priority: RecommendationPriority.HIGH,
          status,
        },
      })
    }

    const before = await listAttention(workspace.businessId)
    expect(before.json<AttentionSuccessBody>().data.items).toEqual([])

    const taskId = await seedFollowUp({
      workspace,
      title: 'Follow up beside pending choices',
      completedAt: new Date('2026-09-04T10:00:00.000Z'),
    })
    const after = await listAttention(workspace.businessId)
    const body = after.json<AttentionSuccessBody>()

    expect(body.data.items.map((item) => item.id)).toEqual([taskId])
    expect(recommendationIds.every((id) => !JSON.stringify(body).includes(id))).toBe(true)
  })

  it('keeps tenants separate, including an open task that points at the same company', async () => {
    const current = await seedWorkspace('tenant-a')
    const other = await seedWorkspace('tenant-b')
    const completedAt = new Date('2026-09-05T10:00:00.000Z')
    const currentTaskId = await seedFollowUp({
      workspace: current,
      title: 'Current business follow up',
      completedAt,
    })
    await seedFollowUp({
      workspace: other,
      title: 'Other business follow up',
      completedAt,
    })
    await seedTask({
      workspace: other,
      businessId: other.businessId,
      companyId: current.companyId,
      title: 'Open task in another business',
      status: TaskStatus.TODO,
    })

    const currentResponse = await listAttention(current.businessId)
    const currentBody = currentResponse.json<AttentionSuccessBody>()
    expect(currentBody.data.items.map((item) => item.id)).toEqual([currentTaskId])
    expect(JSON.stringify(currentBody)).not.toContain(other.businessId)
    expect(JSON.stringify(currentBody)).not.toContain(other.companyId)

    const otherResponse = await listAttention(other.businessId)
    const otherBody = otherResponse.json<AttentionSuccessBody>()
    expect(otherBody.data.items.map((item) => item.id)).not.toContain(currentTaskId)
    expect(otherBody.data.items.map((item) => item.title)).toEqual([
      'Other business follow up',
    ])

    const missing = await listAttention(uniqueId('missing-business'))
    const error = missing.json<ErrorBody>()
    expect(missing.statusCode).toBe(404)
    expect(error.error.code).toBe('BUSINESS_NOT_FOUND')
  })

  it('returns one earliest item per company, then per decision', async () => {
    const workspace = await seedWorkspace('dedupe')
    const sharedCompany = await seedCompany(workspace, 'shared')
    const earlyDecisionId = await seedDecision({
      workspace,
      companyId: sharedCompany.id,
      title: 'Earlier decision',
    })
    const laterDecisionId = await seedDecision({
      workspace,
      companyId: sharedCompany.id,
      title: 'Later decision',
    })
    const earlyCompanyTaskId = await seedFollowUp({
      workspace,
      companyId: sharedCompany.id,
      decisionId: earlyDecisionId,
      title: 'Earliest company follow up',
      completedAt: new Date('2026-08-01T10:00:00.000Z'),
    })
    await seedFollowUp({
      workspace,
      companyId: sharedCompany.id,
      decisionId: laterDecisionId,
      title: 'Later company follow up',
      completedAt: new Date('2026-08-15T10:00:00.000Z'),
    })

    const tieCompletedAt = new Date('2026-08-20T10:00:00.000Z')
    const tieCompany = await seedCompany(workspace, 'tie')
    const laterTieId = `test-today-attention-tie-b-${randomUUID()}`
    const earlierTieId = `test-today-attention-tie-a-${randomUUID()}`
    expect(earlierTieId < laterTieId).toBe(true)
    await seedFollowUp({
      workspace,
      id: laterTieId,
      companyId: tieCompany.id,
      title: 'Later tie id',
      completedAt: tieCompletedAt,
    })
    await seedFollowUp({
      workspace,
      id: earlierTieId,
      companyId: tieCompany.id,
      title: 'Earlier tie id',
      completedAt: tieCompletedAt,
    })

    const decisionOnlyId = await seedDecision({
      workspace,
      companyId: null,
      title: 'Decision without company',
    })
    const earlyDecisionTaskId = await seedFollowUp({
      workspace,
      companyId: null,
      decisionId: decisionOnlyId,
      title: 'Earliest decision follow up',
      completedAt: new Date('2026-07-01T10:00:00.000Z'),
    })
    await seedFollowUp({
      workspace,
      companyId: null,
      decisionId: decisionOnlyId,
      title: 'Later decision follow up',
      completedAt: new Date('2026-07-20T10:00:00.000Z'),
    })

    const response = await listAttention(workspace.businessId)
    const body = response.json<AttentionSuccessBody>()
    const byId = new Map(body.data.items.map((item) => [item.id, item]))

    expect(body.data.items.map((item) => item.id)).toEqual([
      earlyDecisionTaskId,
      earlyCompanyTaskId,
      earlierTieId,
    ])
    expect(byId.get(earlyCompanyTaskId)?.decision?.id).toBe(earlyDecisionId)
    expect(byId.get(earlyCompanyTaskId)?.company?.id).toBe(sharedCompany.id)
    expect(byId.get(earlyDecisionTaskId)?.company).toBeNull()
    expect(byId.get(earlyDecisionTaskId)?.decision?.id).toBe(decisionOnlyId)
    expect(byId.get(earlierTieId)?.title).toBe('Earlier tie id')
  })

  it('orders the oldest follow-ups first and stops at the hard limit', async () => {
    const workspace = await seedWorkspace('limit')
    const ids: string[] = []

    for (let index = 0; index < TODAY_ATTENTION_ITEM_LIMIT + 1; index += 1) {
      const company = await seedCompany(workspace, `limit-${index}`)
      const id = await seedFollowUp({
        workspace,
        companyId: company.id,
        title: `Follow up ${index}`,
        completedAt: new Date(Date.UTC(2026, 0, 1, index, 0, 0)),
      })
      ids.push(id)
    }

    const response = await listAttention(workspace.businessId)
    const body = response.json<AttentionSuccessBody>()

    expect(body.data.items).toHaveLength(TODAY_ATTENTION_ITEM_LIMIT)
    expect(body.data.items.map((item) => item.id)).toEqual(
      ids.slice(0, TODAY_ATTENTION_ITEM_LIMIT),
    )
    const completedAtValues = body.data.items.map((item) => item.completedAt)
    expect(completedAtValues).toEqual([...completedAtValues].sort())
  })

  it('returns null company and decision when those relations are absent or outside the business', async () => {
    const workspace = await seedWorkspace('nullable')
    const other = await seedWorkspace('nullable-other')
    const outsideCompanyTaskId = await seedFollowUp({
      workspace,
      companyId: other.companyId,
      title: 'Company belongs to another business',
      completedAt: new Date('2026-06-01T10:00:00.000Z'),
    })
    const neitherId = await seedFollowUp({
      workspace,
      companyId: null,
      decisionId: null,
      title: 'No company or decision',
      completedAt: new Date('2026-06-02T10:00:00.000Z'),
    })
    const completedDecisionId = await seedDecision({
      workspace,
      companyId: null,
      title: 'Already completed decision',
      status: DecisionStatus.COMPLETED,
    })
    const completedDecisionTaskId = await seedFollowUp({
      workspace,
      companyId: null,
      decisionId: completedDecisionId,
      title: 'Decision is not active',
      completedAt: new Date('2026-06-03T10:00:00.000Z'),
    })

    const response = await listAttention(workspace.businessId)
    const body = response.json<AttentionSuccessBody>()
    const byId = new Map(body.data.items.map((item) => [item.id, item]))

    expect(byId.get(outsideCompanyTaskId)?.company).toBeNull()
    expect(byId.get(outsideCompanyTaskId)?.decision).toBeNull()
    expect(JSON.stringify(byId.get(outsideCompanyTaskId))).not.toContain(other.companyName)
    expect(byId.get(neitherId)?.company).toBeNull()
    expect(byId.get(neitherId)?.decision).toBeNull()
    expect(byId.get(completedDecisionTaskId)?.decision).toEqual({
      id: completedDecisionId,
      title: 'Already completed decision',
      status: DecisionStatus.COMPLETED,
    })
  })

  it('does not write and leaves open tasks on the today tasks endpoint', async () => {
    const workspace = await seedWorkspace('regression')
    const taskCountBefore = await prisma.task.count({
      where: { businessId: workspace.businessId },
    })
    const overdueId = await seedTask({
      workspace,
      title: 'Overdue open task',
      status: TaskStatus.TODO,
      dueAt: new Date('2026-10-01T09:00:00.000Z'),
    })
    const followUpCompany = await seedCompany(workspace, 'separate-follow-up')
    const followUpId = await seedFollowUp({
      workspace,
      companyId: followUpCompany.id,
      title: 'Completed follow up',
      completedAt: new Date('2026-09-06T10:00:00.000Z'),
    })

    const attention = await listAttention(workspace.businessId)
    const today = await app.inject({
      method: 'GET',
      url: `${API_PREFIX}/businesses/${encodeURIComponent(workspace.businessId)}/today/tasks?timezone=${encodeURIComponent('Europe/Moscow')}`,
    })

    expect(attention.json<AttentionSuccessBody>().data.items.map((item) => item.id)).toEqual([
      followUpId,
    ])
    const todayIds = today
      .json<{ data: { tasks: Array<{ id: string }> } }>()
      .data.tasks.map((task) => task.id)
    expect(todayIds).toContain(overdueId)
    expect(todayIds).not.toContain(followUpId)
    expect(
      await prisma.task.count({
        where: { businessId: workspace.businessId },
      }),
    ).toBe(taskCountBefore + 2)
  })
})
