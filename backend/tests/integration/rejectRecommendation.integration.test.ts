import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  DecisionStatus,
  KnowledgeType,
  KnowledgeVerificationStatus,
  RecommendationPriority,
  RecommendationRejectionReason,
  RecommendationStatus,
  type PrismaClient,
  type Recommendation,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerAcceptRecommendationRoute } from '../../src/api/recommendations/acceptRecommendationRoute.js'
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
const OTHER_COMMENT = 'Другая причина'
const NON_OTHER_REASONS = [
  RecommendationRejectionReason.NOT_RELEVANT,
  RecommendationRejectionReason.ALREADY_DONE,
  RecommendationRejectionReason.NOT_SUITABLE_FOR_COMPANY,
  RecommendationRejectionReason.NOT_PRIORITY,
] as const

type SeedOptions = {
  status?: RecommendationStatus
  snoozedUntil?: Date | null
  rejectionReason?: RecommendationRejectionReason | null
  rejectionComment?: string | null
  withKnowledge?: boolean
  recommendationInOtherBusiness?: boolean
  companyInOtherBusiness?: boolean
  withoutCompany?: boolean
}

type SeededRecommendation = {
  requestBusinessId: string
  recommendationBusinessId: string
  companyId: string | null
  userId: string
  recommendationId: string
  knowledgeId: string | null
}

type RejectSuccessBody = {
  data: {
    recommendation: {
      id: string
      status: RecommendationStatus
      rejectionReason: RecommendationRejectionReason
      rejectionComment: string | null
      snoozedUntil: string | null
      updatedAt: string
    }
  }
}

type ActionSuccessBody = {
  data: {
    recommendation: {
      id: string
      status: RecommendationStatus
    }
    decision: {
      id: string
      title: string
      description: string | null
      decidedById: string
    }
  }
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

function withoutRejectMutableFields(recommendation: Recommendation) {
  const {
    status,
    snoozedUntil,
    rejectionReason,
    rejectionComment,
    updatedAt,
    ...preservedFields
  } = recommendation
  void status
  void snoozedUntil
  void rejectionReason
  void rejectionComment
  void updatedAt
  return preservedFields
}

describe('POST /api/v1/businesses/:businessId/recommendations/:recommendationId/reject', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-reject-${label}-${randomUUID()}`
  }

  function futureDate(offsetMs: number): Date {
    return new Date(Date.now() + offsetMs)
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
    const companyId = options.withoutCompany ? null : uniqueId('company')
    const recommendationId = uniqueId('recommendation')
    const knowledgeId = options.withKnowledge ? uniqueId('knowledge') : null

    fixtureIds.businessIds.push(requestBusinessId)
    if (otherBusinessId) fixtureIds.businessIds.push(otherBusinessId)
    fixtureIds.userIds.push(userId)
    fixtureIds.membershipIds.push(membershipId)
    fixtureIds.recommendationIds.push(recommendationId)
    if (companyId) fixtureIds.companyIds.push(companyId)
    if (knowledgeId) fixtureIds.knowledgeIds.push(knowledgeId)

    await prisma.business.create({
      data: {
        id: requestBusinessId,
        name: 'Reject test business',
      },
    })

    if (otherBusinessId) {
      await prisma.business.create({
        data: {
          id: otherBusinessId,
          name: 'Other reject test business',
        },
      })
    }

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: 'Reject test user',
      },
    })
    await prisma.membership.create({
      data: {
        id: membershipId,
        businessId: requestBusinessId,
        userId,
      },
    })

    if (companyId) {
      await prisma.company.create({
        data: {
          id: companyId,
          businessId: companyBusinessId,
          name: 'Reject test company',
          website: 'https://reject.example.test',
          niche: 'Industrial software',
          city: 'Moscow',
          region: 'Moscow',
          country: 'Russia',
          origin: CompanyOrigin.MANUAL,
          originUrl: 'https://source.example.test',
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
        rejectionReason: options.rejectionReason ?? null,
        rejectionComment: options.rejectionComment ?? null,
      },
    })

    if (knowledgeId) {
      await prisma.knowledge.create({
        data: {
          id: knowledgeId,
          businessId: recommendationBusinessId,
          companyId,
          content: 'The company has a verified public contact form.',
          type: KnowledgeType.FACT,
          verificationStatus: KnowledgeVerificationStatus.VERIFIED,
          sourceLabel: 'Public website',
          sourceUrl: 'https://reject.example.test/contact',
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
      knowledgeId,
    }
  }

  async function seedDecision(
    fixture: SeededRecommendation,
    options: {
      title: string
      description: string | null
    },
  ) {
    const decisionId = uniqueId('decision')
    fixtureIds.decisionIds.push(decisionId)
    return prisma.decision.create({
      data: {
        id: decisionId,
        businessId: fixture.recommendationBusinessId,
        companyId: fixture.companyId,
        recommendationId: fixture.recommendationId,
        title: options.title,
        description: options.description,
        decidedById: fixture.userId,
        status: DecisionStatus.ACTIVE,
      },
    })
  }

  function rejectRecommendationRequest(
    businessId: string,
    recommendationId: string,
    payload?: unknown,
  ) {
    const request = {
      method: 'POST' as const,
      url: `${API_PREFIX}/businesses/${businessId}/recommendations/${recommendationId}/reject`,
    }

    return payload === undefined
      ? app.inject(request)
      : app.inject({ ...request, payload: payload as string })
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

  function modifyRecommendationRequest(
    businessId: string,
    recommendationId: string,
    decidedById: string,
    decisionTitle: string,
  ) {
    return app.inject({
      method: 'POST',
      url: `${API_PREFIX}/businesses/${businessId}/recommendations/${recommendationId}/modify`,
      payload: { decidedById, decisionTitle },
    })
  }

  function snoozeRecommendationRequest(
    businessId: string,
    recommendationId: string,
    snoozedUntil: string,
  ) {
    return app.inject({
      method: 'POST',
      url: `${API_PREFIX}/businesses/${businessId}/recommendations/${recommendationId}/snooze`,
      payload: { snoozedUntil },
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
    await registerRejectRecommendationRoute(app, API_PREFIX)
    await registerAcceptRecommendationRoute(app, API_PREFIX)
    await registerModifyRecommendationRoute(app, API_PREFIX)
    await registerSnoozeRecommendationRoute(app, API_PREFIX)
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

  it.each([
    RecommendationRejectionReason.NOT_RELEVANT,
    RecommendationRejectionReason.ALREADY_DONE,
    RecommendationRejectionReason.NOT_SUITABLE_FOR_COMPANY,
    RecommendationRejectionReason.NOT_PRIORITY,
    RecommendationRejectionReason.OTHER,
  ])('rejects a NEW Recommendation with reason %s', async (rejectionReason) => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
      snoozedUntil: futureDate(86_400_000),
    })
    const rejectionComment =
      rejectionReason === RecommendationRejectionReason.OTHER
        ? OTHER_COMMENT
        : undefined

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason, rejectionComment },
    )
    const body = response.json<RejectSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation).toMatchObject({
      id: fixture.recommendationId,
      status: RecommendationStatus.REJECTED,
      rejectionReason,
      rejectionComment: rejectionComment ?? null,
      snoozedUntil: null,
    })
    expect(recommendation).toMatchObject({
      status: RecommendationStatus.REJECTED,
      rejectionReason,
      rejectionComment: rejectionComment ?? null,
      snoozedUntil: null,
    })
  })

  it('rejects a VIEWED Recommendation', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
      snoozedUntil: futureDate(86_400_000),
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
    )
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(recommendation.status).toBe(RecommendationStatus.REJECTED)
    expect(recommendation.snoozedUntil).toBeNull()
  })

  it('rejects a Recommendation without a linked Company', async () => {
    const fixture = await seedRecommendation({ withoutCompany: true })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason: RecommendationRejectionReason.ALREADY_DONE },
    )
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(recommendation.status).toBe(RecommendationStatus.REJECTED)
    expect(recommendation.companyId).toBeNull()
  })

  it('trims an OTHER comment in the response and database', async () => {
    const fixture = await seedRecommendation()

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        rejectionReason: RecommendationRejectionReason.OTHER,
        rejectionComment: ` \n${OTHER_COMMENT}\t `,
      },
    )
    const body = response.json<RejectSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation.rejectionComment).toBe(OTHER_COMMENT)
    expect(recommendation.rejectionComment).toBe(OTHER_COMMENT)
  })

  it.each([
    ['one Unicode code point', '😀'],
    ['500 Unicode code points', '😀'.repeat(500)],
  ])('accepts an OTHER comment with %s', async (_name, rejectionComment) => {
    const fixture = await seedRecommendation()

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        rejectionReason: RecommendationRejectionReason.OTHER,
        rejectionComment,
      },
    )
    const body = response.json<RejectSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation.rejectionComment).toBe(rejectionComment)
    expect(recommendation.rejectionComment).toBe(rejectionComment)
  })

  it.each([
    ['missing', {}],
    ['null', { rejectionComment: null }],
    ['non-string', { rejectionComment: 42 }],
    ['empty', { rejectionComment: '' }],
    ['whitespace-only', { rejectionComment: '   ' }],
    ['501 Unicode code points', { rejectionComment: '😀'.repeat(501) }],
  ])('rejects an OTHER comment that is %s', async (_name, commentPayload) => {
    const fixture = await seedRecommendation()
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        rejectionReason: RecommendationRejectionReason.OTHER,
        ...commentPayload,
      },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_REJECTION_COMMENT')
    expect(after).toEqual(before)
  })

  it.each([
    ['missing', {}],
    ['null', { rejectionReason: null }],
    ['non-string', { rejectionReason: 42 }],
    ['unknown', { rejectionReason: 'UNKNOWN' }],
    ['wrong case', { rejectionReason: 'not_priority' }],
    ['whitespace-padded', { rejectionReason: ' NOT_PRIORITY ' }],
  ])('rejects a rejectionReason that is %s', async (_name, payload) => {
    const fixture = await seedRecommendation()
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      payload,
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_REJECTION_REASON')
    expect(after).toEqual(before)
  })

  it.each([
    ['null body', null],
    ['array body', []],
  ])('handles %s as an invalid request body', async (_name, payload) => {
    const response = await rejectRecommendationRequest(
      uniqueId('missing-business'),
      uniqueId('missing-recommendation'),
      payload,
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_REJECTION_REASON')
  })

  it('handles non-object body as an invalid request body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${API_PREFIX}/businesses/${uniqueId('missing-business')}/recommendations/${uniqueId('missing-recommendation')}/reject`,
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify('invalid body'),
    })
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_REJECTION_REASON')
  })

  it.each(NON_OTHER_REASONS)(
    'enforces the comment rule for non-OTHER reason %s',
    async (rejectionReason) => {
      for (const rejectionComment of [undefined, null]) {
        const fixture = await seedRecommendation()
        const payload =
          rejectionComment === undefined
            ? { rejectionReason }
            : { rejectionReason, rejectionComment }

        const response = await rejectRecommendationRequest(
          fixture.requestBusinessId,
          fixture.recommendationId,
          payload,
        )
        const recommendation = await prisma.recommendation.findUniqueOrThrow({
          where: { id: fixture.recommendationId },
        })

        expect(response.statusCode).toBe(200)
        expect(recommendation.rejectionComment).toBeNull()
      }

      for (const rejectionComment of ['', '   ', 'not allowed', 42]) {
        const fixture = await seedRecommendation()
        const before = await prisma.recommendation.findUniqueOrThrow({
          where: { id: fixture.recommendationId },
        })

        const response = await rejectRecommendationRequest(
          fixture.requestBusinessId,
          fixture.recommendationId,
          { rejectionReason, rejectionComment },
        )
        const body = response.json<ErrorBody>()
        const after = await prisma.recommendation.findUniqueOrThrow({
          where: { id: fixture.recommendationId },
        })

        expect(response.statusCode).toBe(400)
        expect(body.error.code).toBe('INVALID_REJECTION_COMMENT')
        expect(after).toEqual(before)
      }
    },
  )

  it('advances updatedAt and preserves unrelated state without side effects', async () => {
    const fixture = await seedRecommendation({
      snoozedUntil: futureDate(86_400_000),
      withKnowledge: true,
    })
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
      where: { id: fixture.companyId as string },
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

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason: RecommendationRejectionReason.NOT_RELEVANT },
    )
    const body = response.json<RejectSuccessBody>()
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyAfter = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
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
    expect(recommendationAfter.updatedAt.getTime()).toBeGreaterThan(
      knownEarlierUpdatedAt.getTime(),
    )
    expect(body.data.recommendation.updatedAt).toBe(
      recommendationAfter.updatedAt.toISOString(),
    )
    expect(recommendationAfter.status).toBe(RecommendationStatus.REJECTED)
    expect(recommendationAfter.snoozedUntil).toBeNull()
    expect(withoutRejectMutableFields(recommendationAfter)).toEqual(
      withoutRejectMutableFields(recommendationBefore),
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

  it('returns an identical non-OTHER rejection without another write', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.REJECTED,
      rejectionReason: RecommendationRejectionReason.NOT_PRIORITY,
      rejectionComment: null,
    })
    const fixedUpdatedAt = new Date('2024-01-01T00:00:00.000Z')
    await prisma.recommendation.update({
      where: { id: fixture.recommendationId },
      data: { updatedAt: fixedUpdatedAt },
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
    )
    const body = response.json<RejectSuccessBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation.updatedAt).toBe(
      fixedUpdatedAt.toISOString(),
    )
    expect(after).toEqual(before)
  })

  it('treats a trimmed OTHER retry as idempotent', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.REJECTED,
      rejectionReason: RecommendationRejectionReason.OTHER,
      rejectionComment: OTHER_COMMENT,
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        rejectionReason: RecommendationRejectionReason.OTHER,
        rejectionComment: `  ${OTHER_COMMENT}  `,
      },
    )
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(after).toEqual(before)
  })

  it('rejects an idempotency retry with a different reason', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.REJECTED,
      rejectionReason: RecommendationRejectionReason.NOT_PRIORITY,
      rejectionComment: null,
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason: RecommendationRejectionReason.ALREADY_DONE },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_REJECTION_CONFLICT')
    expect(after).toEqual(before)
  })

  it('rejects an OTHER retry with a different normalized comment', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.REJECTED,
      rejectionReason: RecommendationRejectionReason.OTHER,
      rejectionComment: OTHER_COMMENT,
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        rejectionReason: RecommendationRejectionReason.OTHER,
        rejectionComment: 'Совсем другая причина',
      },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_REJECTION_CONFLICT')
    expect(after).toEqual(before)
  })

  it.each([
    RecommendationStatus.ACCEPTED,
    RecommendationStatus.MODIFIED,
    RecommendationStatus.EXPIRED,
  ])('rejects forbidden status %s without mutation', async (status) => {
    const fixture = await seedRecommendation({ status })
    if (
      status === RecommendationStatus.ACCEPTED ||
      status === RecommendationStatus.MODIFIED
    ) {
      await seedDecision(fixture, {
        title:
          status === RecommendationStatus.ACCEPTED
            ? 'Prepare the first outreach'
            : 'Сначала позвоню директору',
        description:
          status === RecommendationStatus.ACCEPTED
            ? 'Draft a short personalized introduction.'
            : null,
      })
    }
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisionsBefore = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
    )
    const body = response.json<ErrorBody>()
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisionsAfter = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_STATUS_CONFLICT')
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(decisionsAfter).toEqual(decisionsBefore)
  })

  it('returns BUSINESS_NOT_FOUND', async () => {
    const response = await rejectRecommendationRequest(
      uniqueId('missing-business'),
      uniqueId('missing-recommendation'),
      { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
    )
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('BUSINESS_NOT_FOUND')
  })

  it('returns RECOMMENDATION_NOT_FOUND for an unknown Recommendation', async () => {
    const fixture = await seedRecommendation()
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      uniqueId('missing-recommendation'),
      { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('RECOMMENDATION_NOT_FOUND')
    expect(after).toEqual(before)
  })

  it('does not disclose a Recommendation from another Business', async () => {
    const fixture = await seedRecommendation({
      recommendationInOtherBusiness: true,
    })
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyBefore = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
    )
    const body = response.json<ErrorBody>()
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyAfter = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
    })

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('RECOMMENDATION_NOT_FOUND')
    expect(body.error.details).toEqual({})
    expect(body).not.toHaveProperty('data')
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(companyAfter).toEqual(companyBefore)
  })

  it('returns RECOMMENDATION_COMPANY_CONFLICT without mutation', async () => {
    const fixture = await seedRecommendation({ companyInOtherBusiness: true })
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyBefore = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
    })

    const response = await rejectRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
    )
    const body = response.json<ErrorBody>()
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const companyAfter = await prisma.company.findUniqueOrThrow({
      where: { id: fixture.companyId as string },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_COMPANY_CONFLICT')
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(companyAfter).toEqual(companyBefore)
  })

  it('serializes identical concurrent Reject requests idempotently', async () => {
    const fixture = await seedRecommendation({
      snoozedUntil: futureDate(86_400_000),
    })
    const firstPayload = {
      rejectionReason: RecommendationRejectionReason.OTHER,
      rejectionComment: `  ${OTHER_COMMENT}  `,
    }
    const secondPayload = {
      rejectionReason: RecommendationRejectionReason.OTHER,
      rejectionComment: OTHER_COMMENT,
    }

    const [firstResponse, secondResponse] = await Promise.all([
      rejectRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        firstPayload,
      ),
      rejectRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        secondPayload,
      ),
    ])
    const firstBody = firstResponse.json<RejectSuccessBody>()
    const secondBody = secondResponse.json<RejectSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(firstBody.data.recommendation.updatedAt).toBe(
      secondBody.data.recommendation.updatedAt,
    )
    expect(recommendation).toMatchObject({
      status: RecommendationStatus.REJECTED,
      rejectionReason: RecommendationRejectionReason.OTHER,
      rejectionComment: OTHER_COMMENT,
      snoozedUntil: null,
    })
    expect(recommendation.updatedAt.toISOString()).toBe(
      firstBody.data.recommendation.updatedAt,
    )
  })

  it('allows one winner for concurrent Reject requests with different feedback', async () => {
    const fixture = await seedRecommendation()
    const payloads = [
      {
        rejectionReason: RecommendationRejectionReason.NOT_PRIORITY,
      },
      {
        rejectionReason: RecommendationRejectionReason.OTHER,
        rejectionComment: OTHER_COMMENT,
      },
    ]

    const responses = await Promise.all(
      payloads.map((payload) =>
        rejectRecommendationRequest(
          fixture.requestBusinessId,
          fixture.recommendationId,
          payload,
        ),
      ),
    )
    const success = responses.find((response) => response.statusCode === 200)
    const conflict = responses.find((response) => response.statusCode === 409)
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(responses.map((response) => response.statusCode).sort()).toEqual([
      200, 409,
    ])
    expect(conflict?.json<ErrorBody>().error.code).toBe(
      'RECOMMENDATION_REJECTION_CONFLICT',
    )
    expect(success).toBeDefined()
    const winningState =
      success?.json<RejectSuccessBody>().data.recommendation
    expect(recommendation.status).toBe(RecommendationStatus.REJECTED)
    expect(recommendation.rejectionReason).toBe(winningState?.rejectionReason)
    expect(recommendation.rejectionComment).toBe(
      winningState?.rejectionComment,
    )
  })

  it('allows one terminal winner for concurrent Accept and Reject', async () => {
    const fixture = await seedRecommendation()

    const [acceptResponse, rejectResponse] = await Promise.all([
      acceptRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        fixture.userId,
      ),
      rejectRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
      ),
    ])
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(
      [acceptResponse.statusCode, rejectResponse.statusCode].sort(),
    ).toEqual([200, 409])
    expect(recommendation.snoozedUntil).toBeNull()

    if (acceptResponse.statusCode === 200) {
      const body = acceptResponse.json<ActionSuccessBody>()
      expect(rejectResponse.json<ErrorBody>().error.code).toBe(
        'RECOMMENDATION_STATUS_CONFLICT',
      )
      expect(recommendation.status).toBe(RecommendationStatus.ACCEPTED)
      expect(recommendation.rejectionReason).toBeNull()
      expect(decisions).toHaveLength(1)
      expect(decisions[0]?.id).toBe(body.data.decision.id)
    } else {
      expect(acceptResponse.json<ErrorBody>().error.code).toBe(
        'RECOMMENDATION_STATUS_CONFLICT',
      )
      expect(recommendation.status).toBe(RecommendationStatus.REJECTED)
      expect(recommendation.rejectionReason).toBe(
        RecommendationRejectionReason.NOT_PRIORITY,
      )
      expect(decisions).toHaveLength(0)
    }
  })

  it('allows one terminal winner for concurrent Modify and Reject', async () => {
    const fixture = await seedRecommendation()
    const decisionTitle = 'Сначала позвоню директору'

    const [modifyResponse, rejectResponse] = await Promise.all([
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        fixture.userId,
        decisionTitle,
      ),
      rejectRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { rejectionReason: RecommendationRejectionReason.ALREADY_DONE },
      ),
    ])
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(
      [modifyResponse.statusCode, rejectResponse.statusCode].sort(),
    ).toEqual([200, 409])
    expect(recommendation.snoozedUntil).toBeNull()

    if (modifyResponse.statusCode === 200) {
      const body = modifyResponse.json<ActionSuccessBody>()
      expect(rejectResponse.json<ErrorBody>().error.code).toBe(
        'RECOMMENDATION_STATUS_CONFLICT',
      )
      expect(recommendation.status).toBe(RecommendationStatus.MODIFIED)
      expect(recommendation.rejectionReason).toBeNull()
      expect(decisions).toHaveLength(1)
      expect(decisions[0]).toMatchObject({
        id: body.data.decision.id,
        title: decisionTitle,
        description: null,
      })
    } else {
      expect(modifyResponse.json<ErrorBody>().error.code).toBe(
        'RECOMMENDATION_STATUS_CONFLICT',
      )
      expect(recommendation.status).toBe(RecommendationStatus.REJECTED)
      expect(recommendation.rejectionReason).toBe(
        RecommendationRejectionReason.ALREADY_DONE,
      )
      expect(decisions).toHaveLength(0)
    }
  })

  it('finishes concurrent Snooze and Reject in a valid REJECTED state', async () => {
    const fixture = await seedRecommendation()
    const snoozedUntil = futureDate(86_400_000).toISOString()

    const [snoozeResponse, rejectResponse] = await Promise.all([
      snoozeRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        snoozedUntil,
      ),
      rejectRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { rejectionReason: RecommendationRejectionReason.NOT_PRIORITY },
      ),
    ])
    const rejectBody = rejectResponse.json<RejectSuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisionCount = await prisma.decision.count({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(rejectResponse.statusCode).toBe(200)
    expect(rejectBody.data.recommendation.status).toBe(
      RecommendationStatus.REJECTED,
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
    expect(recommendation.status).toBe(RecommendationStatus.REJECTED)
    expect(recommendation.snoozedUntil).toBeNull()
    expect(recommendation.rejectionReason).toBe(
      RecommendationRejectionReason.NOT_PRIORITY,
    )
    expect(decisionCount).toBe(0)
  })
})
