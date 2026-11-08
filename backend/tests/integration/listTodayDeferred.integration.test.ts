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
import { registerListNeedsDecisionRecommendationsRoute } from '../../src/api/recommendations/listNeedsDecisionRecommendationsRoute.js'
import { registerListTodayDeferredRoute } from '../../src/api/recommendations/listTodayDeferredRoute.js'
import { TODAY_DEFERRED_ITEM_LIMIT } from '../../src/domain/recommendations/todayDeferredResponse.js'
import { findRecommendationsNeedingDecision } from '../../src/infrastructure/recommendations/recommendationRepository.js'
import { findTodayDeferredRecommendations } from '../../src/infrastructure/recommendations/recommendationRepository.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'

type DeferredItemJson = {
  id: string
  title: string
  status: 'NEW' | 'VIEWED'
  snoozedUntil: string
  company: { id: string; name: string } | null
}

type DeferredSuccessBody = {
  data: {
    items: DeferredItemJson[]
  }
}

type NeedsDecisionSuccessBody = {
  data: {
    recommendations: Array<{ id: string }>
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
    taskIds: [],
    knowledgeIds: [],
    companyIds: [],
    membershipIds: [],
    businessIds: [],
    userIds: [],
  }
}

describe('GET /api/v1/businesses/:businessId/today/deferred', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-today-deferred-${label}-${randomUUID()}`
  }

  function deferredUrl(businessId: string): string {
    return `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/today/deferred`
  }

  function listDeferred(businessId: string) {
    return app.inject({
      method: 'GET',
      url: deferredUrl(businessId),
    })
  }

  function listNeedsDecision(businessId: string) {
    return app.inject({
      method: 'GET',
      url: `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/recommendations/needs-decision`,
    })
  }

  async function seedBusiness(label: string): Promise<string> {
    const businessId = uniqueId(`${label}-business`)
    fixtureIds.businessIds.push(businessId)
    await prisma.business.create({
      data: {
        id: businessId,
        name: `${label} business`,
      },
    })
    return businessId
  }

  async function seedCompany(
    businessId: string,
    name: string,
    workState: CompanyWorkState = CompanyWorkState.ACTIVE,
  ): Promise<string> {
    const companyId = uniqueId('company')
    fixtureIds.companyIds.push(companyId)
    await prisma.company.create({
      data: {
        id: companyId,
        businessId,
        name,
        origin: CompanyOrigin.MANUAL,
        assessment: CompanyAssessment.SUITABLE,
        workState,
      },
    })
    return companyId
  }

  async function seedRecommendation(input: {
    businessId: string
    title?: string
    status?: RecommendationStatus
    snoozedUntil?: Date | null
    companyId?: string | null
    id?: string
  }): Promise<string> {
    const recommendationId = input.id ?? uniqueId('recommendation')
    fixtureIds.recommendationIds.push(recommendationId)
    await prisma.recommendation.create({
      data: {
        id: recommendationId,
        businessId: input.businessId,
        companyId: input.companyId ?? null,
        title: input.title ?? 'Return to this recommendation',
        description: 'Deferred recommendation description',
        reason: 'The user asked to decide later.',
        priority: RecommendationPriority.MEDIUM,
        status: input.status ?? RecommendationStatus.VIEWED,
        snoozedUntil: input.snoozedUntil === undefined ? null : input.snoozedUntil,
      },
    })
    return recommendationId
  }

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerListTodayDeferredRoute(app, API_PREFIX)
    await registerListNeedsDecisionRecommendationsRoute(app, API_PREFIX)
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

  it('includes NEW and VIEWED recommendations snoozed in the future', async () => {
    const businessId = await seedBusiness('include')
    const companyId = await seedCompany(businessId, 'Северная верфь')
    const future = new Date(Date.now() + 86_400_000)
    const viewedId = await seedRecommendation({
      businessId,
      title: 'Позвонить позже',
      status: RecommendationStatus.VIEWED,
      snoozedUntil: future,
      companyId,
    })
    const newId = await seedRecommendation({
      businessId,
      title: 'Новая отложенная',
      status: RecommendationStatus.NEW,
      snoozedUntil: new Date(future.getTime() + 1_000),
    })

    const response = await listDeferred(businessId)
    const body = response.json<DeferredSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.items).toEqual([
      {
        id: viewedId,
        title: 'Позвонить позже',
        status: 'VIEWED',
        snoozedUntil: future.toISOString(),
        company: {
          id: companyId,
          name: 'Северная верфь',
        },
      },
      {
        id: newId,
        title: 'Новая отложенная',
        status: 'NEW',
        snoozedUntil: new Date(future.getTime() + 1_000).toISOString(),
        company: null,
      },
    ])
    expect(body.data.items[0]).not.toHaveProperty('description')
    expect(body.data.items[0]).not.toHaveProperty('reason')
    expect(body.data.items[0]).not.toHaveProperty('priority')
    expect(body.data.items[0]).not.toHaveProperty('knowledge')
  })

  it('excludes a recommendation without snoozedUntil and one already due', async () => {
    const businessId = await seedBusiness('exclude-time')
    const openId = await seedRecommendation({
      businessId,
      snoozedUntil: null,
      status: RecommendationStatus.NEW,
    })
    const pastId = await seedRecommendation({
      businessId,
      snoozedUntil: new Date(Date.now() - 60_000),
      status: RecommendationStatus.VIEWED,
    })

    const response = await listDeferred(businessId)
    const deferredIds = response.json<DeferredSuccessBody>().data.items.map((item) => item.id)
    const needsDecisionIds = (await listNeedsDecision(businessId))
      .json<NeedsDecisionSuccessBody>()
      .data.recommendations.map((item) => item.id)

    expect(response.statusCode).toBe(200)
    expect(deferredIds).toEqual([])
    expect(needsDecisionIds).toEqual(expect.arrayContaining([openId, pastId]))
    expect(needsDecisionIds).toHaveLength(2)
  })

  it.each([
    RecommendationStatus.ACCEPTED,
    RecommendationStatus.MODIFIED,
    RecommendationStatus.REJECTED,
    RecommendationStatus.EXPIRED,
  ])('excludes terminal status %s even with a future snooze', async (status) => {
    const businessId = await seedBusiness('terminal')
    await seedRecommendation({
      businessId,
      status,
      snoozedUntil: new Date(Date.now() + 86_400_000),
    })

    const response = await listDeferred(businessId)

    expect(response.statusCode).toBe(200)
    expect(response.json<DeferredSuccessBody>().data.items).toEqual([])
  })

  it('keeps a future snooze only in deferred and a due snooze only in needs-decision', async () => {
    const businessId = await seedBusiness('boundary')
    const now = new Date()
    const futureId = await seedRecommendation({
      businessId,
      status: RecommendationStatus.VIEWED,
      snoozedUntil: new Date(now.getTime() + 3_600_000),
    })
    const dueId = await seedRecommendation({
      businessId,
      status: RecommendationStatus.VIEWED,
      snoozedUntil: now,
    })

    const deferredIds = (await listDeferred(businessId))
      .json<DeferredSuccessBody>()
      .data.items.map((item) => item.id)
    const needsDecisionIds = (await listNeedsDecision(businessId))
      .json<NeedsDecisionSuccessBody>()
      .data.recommendations.map((item) => item.id)

    expect(deferredIds).toEqual([futureId])
    expect(needsDecisionIds).toEqual([dueId])
    expect(deferredIds.filter((id) => needsDecisionIds.includes(id))).toEqual([])
  })

  it('uses a strict greater-than boundary against the same instant', async () => {
    const businessId = await seedBusiness('exact-now')
    const now = new Date()
    const recommendationId = await seedRecommendation({
      businessId,
      status: RecommendationStatus.NEW,
      snoozedUntil: now,
    })

    const deferred = await findTodayDeferredRecommendations(
      businessId,
      now,
      TODAY_DEFERRED_ITEM_LIMIT,
    )
    const needsDecision = await findRecommendationsNeedingDecision(businessId, now)

    expect(deferred.map((item) => item.id)).toEqual([])
    expect(needsDecision.map((item) => item.id)).toEqual([recommendationId])
  })

  it('does not return another business recommendation or a foreign company name', async () => {
    const businessId = await seedBusiness('tenant')
    const otherBusinessId = await seedBusiness('other')
    const foreignName = uniqueId('foreign-company-name')
    const foreignCompanyId = await seedCompany(otherBusinessId, foreignName)
    const foreignRecommendationId = await seedRecommendation({
      businessId: otherBusinessId,
      status: RecommendationStatus.VIEWED,
      snoozedUntil: new Date(Date.now() + 86_400_000),
      companyId: foreignCompanyId,
      title: 'Foreign deferred recommendation',
    })
    const linkedId = await seedRecommendation({
      businessId,
      status: RecommendationStatus.VIEWED,
      snoozedUntil: new Date(Date.now() + 86_400_000),
      companyId: foreignCompanyId,
      title: 'Linked across businesses',
    })

    const response = await listDeferred(businessId)
    const body = response.json<DeferredSuccessBody>()
    const serialized = JSON.stringify(body)

    expect(response.statusCode).toBe(200)
    expect(body.data.items.map((item) => item.id)).toEqual([linkedId])
    expect(body.data.items[0]?.company).toBeNull()
    expect(serialized).not.toContain(foreignRecommendationId)
    expect(serialized).not.toContain(foreignName)
    expect(serialized).not.toContain(foreignCompanyId)
  })

  it('returns BUSINESS_NOT_FOUND for an unknown business', async () => {
    const response = await listDeferred(uniqueId('missing'))
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('BUSINESS_NOT_FOUND')
    expect(body.error.details).toEqual({})
  })

  it('orders by snoozedUntil and then id, and keeps only 20', async () => {
    const businessId = await seedBusiness('order')
    const sameInstant = new Date(Date.now() + 2 * 86_400_000)
    const laterId = await seedRecommendation({
      id: uniqueId('tie-b'),
      businessId,
      snoozedUntil: sameInstant,
    })
    const earlierId = await seedRecommendation({
      id: uniqueId('tie-a'),
      businessId,
      snoozedUntil: sameInstant,
    })
    const nearestId = await seedRecommendation({
      businessId,
      snoozedUntil: new Date(Date.now() + 3_600_000),
    })
    const overflowBase = Date.now() + 10 * 86_400_000
    const overflowIds: string[] = []
    for (let index = 0; index < TODAY_DEFERRED_ITEM_LIMIT; index += 1) {
      overflowIds.push(
        await seedRecommendation({
          businessId,
          snoozedUntil: new Date(overflowBase + index * 1_000),
        }),
      )
    }

    const response = await listDeferred(businessId)
    const ids = response.json<DeferredSuccessBody>().data.items.map((item) => item.id)

    expect(ids).toHaveLength(TODAY_DEFERRED_ITEM_LIMIT)
    expect(ids.slice(0, 3)).toEqual([nearestId, earlierId, laterId])
    expect(ids).not.toContain(overflowIds[overflowIds.length - 1])
    expect(ids[3]).toBe(overflowIds[0])
  })

  it('does not return tasks, decisions, or paused companies as deferred items', async () => {
    const businessId = await seedBusiness('not-other-models')
    const userId = uniqueId('user')
    const pausedCompanyId = await seedCompany(
      businessId,
      'Paused company',
      CompanyWorkState.PAUSED,
    )
    fixtureIds.userIds.push(userId)
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: 'Deferred test user',
      },
    })
    const decisionId = uniqueId('decision')
    fixtureIds.decisionIds.push(decisionId)
    await prisma.decision.create({
      data: {
        id: decisionId,
        businessId,
        companyId: pausedCompanyId,
        title: 'Independent decision',
        decidedById: userId,
        status: DecisionStatus.ACTIVE,
      },
    })
    const taskId = uniqueId('task')
    fixtureIds.taskIds.push(taskId)
    await prisma.task.create({
      data: {
        id: taskId,
        businessId,
        companyId: pausedCompanyId,
        decisionId,
        title: 'Follow up later',
        dueAt: new Date(Date.now() + 86_400_000),
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.DONE,
        completionOutcome: TaskCompletionOutcome.FOLLOW_UP,
        completedAt: new Date(),
        createdById: userId,
      },
    })
    const recommendationId = await seedRecommendation({
      businessId,
      companyId: pausedCompanyId,
      status: RecommendationStatus.VIEWED,
      snoozedUntil: new Date(Date.now() + 86_400_000),
    })

    const response = await listDeferred(businessId)
    const serialized = JSON.stringify(response.json())

    expect(response.json<DeferredSuccessBody>().data.items.map((item) => item.id)).toEqual([
      recommendationId,
    ])
    expect(serialized).not.toContain(taskId)
    expect(serialized).not.toContain(decisionId)
  })

  it('does not change status or snoozedUntil when read twice', async () => {
    const businessId = await seedBusiness('readonly')
    const snoozedUntil = new Date(Date.now() + 86_400_000)
    const recommendationId = await seedRecommendation({
      businessId,
      status: RecommendationStatus.NEW,
      snoozedUntil,
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: recommendationId },
    })

    const first = await listDeferred(businessId)
    const second = await listDeferred(businessId)
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: recommendationId },
    })

    expect(first.statusCode).toBe(200)
    expect(second.json()).toEqual(first.json())
    expect(after.status).toBe(before.status)
    expect(after.snoozedUntil?.toISOString()).toBe(before.snoozedUntil?.toISOString())
    expect(after.updatedAt.toISOString()).toBe(before.updatedAt.toISOString())
  })
})
