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
  type Recommendation,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { registerAcceptRecommendationRoute } from '../../src/api/recommendations/acceptRecommendationRoute.js'
import { registerSnoozeRecommendationRoute } from '../../src/api/recommendations/snoozeRecommendationRoute.js'
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

type SnoozeSuccessBody = {
  data: {
    recommendation: {
      id: string
      status: RecommendationStatus
      snoozedUntil: string
      updatedAt: string
    }
  }
}

type AcceptSuccessBody = {
  data: {
    recommendation: {
      id: string
      status: RecommendationStatus
      snoozedUntil: null
    }
    decision: {
      id: string
      status: DecisionStatus
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

function withoutSnoozeMutableFields(recommendation: Recommendation) {
  const { status, snoozedUntil, updatedAt, ...preservedFields } = recommendation
  void status
  void snoozedUntil
  void updatedAt
  return preservedFields
}

describe('POST /api/v1/businesses/:businessId/recommendations/:recommendationId/snooze', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-snooze-${label}-${randomUUID()}`
  }

  function futureDate(offsetMs: number): string {
    return new Date(Date.now() + offsetMs).toISOString()
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
    fixtureIds.membershipIds.push(membershipId)
    fixtureIds.companyIds.push(companyId)
    fixtureIds.recommendationIds.push(recommendationId)
    if (knowledgeId) fixtureIds.knowledgeIds.push(knowledgeId)

    await prisma.business.create({
      data: {
        id: requestBusinessId,
        name: 'Snooze test business',
      },
    })

    if (otherBusinessId) {
      await prisma.business.create({
        data: {
          id: otherBusinessId,
          name: 'Other snooze test business',
        },
      })
    }

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: 'Snooze test user',
      },
    })

    await prisma.membership.create({
      data: {
        id: membershipId,
        businessId: requestBusinessId,
        userId,
      },
    })

    await prisma.company.create({
      data: {
        id: companyId,
        businessId: companyBusinessId,
        name: 'Snooze test company',
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

  function snoozeRecommendationRequest(
    businessId: string,
    recommendationId: string,
    payload?: Record<string, unknown>,
  ) {
    const request = {
      method: 'POST' as const,
      url: `${API_PREFIX}/businesses/${businessId}/recommendations/${recommendationId}/snooze`,
    }

    return payload === undefined
      ? app.inject(request)
      : app.inject({ ...request, payload })
  }

  function acceptRecommendationRequest(
    businessId: string,
    recommendationId: string,
    decidedById: string,
  ) {
    return app.inject({
      method: 'POST',
      url: `${API_PREFIX}/businesses/${businessId}/recommendations/${recommendationId}/accept`,
      payload: { decidedById },
    })
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
    await registerSnoozeRecommendationRoute(app, API_PREFIX)
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

  it('snoozes a NEW recommendation and preserves unrelated state', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
      withKnowledge: true,
    })
    const snoozedUntil = futureDate(86_400_000)
    const knownEarlierUpdatedAt = new Date('2020-01-01T00:00:00.000Z')
    await prisma.recommendation.update({
      where: { id: fixture.recommendationId },
      data: { updatedAt: knownEarlierUpdatedAt },
    })
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyBefore = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId },
    })
    const knowledgeBefore = await prisma.knowledge.findUniqueOrThrow({
      where: { id: fixture.knowledgeId as string },
    })
    const knowledgeLinkBefore =
      await prisma.recommendationKnowledge.findUniqueOrThrow({
        where: {
          recommendationId_knowledgeId: {
            recommendationId: fixture.recommendationId,
            knowledgeId: fixture.knowledgeId as string,
          },
        },
      })

    const response = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil },
    )
    const body = response.json<SnoozeSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const companyAfter = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId },
    })
    const knowledgeAfter = await prisma.knowledge.findUniqueOrThrow({
      where: { id: fixture.knowledgeId as string },
    })
    const knowledgeLinkAfter =
      await prisma.recommendationKnowledge.findUniqueOrThrow({
        where: {
          recommendationId_knowledgeId: {
            recommendationId: fixture.recommendationId,
            knowledgeId: fixture.knowledgeId as string,
          },
        },
      })
    const [decisions, tasks, interactions, outcomes] = await Promise.all([
      prisma.decision.count({
        where: { businessId: fixture.recommendationBusinessId },
      }),
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

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation).toMatchObject({
      id: fixture.recommendationId,
      status: RecommendationStatus.VIEWED,
      snoozedUntil,
    })
    expect(recommendation.status).toBe(RecommendationStatus.VIEWED)
    expect(recommendation.snoozedUntil).toEqual(new Date(snoozedUntil))
    expect(recommendation.updatedAt.getTime()).toBeGreaterThan(
      knownEarlierUpdatedAt.getTime(),
    )
    expect(body.data.recommendation.updatedAt).toBe(
      recommendation.updatedAt.toISOString(),
    )
    expect(withoutSnoozeMutableFields(recommendation)).toEqual(
      withoutSnoozeMutableFields(recommendationBefore),
    )
    expect(companyAfter).toEqual(companyBefore)
    expect(knowledgeAfter).toEqual(knowledgeBefore)
    expect(knowledgeLinkAfter).toEqual(knowledgeLinkBefore)
    expect({ decisions, tasks, interactions, outcomes }).toEqual({
      decisions: 0,
      tasks: 0,
      interactions: 0,
      outcomes: 0,
    })
  })

  it('keeps a VIEWED recommendation VIEWED and stores snoozedUntil', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
    })
    const snoozedUntil = futureDate(172_800_000)

    const response = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil },
    )
    const body = response.json<SnoozeSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation.status).toBe(RecommendationStatus.VIEWED)
    expect(body.data.recommendation.snoozedUntil).toBe(snoozedUntil)
    expect(recommendation.status).toBe(RecommendationStatus.VIEWED)
    expect(recommendation.snoozedUntil?.toISOString()).toBe(snoozedUntil)
  })

  it('replaces an existing snooze date', async () => {
    const initialSnoozedUntil = new Date(futureDate(86_400_000))
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
      snoozedUntil: initialSnoozedUntil,
    })
    const replacement = futureDate(259_200_000)

    const response = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil: replacement },
    )
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(recommendation.status).toBe(RecommendationStatus.VIEWED)
    expect(recommendation.snoozedUntil?.toISOString()).toBe(replacement)
    expect(recommendation.snoozedUntil?.toISOString()).not.toBe(
      initialSnoozedUntil.toISOString(),
    )
  })

  it('safely repeats the same snooze date', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
    })
    const snoozedUntil = futureDate(345_600_000)

    const firstResponse = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil },
    )
    const secondResponse = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil },
    )
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(recommendation.status).toBe(RecommendationStatus.VIEWED)
    expect(recommendation.snoozedUntil?.toISOString()).toBe(snoozedUntil)
    expect(
      await prisma.decision.count({
        where: { recommendationId: fixture.recommendationId },
      }),
    ).toBe(0)
  })

  it.each([
    ['missing', {}],
    ['non-string', { snoozedUntil: 42 }],
    ['without timezone', { snoozedUntil: '2099-01-01T09:00:00' }],
    ['impossible date', { snoozedUntil: '2099-02-30T09:00:00Z' }],
  ])('returns INVALID_SNOOZED_UNTIL for %s input', async (_name, payload) => {
    const response = await snoozeRecommendationRequest(
      uniqueId('missing-business'),
      uniqueId('missing-recommendation'),
      payload,
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_SNOOZED_UNTIL')
  })

  it('does not change an eligible Recommendation for malformed input', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil: 'not-a-datetime' },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_SNOOZED_UNTIL')
    expect(after).toEqual(before)
  })

  it('rejects a past snoozedUntil', async () => {
    const response = await snoozeRecommendationRequest(
      uniqueId('missing-business'),
      uniqueId('missing-recommendation'),
      { snoozedUntil: new Date(Date.now() - 86_400_000).toISOString() },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('SNOOZED_UNTIL_NOT_IN_FUTURE')
  })

  it('deterministically rejects snoozedUntil equal to current time', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const fixedNow = new Date('2099-01-01T12:00:00.000Z')
    let response

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(fixedNow)
    try {
      response = await snoozeRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { snoozedUntil: fixedNow.toISOString() },
      )
    } finally {
      vi.useRealTimers()
    }

    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('SNOOZED_UNTIL_NOT_IN_FUTURE')
    expect(after).toEqual(before)
  })

  it.each([
    RecommendationStatus.ACCEPTED,
    RecommendationStatus.MODIFIED,
    RecommendationStatus.REJECTED,
    RecommendationStatus.EXPIRED,
  ])('rejects forbidden status %s without changing it', async (status) => {
    const fixture = await seedRecommendation({ status })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil: futureDate(86_400_000) },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_STATUS_CONFLICT')
    expect(after).toEqual(before)
    expect(
      await prisma.decision.count({
        where: { recommendationId: fixture.recommendationId },
      }),
    ).toBe(0)
  })

  it('returns BUSINESS_NOT_FOUND', async () => {
    const response = await snoozeRecommendationRequest(
      uniqueId('missing-business'),
      uniqueId('missing-recommendation'),
      { snoozedUntil: futureDate(86_400_000) },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('BUSINESS_NOT_FOUND')
  })

  it('returns RECOMMENDATION_NOT_FOUND for an unknown Recommendation', async () => {
    const fixture = await seedRecommendation()

    const response = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      uniqueId('missing-recommendation'),
      { snoozedUntil: futureDate(86_400_000) },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('RECOMMENDATION_NOT_FOUND')
  })

  it('does not disclose a Recommendation from another Business', async () => {
    const fixture = await seedRecommendation({
      recommendationInOtherBusiness: true,
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil: futureDate(86_400_000) },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('RECOMMENDATION_NOT_FOUND')
    expect(body.error.details).toEqual({})
    expect(body).not.toHaveProperty('data')
    expect(after).toEqual(before)
  })

  it('returns RECOMMENDATION_COMPANY_CONFLICT before changing state', async () => {
    const fixture = await seedRecommendation({
      companyInOtherBusiness: true,
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await snoozeRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { snoozedUntil: futureDate(86_400_000) },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_COMPANY_CONFLICT')
    expect(after).toEqual(before)
  })

  it('keeps valid state after two concurrent snooze requests', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
    })
    const firstDate = futureDate(86_400_000)
    const secondDate = futureDate(172_800_000)

    const [firstResponse, secondResponse] = await Promise.all([
      snoozeRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { snoozedUntil: firstDate },
      ),
      snoozeRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { snoozedUntil: secondDate },
      ),
    ])
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(recommendation.status).toBe(RecommendationStatus.VIEWED)
    expect([firstDate, secondDate]).toContain(
      recommendation.snoozedUntil?.toISOString(),
    )
    expect(
      await prisma.decision.count({
        where: { recommendationId: fixture.recommendationId },
      }),
    ).toBe(0)
  })

  it('never lets concurrent snooze revert an accepted Recommendation', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
    })
    const snoozedUntil = futureDate(86_400_000)

    const [acceptResponse, snoozeResponse] = await Promise.all([
      acceptRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        fixture.userId,
      ),
      snoozeRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { snoozedUntil },
      ),
    ])
    const acceptBody = acceptResponse.json<AcceptSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(acceptResponse.statusCode).toBe(200)
    expect(acceptBody.data.recommendation.status).toBe(
      RecommendationStatus.ACCEPTED,
    )
    expect([200, 409]).toContain(snoozeResponse.statusCode)
    if (snoozeResponse.statusCode === 200) {
      expect(snoozeResponse.json<SnoozeSuccessBody>()).toEqual({
        data: {
          recommendation: {
            id: fixture.recommendationId,
            status: RecommendationStatus.VIEWED,
            snoozedUntil,
            updatedAt: expect.any(String),
          },
        },
      })
    } else {
      expect(snoozeResponse.json<ErrorBody>().error.code).toBe(
        'RECOMMENDATION_STATUS_CONFLICT',
      )
    }
    expect(recommendation.status).toBe(RecommendationStatus.ACCEPTED)
    expect(recommendation.snoozedUntil).toBeNull()
    expect(decisions).toHaveLength(1)
    expect(decisions[0]).toMatchObject({
      businessId: fixture.requestBusinessId,
      companyId: fixture.companyId,
      recommendationId: fixture.recommendationId,
      decidedById: fixture.userId,
      status: DecisionStatus.ACTIVE,
    })
  })
})
