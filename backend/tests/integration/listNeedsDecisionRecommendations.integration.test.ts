import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  KnowledgeType,
  KnowledgeVerificationStatus,
  RecommendationPriority,
  RecommendationRejectionReason,
  RecommendationStatus,
  SourceType,
  type PrismaClient,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerAcceptRecommendationRoute } from '../../src/api/recommendations/acceptRecommendationRoute.js'
import { registerListNeedsDecisionRecommendationsRoute } from '../../src/api/recommendations/listNeedsDecisionRecommendationsRoute.js'
import { registerModifyRecommendationRoute } from '../../src/api/recommendations/modifyRecommendationRoute.js'
import { registerRejectRecommendationRoute } from '../../src/api/recommendations/rejectRecommendationRoute.js'
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
  createdAt?: Date
  withoutCompany?: boolean
  recommendationInOtherBusiness?: boolean
  companyInOtherBusiness?: boolean
  withActor?: boolean
}

type SeededRecommendation = {
  requestBusinessId: string
  recommendationBusinessId: string
  otherBusinessId: string | null
  companyId: string | null
  recommendationId: string
  userId: string | null
}

type NeedsDecisionSuccessBody = {
  data: {
    recommendations: Array<{
      id: string
      title: string
      description: string
      reason: string
      priority: RecommendationPriority
      status: RecommendationStatus
      snoozedUntil: string | null
      createdAt: string
      company: {
        id: string
        name: string
      } | null
      knowledge: Array<{
        id: string
        content: string
        type: KnowledgeType
        verificationStatus: KnowledgeVerificationStatus
        sourceType: SourceType | null
        sourceLabel: string | null
        sourceUrl: string | null
        obtainedAt: string | null
        lastCheckedAt: string | null
      }>
    }>
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

describe('GET /api/v1/businesses/:businessId/recommendations/needs-decision', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-needs-decision-${label}-${randomUUID()}`
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
    const companyId = options.withoutCompany ? null : uniqueId('company')
    const recommendationId = uniqueId('recommendation')
    const userId = options.withActor ? uniqueId('user') : null
    const membershipId = options.withActor ? uniqueId('membership') : null

    fixtureIds.businessIds.push(requestBusinessId)
    if (otherBusinessId) fixtureIds.businessIds.push(otherBusinessId)
    if (companyId) fixtureIds.companyIds.push(companyId)
    fixtureIds.recommendationIds.push(recommendationId)
    if (userId) fixtureIds.userIds.push(userId)
    if (membershipId) fixtureIds.membershipIds.push(membershipId)

    await prisma.business.create({
      data: {
        id: requestBusinessId,
        name: 'Needs decision test business',
      },
    })
    if (otherBusinessId) {
      await prisma.business.create({
        data: {
          id: otherBusinessId,
          name: 'Other needs decision test business',
        },
      })
    }

    if (userId && membershipId) {
      await prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@example.test`,
          name: 'Needs decision test actor',
        },
      })
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
          name: 'Needs decision test company',
          origin: CompanyOrigin.MANUAL,
          assessment: CompanyAssessment.SUITABLE,
          workState: CompanyWorkState.ACTIVE,
        },
      })
    }

    await prisma.recommendation.create({
      data: {
        id: recommendationId,
        businessId: recommendationBusinessId,
        companyId,
        title: 'Prepare the first outreach',
        description: 'Draft a short personalized introduction.',
        reason: 'The company matches the active target profile.',
        priority: RecommendationPriority.HIGH,
        status: options.status ?? RecommendationStatus.NEW,
        snoozedUntil: options.snoozedUntil ?? null,
        createdAt: options.createdAt,
      },
    })

    return {
      requestBusinessId,
      recommendationBusinessId,
      otherBusinessId,
      companyId,
      recommendationId,
      userId,
    }
  }

  async function addKnowledge(input: {
    fixture: SeededRecommendation
    businessId?: string
    type: KnowledgeType
    verificationStatus: KnowledgeVerificationStatus
    sourceType?: SourceType | null
    sourceLabel?: string | null
    sourceUrl?: string | null
    obtainedAt?: Date | null
    lastCheckedAt?: Date | null
    label: string
  }) {
    const knowledgeId = uniqueId(`knowledge-${input.label}`)
    fixtureIds.knowledgeIds.push(knowledgeId)
    await prisma.knowledge.create({
      data: {
        id: knowledgeId,
        businessId: input.businessId ?? input.fixture.recommendationBusinessId,
        companyId:
          (input.businessId ?? input.fixture.recommendationBusinessId) ===
          input.fixture.recommendationBusinessId
            ? input.fixture.companyId
            : null,
        content: `Knowledge ${input.label}`,
        type: input.type,
        verificationStatus: input.verificationStatus,
        sourceType: input.sourceType,
        sourceLabel: input.sourceLabel,
        sourceUrl: input.sourceUrl,
        obtainedAt: input.obtainedAt,
        lastCheckedAt: input.lastCheckedAt,
      },
    })
    await prisma.recommendationKnowledge.create({
      data: {
        recommendationId: input.fixture.recommendationId,
        knowledgeId,
      },
    })
    return knowledgeId
  }

  async function addRecommendation(
    fixture: SeededRecommendation,
    input: {
      id: string
      createdAt: Date
      status?: RecommendationStatus
    },
  ): Promise<void> {
    fixtureIds.recommendationIds.push(input.id)
    await prisma.recommendation.create({
      data: {
        id: input.id,
        businessId: fixture.recommendationBusinessId,
        companyId: fixture.companyId,
        title: `Recommendation ${input.id}`,
        description: 'Ordering fixture.',
        reason: 'Stable ordering test.',
        priority: RecommendationPriority.LOW,
        status: input.status ?? RecommendationStatus.NEW,
        createdAt: input.createdAt,
      },
    })
  }

  function listRequest(businessId: string) {
    return app.inject({
      method: 'GET',
      url: `${API_PREFIX}/businesses/${businessId}/recommendations/needs-decision`,
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
    await registerListNeedsDecisionRecommendationsRoute(app, API_PREFIX)
    await registerAcceptRecommendationRoute(app, API_PREFIX)
    await registerSnoozeRecommendationRoute(app, API_PREFIX)
    await registerModifyRecommendationRoute(app, API_PREFIX)
    await registerRejectRecommendationRoute(app, API_PREFIX)
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

  it('includes NEW with the exact DTO and preserves Knowledge semantics', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
    })
    const obtainedAt = new Date('2026-01-01T10:00:00.000Z')
    const lastCheckedAt = new Date('2026-01-02T10:00:00.000Z')
    const userInfoId = await addKnowledge({
      fixture,
      label: 'user-info',
      type: KnowledgeType.USER_INFO,
      verificationStatus: KnowledgeVerificationStatus.VERIFIED,
      sourceType: SourceType.USER,
      sourceLabel: 'User input',
      sourceUrl: null,
      obtainedAt,
      lastCheckedAt,
    })
    const inferenceId = await addKnowledge({
      fixture,
      label: 'ai-inference',
      type: KnowledgeType.AI_INFERENCE,
      verificationStatus: KnowledgeVerificationStatus.ASSUMPTION,
      sourceType: SourceType.SYSTEM,
      sourceLabel: 'Research analysis',
      sourceUrl: 'https://source.example.test/analysis',
      obtainedAt: null,
      lastCheckedAt: null,
    })

    const response = await listRequest(fixture.requestBusinessId)
    const body = response.json<NeedsDecisionSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendations).toHaveLength(1)
    expect(body.data.recommendations[0]).toEqual({
      id: fixture.recommendationId,
      title: 'Prepare the first outreach',
      description: 'Draft a short personalized introduction.',
      reason: 'The company matches the active target profile.',
      priority: RecommendationPriority.HIGH,
      status: RecommendationStatus.NEW,
      snoozedUntil: null,
      createdAt: expect.any(String),
      company: {
        id: fixture.companyId,
        name: 'Needs decision test company',
      },
      knowledge: [
        {
          id: inferenceId,
          content: 'Knowledge ai-inference',
          type: KnowledgeType.AI_INFERENCE,
          verificationStatus: KnowledgeVerificationStatus.ASSUMPTION,
          sourceType: SourceType.SYSTEM,
          sourceLabel: 'Research analysis',
          sourceUrl: 'https://source.example.test/analysis',
          obtainedAt: null,
          lastCheckedAt: null,
        },
        {
          id: userInfoId,
          content: 'Knowledge user-info',
          type: KnowledgeType.USER_INFO,
          verificationStatus: KnowledgeVerificationStatus.VERIFIED,
          sourceType: SourceType.USER,
          sourceLabel: 'User input',
          sourceUrl: null,
          obtainedAt: obtainedAt.toISOString(),
          lastCheckedAt: lastCheckedAt.toISOString(),
        },
      ].sort((first, second) => first.id.localeCompare(second.id)),
    })
    expect(body.data.recommendations[0]).not.toHaveProperty('updatedAt')
    expect(body.data.recommendations[0]?.company).toEqual({
      id: fixture.companyId,
      name: 'Needs decision test company',
    })
  })

  it('includes VIEWED', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
    })

    const response = await listRequest(fixture.requestBusinessId)
    const body = response.json<NeedsDecisionSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendations.map(({ id }) => id)).toEqual([
      fixture.recommendationId,
    ])
  })

  it('excludes a future snooze', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
      snoozedUntil: new Date(Date.now() + 86_400_000),
    })

    const response = await listRequest(fixture.requestBusinessId)
    expect(response.json<NeedsDecisionSuccessBody>().data.recommendations).toEqual(
      [],
    )
  })

  it('includes a past snooze', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
      snoozedUntil: new Date(Date.now() - 1_000),
    })

    const response = await listRequest(fixture.requestBusinessId)
    expect(
      response
        .json<NeedsDecisionSuccessBody>()
        .data.recommendations.map(({ id }) => id),
    ).toEqual([fixture.recommendationId])
  })

  it('includes a snooze at the current-time boundary', async () => {
    const currentTime = new Date()
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
      snoozedUntil: currentTime,
    })

    const response = await listRequest(fixture.requestBusinessId)

    expect(response.statusCode).toBe(200)
    expect(
      response
        .json<NeedsDecisionSuccessBody>()
        .data.recommendations.map(({ id }) => id),
    ).toEqual([fixture.recommendationId])
  })

  it.each([
    RecommendationStatus.ACCEPTED,
    RecommendationStatus.MODIFIED,
    RecommendationStatus.REJECTED,
    RecommendationStatus.EXPIRED,
  ])('excludes terminal status %s', async (status) => {
    const fixture = await seedRecommendation({ status })

    const response = await listRequest(fixture.requestBusinessId)

    expect(response.statusCode).toBe(200)
    expect(response.json<NeedsDecisionSuccessBody>().data.recommendations).toEqual(
      [],
    )
  })

  it('returns BUSINESS_NOT_FOUND', async () => {
    const response = await listRequest(uniqueId('missing-business'))
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('BUSINESS_NOT_FOUND')
    expect(body.error.details).toEqual({})
  })

  it('includes a Recommendation without a Company', async () => {
    const fixture = await seedRecommendation({ withoutCompany: true })

    const response = await listRequest(fixture.requestBusinessId)
    const body = response.json<NeedsDecisionSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendations).toHaveLength(1)
    expect(body.data.recommendations[0]?.company).toBeNull()
  })

  it('does not disclose a Recommendation from another Business', async () => {
    const fixture = await seedRecommendation({
      recommendationInOtherBusiness: true,
    })
    const foreignBefore = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await listRequest(fixture.requestBusinessId)
    const foreignAfter = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<NeedsDecisionSuccessBody>().data.recommendations).toEqual(
      [],
    )
    expect(foreignAfter).toEqual(foreignBefore)
  })

  it('excludes a Recommendation linked to another Business Company', async () => {
    const fixture = await seedRecommendation({ companyInOtherBusiness: true })
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyBefore = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
    })

    const response = await listRequest(fixture.requestBusinessId)
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyAfter = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<NeedsDecisionSuccessBody>().data.recommendations).toEqual(
      [],
    )
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(companyAfter).toEqual(companyBefore)
  })

  it('filters linked Knowledge from another Business', async () => {
    const fixture = await seedRecommendation()
    const otherBusinessId = uniqueId('other-business')
    fixtureIds.businessIds.push(otherBusinessId)
    await prisma.business.create({
      data: {
        id: otherBusinessId,
        name: 'Foreign Knowledge business',
      },
    })
    const localKnowledgeId = await addKnowledge({
      fixture,
      label: 'local',
      type: KnowledgeType.FACT,
      verificationStatus: KnowledgeVerificationStatus.VERIFIED,
    })
    const foreignKnowledgeId = await addKnowledge({
      fixture,
      businessId: otherBusinessId,
      label: 'foreign',
      type: KnowledgeType.FACT,
      verificationStatus: KnowledgeVerificationStatus.VERIFIED,
    })
    const foreignBefore = await prisma.knowledge.findUniqueOrThrow({
      where: { id: foreignKnowledgeId },
    })

    const response = await listRequest(fixture.requestBusinessId)
    const body = response.json<NeedsDecisionSuccessBody>()
    const foreignAfter = await prisma.knowledge.findUniqueOrThrow({
      where: { id: foreignKnowledgeId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendations[0]?.knowledge.map(({ id }) => id)).toEqual([
      localKnowledgeId,
    ])
    expect(foreignAfter).toEqual(foreignBefore)
  })

  it('has no side effects', async () => {
    const fixture = await seedRecommendation()
    const knowledgeId = await addKnowledge({
      fixture,
      label: 'preserved',
      type: KnowledgeType.OBSERVATION,
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
    })
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyBefore = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
    })
    const knowledgeBefore = await prisma.knowledge.findUniqueOrThrow({
      where: { id: knowledgeId },
    })
    const linkBefore =
      await prisma.recommendationKnowledge.findUniqueOrThrow({
        where: {
          recommendationId_knowledgeId: {
            recommendationId: fixture.recommendationId,
            knowledgeId,
          },
        },
      })

    const response = await listRequest(fixture.requestBusinessId)
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyAfter = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
    })
    const knowledgeAfter = await prisma.knowledge.findUniqueOrThrow({
      where: { id: knowledgeId },
    })
    const linkAfter =
      await prisma.recommendationKnowledge.findUniqueOrThrow({
        where: {
          recommendationId_knowledgeId: {
            recommendationId: fixture.recommendationId,
            knowledgeId,
          },
        },
      })
    const [decisions, tasks, interactions, outcomes] = await Promise.all([
      prisma.decision.count({
        where: { businessId: fixture.requestBusinessId },
      }),
      prisma.task.count({
        where: { businessId: fixture.requestBusinessId },
      }),
      prisma.interaction.count({
        where: { businessId: fixture.requestBusinessId },
      }),
      prisma.outcome.count({
        where: { businessId: fixture.requestBusinessId },
      }),
    ])

    expect(response.statusCode).toBe(200)
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(companyAfter).toEqual(companyBefore)
    expect(knowledgeAfter).toEqual(knowledgeBefore)
    expect(linkAfter).toEqual(linkBefore)
    expect({ decisions, tasks, interactions, outcomes }).toEqual({
      decisions: 0,
      tasks: 0,
      interactions: 0,
      outcomes: 0,
    })
  })

  it('uses deterministic createdAt and id ordering without priority ranking', async () => {
    const commonCreatedAt = new Date('2026-01-02T00:00:00.000Z')
    const fixture = await seedRecommendation({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    const secondId = uniqueId('recommendation-b')
    const thirdId = uniqueId('recommendation-a')
    await addRecommendation(fixture, {
      id: secondId,
      createdAt: commonCreatedAt,
    })
    await addRecommendation(fixture, {
      id: thirdId,
      createdAt: commonCreatedAt,
    })

    const response = await listRequest(fixture.requestBusinessId)
    const ids = response
      .json<NeedsDecisionSuccessBody>()
      .data.recommendations.map(({ id }) => id)
    const tiedIds = [secondId, thirdId].sort()

    expect(response.statusCode).toBe(200)
    expect(ids).toEqual([fixture.recommendationId, ...tiedIds])
  })

  it.each(['accept', 'snooze', 'modify', 'reject'] as const)(
    'does not return a Recommendation after %s',
    async (action) => {
      const needsActor = action === 'accept' || action === 'modify'
      const fixture = await seedRecommendation({ withActor: needsActor })
      const before = await listRequest(fixture.requestBusinessId)
      expect(
        before
          .json<NeedsDecisionSuccessBody>()
          .data.recommendations.map(({ id }) => id),
      ).toEqual([fixture.recommendationId])

      const urlBase = `${API_PREFIX}/businesses/${fixture.requestBusinessId}/recommendations/${fixture.recommendationId}`
      const actionResponse =
        action === 'accept'
          ? await app.inject({
              method: 'POST',
              url: `${urlBase}/accept`,
              payload: { decidedById: fixture.userId },
            })
          : action === 'snooze'
            ? await app.inject({
                method: 'POST',
                url: `${urlBase}/snooze`,
                payload: {
                  snoozedUntil: new Date(
                    Date.now() + 86_400_000,
                  ).toISOString(),
                },
              })
            : action === 'modify'
              ? await app.inject({
                  method: 'POST',
                  url: `${urlBase}/modify`,
                  payload: {
                    decidedById: fixture.userId,
                    decisionTitle: 'Сначала позвоню директору',
                  },
                })
              : await app.inject({
                  method: 'POST',
                  url: `${urlBase}/reject`,
                  payload: {
                    rejectionReason:
                      RecommendationRejectionReason.NOT_PRIORITY,
                  },
                })

      const after = await listRequest(fixture.requestBusinessId)

      expect(actionResponse.statusCode).toBe(200)
      expect(after.json<NeedsDecisionSuccessBody>().data.recommendations).toEqual(
        [],
      )
    },
  )
})
