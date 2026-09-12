import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  DecisionStatus,
  KnowledgeType,
  KnowledgeVerificationStatus,
  RecommendationPriority,
  RecommendationStatus,
  type PrismaClient,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerAcceptRecommendationRoute } from '../../src/api/recommendations/acceptRecommendationRoute.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'

type SeedOptions = {
  status?: RecommendationStatus
  snoozedUntil?: Date | null
  withMembership?: boolean
  withKnowledge?: boolean
  recommendationInOtherBusiness?: boolean
  companyInOtherBusiness?: boolean
}

type SeededRecommendation = {
  requestBusinessId: string
  recommendationBusinessId: string
  companyId: string
  userId: string
  recommendationId: string
  title: string
  description: string
  reason: string
  knowledgeId: string | null
}

type AcceptSuccessBody = {
  data: {
    recommendation: {
      id: string
      status: RecommendationStatus
      snoozedUntil: string | null
    }
    decision: {
      id: string
      recommendationId: string
      companyId: string | null
      title: string
      description: string | null
      status: DecisionStatus
      decidedById: string
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

describe('POST /api/v1/businesses/:businessId/recommendations/:recommendationId/accept', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-accept-${label}-${randomUUID()}`
  }

  async function seedRecommendation(
    options: SeedOptions = {},
  ): Promise<SeededRecommendation> {
    const requestBusinessId = uniqueId('business')
    const otherBusinessId =
      options.recommendationInOtherBusiness ||
      options.companyInOtherBusiness
        ? uniqueId('other-business')
        : null
    const recommendationBusinessId = options.recommendationInOtherBusiness
      ? (otherBusinessId as string)
      : requestBusinessId
    const companyBusinessId = options.companyInOtherBusiness
      ? (otherBusinessId as string)
      : recommendationBusinessId
    const userId = uniqueId('user')
    const membershipId = uniqueId('membership')
    const companyId = uniqueId('company')
    const recommendationId = uniqueId('recommendation')
    const knowledgeId = options.withKnowledge ? uniqueId('knowledge') : null
    const title = 'Prepare the first outreach'
    const description = 'Draft a short personalized introduction.'
    const reason = 'The company matches the active target profile.'

    fixtureIds.businessIds.push(requestBusinessId)
    if (otherBusinessId) fixtureIds.businessIds.push(otherBusinessId)
    fixtureIds.userIds.push(userId)
    fixtureIds.companyIds.push(companyId)
    fixtureIds.recommendationIds.push(recommendationId)
    if (options.withMembership !== false) {
      fixtureIds.membershipIds.push(membershipId)
    }
    if (knowledgeId) fixtureIds.knowledgeIds.push(knowledgeId)

    await prisma.business.create({
      data: {
        id: requestBusinessId,
        name: 'Accept test business',
      },
    })

    if (otherBusinessId) {
      await prisma.business.create({
        data: {
          id: otherBusinessId,
          name: 'Other accept test business',
        },
      })
    }

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: 'Accept test user',
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

    await prisma.company.create({
      data: {
        id: companyId,
        businessId: companyBusinessId,
        name: 'Accept test company',
        origin: CompanyOrigin.MANUAL,
        assessment: CompanyAssessment.SUITABLE,
        workState: CompanyWorkState.ACTIVE,
      },
    })

    await prisma.recommendation.create({
      data: {
        id: recommendationId,
        businessId: recommendationBusinessId,
        companyId,
        title,
        description,
        reason,
        priority: RecommendationPriority.HIGH,
        status: options.status ?? RecommendationStatus.NEW,
        snoozedUntil: options.snoozedUntil ?? null,
      },
    })

    if (knowledgeId) {
      await prisma.knowledge.create({
        data: {
          id: knowledgeId,
          businessId: recommendationBusinessId,
          companyId,
          content: 'The company has a public contact form.',
          type: KnowledgeType.FACT,
          verificationStatus: KnowledgeVerificationStatus.VERIFIED,
        },
      })
      await prisma.recommendationKnowledge.create({
        data: {
          recommendationId,
          knowledgeId,
        },
      })
    }

    return {
      requestBusinessId,
      recommendationBusinessId,
      companyId,
      userId,
      recommendationId,
      title,
      description,
      reason,
      knowledgeId,
    }
  }

  function acceptRecommendationRequest(
    businessId: string,
    recommendationId: string,
    payload?: Record<string, unknown>,
  ) {
    const request = {
      method: 'POST' as const,
      url: `${API_PREFIX}/businesses/${businessId}/recommendations/${recommendationId}/accept`,
    }

    return payload === undefined
      ? app.inject(request)
      : app.inject({ ...request, payload })
  }

  async function expectFixturesRemoved(
    ids: Required<KnownTestFixtureIds>,
  ): Promise<void> {
    const [
      recommendations,
      decisions,
      knowledge,
      companies,
      memberships,
      businesses,
      users,
    ] = await Promise.all([
      prisma.recommendation.count({
        where: { id: { in: ids.recommendationIds } },
      }),
      prisma.decision.count({
        where: {
          OR: [
            { id: { in: ids.decisionIds } },
            { recommendationId: { in: ids.recommendationIds } },
          ],
        },
      }),
      prisma.knowledge.count({
        where: { id: { in: ids.knowledgeIds } },
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
      recommendations,
      decisions,
      knowledge,
      companies,
      memberships,
      businesses,
      users,
    }).toEqual({
      recommendations: 0,
      decisions: 0,
      knowledge: 0,
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
    await registerAcceptRecommendationRoute(app, API_PREFIX)
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

  it('accepts a NEW recommendation and preserves unrelated state', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
      snoozedUntil: new Date(Date.now() + 86_400_000),
      withKnowledge: true,
    })
    const companyBefore = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId },
      select: {
        assessment: true,
        workState: true,
        updatedAt: true,
      },
    })
    const knowledgeBefore = await prisma.knowledge.findUniqueOrThrow({
      where: { id: fixture.knowledgeId as string },
    })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const body = response.json<AcceptSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation).toMatchObject({
      id: fixture.recommendationId,
      status: RecommendationStatus.ACCEPTED,
      snoozedUntil: null,
    })
    expect(body.data.decision).toMatchObject({
      recommendationId: fixture.recommendationId,
      companyId: fixture.companyId,
      title: fixture.title,
      description: fixture.description,
      status: DecisionStatus.ACTIVE,
      decidedById: fixture.userId,
    })
    expect(body.data.decision).not.toHaveProperty('reason')

    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
      include: {
        decisions: true,
        knowledgeLinks: true,
      },
    })
    expect(recommendation).toMatchObject({
      status: RecommendationStatus.ACCEPTED,
      snoozedUntil: null,
      title: fixture.title,
      description: fixture.description,
      reason: fixture.reason,
    })
    expect(recommendation.decisions).toHaveLength(1)
    expect(recommendation.decisions[0]).toMatchObject({
      businessId: fixture.recommendationBusinessId,
      companyId: fixture.companyId,
      recommendationId: fixture.recommendationId,
      decidedById: fixture.userId,
      title: fixture.title,
      description: fixture.description,
      status: DecisionStatus.ACTIVE,
    })
    expect(recommendation.knowledgeLinks).toHaveLength(1)

    const companyAfter = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId },
      select: {
        assessment: true,
        workState: true,
        updatedAt: true,
      },
    })
    const knowledgeAfter = await prisma.knowledge.findUniqueOrThrow({
      where: { id: fixture.knowledgeId as string },
    })
    const [tasks, interactions, outcomes] = await Promise.all([
      prisma.task.count({
        where: { businessId: fixture.recommendationBusinessId },
      }),
      prisma.interaction.count({
        where: { businessId: fixture.recommendationBusinessId },
      }),
      prisma.outcome.count({
        where: { businessId: fixture.recommendationBusinessId },
      }),
    ])

    expect(companyAfter).toEqual(companyBefore)
    expect(knowledgeAfter).toEqual(knowledgeBefore)
    expect({ tasks, interactions, outcomes }).toEqual({
      tasks: 0,
      interactions: 0,
      outcomes: 0,
    })
  })

  it('accepts a VIEWED recommendation', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
    })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const body = response.json<AcceptSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
      include: { decisions: true },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation.status).toBe(
      RecommendationStatus.ACCEPTED,
    )
    expect(body.data.recommendation.snoozedUntil).toBeNull()
    expect(recommendation.status).toBe(RecommendationStatus.ACCEPTED)
    expect(recommendation.decisions).toHaveLength(1)
    expect(recommendation.decisions[0]).toMatchObject({
      businessId: fixture.recommendationBusinessId,
      companyId: fixture.companyId,
      recommendationId: fixture.recommendationId,
      decidedById: fixture.userId,
      title: fixture.title,
      description: fixture.description,
      status: DecisionStatus.ACTIVE,
    })
  })

  it('clears snoozedUntil when accepting', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
      snoozedUntil: new Date(Date.now() + 172_800_000),
    })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
      select: { snoozedUntil: true },
    })

    expect(response.statusCode).toBe(200)
    expect(recommendation.snoozedUntil).toBeNull()
  })

  it('returns the existing Decision for an already ACCEPTED recommendation', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.ACCEPTED,
    })
    const decisionId = uniqueId('decision')
    fixtureIds.decisionIds.push(decisionId)
    await prisma.decision.create({
      data: {
        id: decisionId,
        businessId: fixture.recommendationBusinessId,
        companyId: fixture.companyId,
        recommendationId: fixture.recommendationId,
        title: fixture.title,
        description: fixture.description,
        decidedById: fixture.userId,
        status: DecisionStatus.ACTIVE,
      },
    })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const body = response.json<AcceptSuccessBody>()
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.decision.id).toBe(decisionId)
    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.id).toBe(decisionId)
  })

  it('recovers an ACCEPTED recommendation without a Decision', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.ACCEPTED,
    })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const body = response.json<AcceptSuccessBody>()
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(decisions).toHaveLength(1)
    expect(body.data.decision.id).toBe(decisions[0]?.id)
    expect(decisions[0]?.status).toBe(DecisionStatus.ACTIVE)
  })

  it('serializes concurrent accepts and creates one Decision', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
      snoozedUntil: new Date(Date.now() + 86_400_000),
    })

    const [firstResponse, secondResponse] = await Promise.all([
      acceptRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { decidedById: fixture.userId },
      ),
      acceptRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { decidedById: fixture.userId },
      ),
    ])
    const firstBody = firstResponse.json<AcceptSuccessBody>()
    const secondBody = secondResponse.json<AcceptSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisions = await prisma.decision.findMany({
      where: {
        businessId: fixture.recommendationBusinessId,
        recommendationId: fixture.recommendationId,
      },
    })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(firstBody.data.decision.id).toBe(secondBody.data.decision.id)
    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.id).toBe(firstBody.data.decision.id)
    expect(recommendation.status).toBe(RecommendationStatus.ACCEPTED)
    expect(recommendation.snoozedUntil).toBeNull()
  })

  it.each([
    RecommendationStatus.MODIFIED,
    RecommendationStatus.REJECTED,
    RecommendationStatus.EXPIRED,
  ])('rejects forbidden status %s', async (status) => {
    const fixture = await seedRecommendation({ status })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const body = response.json<ErrorBody>()
    const decisionCount = await prisma.decision.count({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_STATUS_CONFLICT')
    expect(body).not.toHaveProperty('data')
    expect(decisionCount).toBe(0)
  })

  it.each([
    ['missing', {}],
    ['empty', { decidedById: '' }],
    ['whitespace', { decidedById: '   ' }],
    ['non-string', { decidedById: 42 }],
  ])('rejects %s decidedById', async (_caseName, payload) => {
    const response = await acceptRecommendationRequest(
      uniqueId('missing-business'),
      uniqueId('missing-recommendation'),
      payload,
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_DECIDED_BY_ID')
  })

  it('returns BUSINESS_NOT_FOUND', async () => {
    const response = await acceptRecommendationRequest(
      uniqueId('missing-business'),
      uniqueId('missing-recommendation'),
      { decidedById: uniqueId('missing-user') },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('BUSINESS_NOT_FOUND')
  })

  it('does not disclose a Recommendation from another Business', async () => {
    const fixture = await seedRecommendation({
      recommendationInOtherBusiness: true,
    })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('RECOMMENDATION_NOT_FOUND')
    expect(body).not.toHaveProperty('data')
    expect(body.error.details).toEqual({})
  })

  it('returns USER_NOT_FOUND', async () => {
    const fixture = await seedRecommendation()

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: uniqueId('missing-user') },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('USER_NOT_FOUND')
  })

  it('returns USER_NOT_BUSINESS_MEMBER', async () => {
    const fixture = await seedRecommendation({
      withMembership: false,
    })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(403)
    expect(body.error.code).toBe('USER_NOT_BUSINESS_MEMBER')
  })

  it('returns RECOMMENDATION_COMPANY_CONFLICT for a cross-tenant Company', async () => {
    const fixture = await seedRecommendation({
      companyInOtherBusiness: true,
    })

    const response = await acceptRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { decidedById: fixture.userId },
    )
    const body = response.json<ErrorBody>()
    const decisionCount = await prisma.decision.count({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_COMPANY_CONFLICT')
    expect(decisionCount).toBe(0)
  })
})
