import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  DecisionStatus,
  KnowledgeType,
  KnowledgeVerificationStatus,
  RecommendationPriority,
  RecommendationStatus,
  type Decision,
  type PrismaClient,
  type Recommendation,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerAcceptRecommendationRoute } from '../../src/api/recommendations/acceptRecommendationRoute.js'
import { registerModifyRecommendationRoute } from '../../src/api/recommendations/modifyRecommendationRoute.js'
import { registerSnoozeRecommendationRoute } from '../../src/api/recommendations/snoozeRecommendationRoute.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'
const DEFAULT_DECISION_TITLE = 'Сначала позвоню директору'

type SeedOptions = {
  status?: RecommendationStatus
  snoozedUntil?: Date | null
  withMembership?: boolean
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

type ModifySuccessBody = {
  data: {
    recommendation: {
      id: string
      status: RecommendationStatus
      snoozedUntil: null
      updatedAt: string
    }
    decision: {
      id: string
      recommendationId: string
      companyId: string | null
      title: string
      description: string | null
      status: DecisionStatus
      decidedById: string
      createdAt: string
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

function withoutModifyMutableFields(recommendation: Recommendation) {
  const { status, snoozedUntil, updatedAt, ...preservedFields } = recommendation
  void status
  void snoozedUntil
  void updatedAt
  return preservedFields
}

describe('POST /api/v1/businesses/:businessId/recommendations/:recommendationId/modify', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-modify-${label}-${randomUUID()}`
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
    fixtureIds.recommendationIds.push(recommendationId)
    if (companyId) fixtureIds.companyIds.push(companyId)
    if (options.withMembership !== false) {
      fixtureIds.membershipIds.push(membershipId)
    }
    if (knowledgeId) fixtureIds.knowledgeIds.push(knowledgeId)

    await prisma.business.create({
      data: {
        id: requestBusinessId,
        name: 'Modify test business',
      },
    })

    if (otherBusinessId) {
      await prisma.business.create({
        data: {
          id: otherBusinessId,
          name: 'Other modify test business',
        },
      })
    }

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: 'Modify test user',
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
          name: 'Modify test company',
          website: 'https://modify.example.test',
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
          sourceUrl: 'https://modify.example.test/contact',
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

  async function seedActor(businessId: string): Promise<string> {
    const userId = uniqueId('user')
    const membershipId = uniqueId('membership')
    fixtureIds.userIds.push(userId)
    fixtureIds.membershipIds.push(membershipId)

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: 'Second modify test user',
      },
    })
    await prisma.membership.create({
      data: {
        id: membershipId,
        businessId,
        userId,
      },
    })

    return userId
  }

  async function seedCompany(businessId: string): Promise<string> {
    const companyId = uniqueId('company')
    fixtureIds.companyIds.push(companyId)
    await prisma.company.create({
      data: {
        id: companyId,
        businessId,
        name: 'Mismatched decision company',
        origin: CompanyOrigin.MANUAL,
        workState: CompanyWorkState.NOT_STARTED,
      },
    })
    return companyId
  }

  async function seedDecision(
    fixture: SeededRecommendation,
    options: {
      title?: string
      decidedById?: string
      companyId?: string | null
    } = {},
  ): Promise<Decision> {
    const decisionId = uniqueId('decision')
    fixtureIds.decisionIds.push(decisionId)
    return prisma.decision.create({
      data: {
        id: decisionId,
        businessId: fixture.recommendationBusinessId,
        companyId:
          options.companyId === undefined
            ? fixture.companyId
            : options.companyId,
        recommendationId: fixture.recommendationId,
        title: options.title ?? DEFAULT_DECISION_TITLE,
        description: null,
        decidedById: options.decidedById ?? fixture.userId,
        status: DecisionStatus.ACTIVE,
      },
    })
  }

  function modifyRecommendationRequest(
    businessId: string,
    recommendationId: string,
    payload?: Record<string, unknown>,
  ) {
    const request = {
      method: 'POST' as const,
      url: `${API_PREFIX}/businesses/${businessId}/recommendations/${recommendationId}/modify`,
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
    await registerModifyRecommendationRoute(app, API_PREFIX)
    await registerAcceptRecommendationRoute(app, API_PREFIX)
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

  it('modifies a NEW recommendation and preserves unrelated state', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.NEW,
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

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: `  ${DEFAULT_DECISION_TITLE}  `,
      },
    )
    const body = response.json<ModifySuccessBody>()
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
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

    expect(response.statusCode).toBe(200)
    expect(body.data.recommendation).toEqual({
      id: fixture.recommendationId,
      status: RecommendationStatus.MODIFIED,
      snoozedUntil: null,
      updatedAt: recommendationAfter.updatedAt.toISOString(),
    })
    expect(body.data.decision).toMatchObject({
      recommendationId: fixture.recommendationId,
      companyId: fixture.companyId,
      title: DEFAULT_DECISION_TITLE,
      description: null,
      status: DecisionStatus.ACTIVE,
      decidedById: fixture.userId,
    })
    expect(recommendationAfter.status).toBe(RecommendationStatus.MODIFIED)
    expect(recommendationAfter.snoozedUntil).toBeNull()
    expect(recommendationAfter.updatedAt.getTime()).toBeGreaterThan(
      knownEarlierUpdatedAt.getTime(),
    )
    expect(withoutModifyMutableFields(recommendationAfter)).toEqual(
      withoutModifyMutableFields(recommendationBefore),
    )
    expect(decisions).toHaveLength(1)
    expect(decisions[0]).toMatchObject({
      businessId: fixture.recommendationBusinessId,
      companyId: fixture.companyId,
      recommendationId: fixture.recommendationId,
      title: DEFAULT_DECISION_TITLE,
      description: null,
      status: DecisionStatus.ACTIVE,
      decidedById: fixture.userId,
    })
    expect(companyAfter).toEqual(companyBefore)
    expect(knowledgeAfter).toEqual(knowledgeBefore)
    expect(knowledgeLinkAfter).toEqual(knowledgeLinkBefore)
    expect({ tasks, interactions, outcomes }).toEqual({
      tasks: 0,
      interactions: 0,
      outcomes: 0,
    })
  })

  it('modifies a VIEWED recommendation', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.VIEWED,
      snoozedUntil: futureDate(86_400_000),
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
      include: { decisions: true },
    })

    expect(response.statusCode).toBe(200)
    expect(recommendation.status).toBe(RecommendationStatus.MODIFIED)
    expect(recommendation.snoozedUntil).toBeNull()
    expect(recommendation.decisions).toHaveLength(1)
  })

  it('modifies a Recommendation without a Company', async () => {
    const fixture = await seedRecommendation({ withoutCompany: true })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ModifySuccessBody>()
    const decision = await prisma.decision.findFirstOrThrow({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.decision.companyId).toBeNull()
    expect(decision.companyId).toBeNull()
    expect(decision.status).toBe(DecisionStatus.ACTIVE)
  })

  it.each([
    ['missing', {}],
    ['non-string', { decisionTitle: 42 }],
    ['empty', { decisionTitle: '' }],
    ['whitespace-only', { decisionTitle: '   ' }],
    ['more than 500 Unicode code points', { decisionTitle: '😀'.repeat(501) }],
  ])('rejects %s decisionTitle without mutation', async (_name, titlePayload) => {
    const fixture = await seedRecommendation()
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        ...titlePayload,
      },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisionCount = await prisma.decision.count({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_DECISION_TITLE')
    expect(after).toEqual(before)
    expect(decisionCount).toBe(0)
  })

  it.each([
    ['one character', 'Я'],
    ['500 Unicode code points', '😀'.repeat(500)],
  ])('accepts a %s decisionTitle', async (_name, decisionTitle) => {
    const fixture = await seedRecommendation()

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle,
      },
    )
    const body = response.json<ModifySuccessBody>()
    const decision = await prisma.decision.findFirstOrThrow({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.decision.title).toBe(decisionTitle)
    expect(decision.title).toBe(decisionTitle)
  })

  it.each([
    ['missing', {}],
    ['empty', { decidedById: '' }],
    ['whitespace-only', { decidedById: '   ' }],
    ['non-string', { decidedById: 42 }],
  ])('rejects %s decidedById without mutation', async (_name, actorPayload) => {
    const fixture = await seedRecommendation()
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        ...actorPayload,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(400)
    expect(body.error.code).toBe('INVALID_DECIDED_BY_ID')
    expect(after).toEqual(before)
    expect(
      await prisma.decision.count({
        where: { recommendationId: fixture.recommendationId },
      }),
    ).toBe(0)
  })

  it('returns the same Decision for an identical retry', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.MODIFIED,
    })
    const existingDecision = await seedDecision(fixture)

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ModifySuccessBody>()
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(body.data.decision.id).toBe(existingDecision.id)
    expect(decisions).toHaveLength(1)
    expect(decisions[0]).toEqual(existingDecision)
  })

  it('treats surrounding whitespace as an identical retry', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.MODIFIED,
    })
    const existingDecision = await seedDecision(fixture)

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: ` \n${DEFAULT_DECISION_TITLE}\t `,
      },
    )
    const body = response.json<ModifySuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.decision.id).toBe(existingDecision.id)
    expect(
      await prisma.decision.count({
        where: { recommendationId: fixture.recommendationId },
      }),
    ).toBe(1)
  })

  it('rejects a retry with a different title without mutation', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.MODIFIED,
    })
    await seedDecision(fixture)
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisionsBefore = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: 'Сначала отправлю письмо',
      },
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
    expect(body.error.code).toBe('RECOMMENDATION_DECISION_CONFLICT')
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(decisionsAfter).toEqual(decisionsBefore)
  })

  it('rejects a retry from a different actor without mutation', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.MODIFIED,
    })
    await seedDecision(fixture)
    const otherUserId = await seedActor(fixture.requestBusinessId)
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisionsBefore = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: otherUserId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
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
    expect(body.error.code).toBe('RECOMMENDATION_DECISION_CONFLICT')
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(decisionsAfter).toEqual(decisionsBefore)
  })

  it('recovers a MODIFIED Recommendation without a Decision', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.MODIFIED,
      snoozedUntil: futureDate(86_400_000),
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ModifySuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(200)
    expect(recommendation.status).toBe(RecommendationStatus.MODIFIED)
    expect(recommendation.snoozedUntil).toBeNull()
    expect(decisions).toHaveLength(1)
    expect(body.data.decision.id).toBe(decisions[0]?.id)
    expect(decisions[0]).toMatchObject({
      title: DEFAULT_DECISION_TITLE,
      description: null,
      decidedById: fixture.userId,
      status: DecisionStatus.ACTIVE,
    })
  })

  it('safely rejects multiple existing Decisions without mutation', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.MODIFIED,
      snoozedUntil: futureDate(86_400_000),
    })
    await seedDecision(fixture)
    await seedDecision(fixture)
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisionsBefore = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
      orderBy: { id: 'asc' },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ErrorBody>()
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisionsAfter = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
      orderBy: { id: 'asc' },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_DECISION_CONFLICT')
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(decisionsAfter).toEqual(decisionsBefore)
    expect(decisionsAfter).toHaveLength(2)
  })

  it('rejects an existing Decision with a mismatched Company', async () => {
    const fixture = await seedRecommendation({
      status: RecommendationStatus.MODIFIED,
    })
    const otherCompanyId = await seedCompany(fixture.recommendationBusinessId)
    await seedDecision(fixture, { companyId: otherCompanyId })
    const recommendationBefore =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisionBefore = await prisma.decision.findFirstOrThrow({
      where: { recommendationId: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ErrorBody>()
    const recommendationAfter =
      await prisma.recommendation.findUniqueOrThrow({
        where: { id: fixture.recommendationId },
      })
    const decisionAfter = await prisma.decision.findFirstOrThrow({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_DECISION_CONFLICT')
    expect(recommendationAfter).toEqual(recommendationBefore)
    expect(decisionAfter).toEqual(decisionBefore)
  })

  it.each([
    RecommendationStatus.ACCEPTED,
    RecommendationStatus.REJECTED,
    RecommendationStatus.EXPIRED,
  ])('rejects forbidden status %s without mutation', async (status) => {
    const fixture = await seedRecommendation({
      status,
      snoozedUntil: futureDate(86_400_000),
    })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
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
    const response = await modifyRecommendationRequest(
      uniqueId('missing-business'),
      uniqueId('missing-recommendation'),
      {
        decidedById: uniqueId('missing-user'),
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
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

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      uniqueId('missing-recommendation'),
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
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
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
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
    expect(
      await prisma.decision.count({
        where: { recommendationId: fixture.recommendationId },
      }),
    ).toBe(0)
  })

  it('returns USER_NOT_FOUND without mutation', async () => {
    const fixture = await seedRecommendation()
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: uniqueId('missing-user'),
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('USER_NOT_FOUND')
    expect(after).toEqual(before)
  })

  it('returns USER_NOT_BUSINESS_MEMBER without mutation', async () => {
    const fixture = await seedRecommendation({ withMembership: false })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(403)
    expect(body.error.code).toBe('USER_NOT_BUSINESS_MEMBER')
    expect(after).toEqual(before)
  })

  it('returns RECOMMENDATION_COMPANY_CONFLICT without mutation', async () => {
    const fixture = await seedRecommendation({ companyInOtherBusiness: true })
    const before = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    const response = await modifyRecommendationRequest(
      fixture.requestBusinessId,
      fixture.recommendationId,
      {
        decidedById: fixture.userId,
        decisionTitle: DEFAULT_DECISION_TITLE,
      },
    )
    const body = response.json<ErrorBody>()
    const after = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(response.statusCode).toBe(409)
    expect(body.error.code).toBe('RECOMMENDATION_COMPANY_CONFLICT')
    expect(after).toEqual(before)
    expect(
      await prisma.decision.count({
        where: { recommendationId: fixture.recommendationId },
      }),
    ).toBe(0)
  })

  it('serializes identical concurrent Modify requests', async () => {
    const fixture = await seedRecommendation()
    const payload = {
      decidedById: fixture.userId,
      decisionTitle: DEFAULT_DECISION_TITLE,
    }

    const [firstResponse, secondResponse] = await Promise.all([
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        payload,
      ),
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        payload,
      ),
    ])
    const firstBody = firstResponse.json<ModifySuccessBody>()
    const secondBody = secondResponse.json<ModifySuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(firstBody.data.decision.id).toBe(secondBody.data.decision.id)
    expect(recommendation.status).toBe(RecommendationStatus.MODIFIED)
    expect(recommendation.snoozedUntil).toBeNull()
    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.id).toBe(firstBody.data.decision.id)
  })

  it('allows one winner for concurrent Modify requests with different titles', async () => {
    const fixture = await seedRecommendation()
    const firstTitle = 'Сначала позвоню директору'
    const secondTitle = 'Сначала отправлю письмо'

    const responses = await Promise.all([
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { decidedById: fixture.userId, decisionTitle: firstTitle },
      ),
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        { decidedById: fixture.userId, decisionTitle: secondTitle },
      ),
    ])
    const success = responses.find((response) => response.statusCode === 200)
    const conflict = responses.find((response) => response.statusCode === 409)
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })

    expect(responses.map((response) => response.statusCode).sort()).toEqual([
      200, 409,
    ])
    expect(conflict?.json<ErrorBody>().error.code).toBe(
      'RECOMMENDATION_DECISION_CONFLICT',
    )
    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.title).toBe(
      success?.json<ModifySuccessBody>().data.decision.title,
    )
    expect([firstTitle, secondTitle]).toContain(decisions[0]?.title)
    expect(recommendation.status).toBe(RecommendationStatus.MODIFIED)
    expect(recommendation.snoozedUntil).toBeNull()
  })

  it('allows one winner for concurrent Modify requests from different actors', async () => {
    const fixture = await seedRecommendation()
    const otherUserId = await seedActor(fixture.requestBusinessId)

    const responses = await Promise.all([
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        {
          decidedById: fixture.userId,
          decisionTitle: DEFAULT_DECISION_TITLE,
        },
      ),
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        {
          decidedById: otherUserId,
          decisionTitle: DEFAULT_DECISION_TITLE,
        },
      ),
    ])
    const success = responses.find((response) => response.statusCode === 200)
    const conflict = responses.find((response) => response.statusCode === 409)
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(responses.map((response) => response.statusCode).sort()).toEqual([
      200, 409,
    ])
    expect(conflict?.json<ErrorBody>().error.code).toBe(
      'RECOMMENDATION_DECISION_CONFLICT',
    )
    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.decidedById).toBe(
      success?.json<ModifySuccessBody>().data.decision.decidedById,
    )
    expect([fixture.userId, otherUserId]).toContain(decisions[0]?.decidedById)
  })

  it('allows one terminal winner for concurrent Accept and Modify', async () => {
    const fixture = await seedRecommendation()

    const [acceptResponse, modifyResponse] = await Promise.all([
      acceptRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        fixture.userId,
      ),
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        {
          decidedById: fixture.userId,
          decisionTitle: DEFAULT_DECISION_TITLE,
        },
      ),
    ])
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(
      [acceptResponse.statusCode, modifyResponse.statusCode].sort(),
    ).toEqual([200, 409])
    expect(recommendation.snoozedUntil).toBeNull()
    expect(decisions).toHaveLength(1)

    if (acceptResponse.statusCode === 200) {
      const body = acceptResponse.json<AcceptSuccessBody>()
      expect(modifyResponse.json<ErrorBody>().error.code).toBe(
        'RECOMMENDATION_STATUS_CONFLICT',
      )
      expect(recommendation.status).toBe(RecommendationStatus.ACCEPTED)
      expect(decisions[0]).toMatchObject({
        id: body.data.decision.id,
        title: 'Prepare the first outreach',
        description: 'Draft a short personalized introduction.',
        decidedById: fixture.userId,
      })
    } else {
      const body = modifyResponse.json<ModifySuccessBody>()
      expect(acceptResponse.json<ErrorBody>().error.code).toBe(
        'RECOMMENDATION_STATUS_CONFLICT',
      )
      expect(recommendation.status).toBe(RecommendationStatus.MODIFIED)
      expect(decisions[0]).toMatchObject({
        id: body.data.decision.id,
        title: DEFAULT_DECISION_TITLE,
        description: null,
        decidedById: fixture.userId,
      })
    }
  })

  it('finishes concurrent Snooze and Modify in a valid MODIFIED state', async () => {
    const fixture = await seedRecommendation()
    const snoozedUntil = futureDate(86_400_000).toISOString()

    const [snoozeResponse, modifyResponse] = await Promise.all([
      snoozeRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        snoozedUntil,
      ),
      modifyRecommendationRequest(
        fixture.requestBusinessId,
        fixture.recommendationId,
        {
          decidedById: fixture.userId,
          decisionTitle: DEFAULT_DECISION_TITLE,
        },
      ),
    ])
    const modifyBody = modifyResponse.json<ModifySuccessBody>()
    const recommendation = await prisma.recommendation.findUniqueOrThrow({
      where: { id: fixture.recommendationId },
    })
    const decisions = await prisma.decision.findMany({
      where: { recommendationId: fixture.recommendationId },
    })

    expect(modifyResponse.statusCode).toBe(200)
    expect(modifyBody.data.recommendation.status).toBe(
      RecommendationStatus.MODIFIED,
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
    expect(recommendation.status).toBe(RecommendationStatus.MODIFIED)
    expect(recommendation.snoozedUntil).toBeNull()
    expect(decisions).toHaveLength(1)
    expect(decisions[0]).toMatchObject({
      id: modifyBody.data.decision.id,
      title: DEFAULT_DECISION_TITLE,
      description: null,
      decidedById: fixture.userId,
      status: DecisionStatus.ACTIVE,
    })
  })
})
