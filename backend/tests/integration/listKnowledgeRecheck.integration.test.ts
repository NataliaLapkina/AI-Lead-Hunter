import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  KnowledgeType,
  KnowledgeVerificationStatus,
  type PrismaClient,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerListKnowledgeRecheckRoute } from '../../src/api/knowledge/listKnowledgeRecheckRoute.js'
import { KNOWLEDGE_RECHECK_ITEM_LIMIT } from '../../src/domain/knowledge/knowledgeRecheckResponse.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'

type RecheckItemJson = {
  knowledgeId: string
  content: string
  type: 'FACT' | 'OBSERVATION' | 'AI_INFERENCE' | 'USER_INFO'
  verificationStatus: 'OUTDATED' | 'NEEDS_VERIFICATION'
  sourceLabel: string | null
  sourceUrl: string | null
  obtainedAt: string | null
  lastCheckedAt: string | null
  company: { id: string; name: string } | null
}

type RecheckSuccessBody = {
  data: {
    items: RecheckItemJson[]
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

describe('GET /api/v1/businesses/:businessId/knowledge/recheck', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-knowledge-recheck-${label}-${randomUUID()}`
  }

  function recheckUrl(businessId: string): string {
    return `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/knowledge/recheck`
  }

  function listRecheck(businessId: string) {
    return app.inject({
      method: 'GET',
      url: recheckUrl(businessId),
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

  async function seedCompany(businessId: string, name: string): Promise<string> {
    const companyId = uniqueId('company')
    fixtureIds.companyIds.push(companyId)
    await prisma.company.create({
      data: {
        id: companyId,
        businessId,
        name,
        origin: CompanyOrigin.MANUAL,
        assessment: CompanyAssessment.SUITABLE,
        workState: CompanyWorkState.ACTIVE,
      },
    })
    return companyId
  }

  async function seedKnowledge(input: {
    businessId: string
    companyId?: string | null
    content?: string
    type?: KnowledgeType
    verificationStatus?: KnowledgeVerificationStatus
    sourceLabel?: string | null
    sourceUrl?: string | null
    obtainedAt?: Date | null
    lastCheckedAt?: Date | null
    createdAt?: Date
    id?: string
  }): Promise<string> {
    const knowledgeId = input.id ?? uniqueId('knowledge')
    fixtureIds.knowledgeIds.push(knowledgeId)
    await prisma.knowledge.create({
      data: {
        id: knowledgeId,
        businessId: input.businessId,
        companyId: input.companyId ?? null,
        content: input.content ?? 'Knowledge that needs rechecking',
        type: input.type ?? KnowledgeType.FACT,
        verificationStatus:
          input.verificationStatus ?? KnowledgeVerificationStatus.OUTDATED,
        sourceLabel: input.sourceLabel,
        sourceUrl: input.sourceUrl,
        obtainedAt: input.obtainedAt,
        lastCheckedAt: input.lastCheckedAt,
        createdAt: input.createdAt,
      },
    })
    return knowledgeId
  }

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerListKnowledgeRecheckRoute(app, API_PREFIX)
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

  it('includes OUTDATED knowledge with its same-business company and source fields', async () => {
    const businessId = await seedBusiness('outdated')
    const companyId = await seedCompany(businessId, 'Северная верфь')
    const obtainedAt = new Date('2024-02-01T08:30:00.000Z')
    const lastCheckedAt = new Date('2024-11-01T12:00:00.000Z')
    const knowledgeId = await seedKnowledge({
      businessId,
      companyId,
      content: 'Сайт больше не открывается',
      type: KnowledgeType.OBSERVATION,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      sourceLabel: 'Сайт компании',
      sourceUrl: 'https://example.test/about',
      obtainedAt,
      lastCheckedAt,
    })

    const response = await listRecheck(businessId)
    const body = response.json<RecheckSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.items).toEqual([
      {
        knowledgeId,
        content: 'Сайт больше не открывается',
        type: 'OBSERVATION',
        verificationStatus: 'OUTDATED',
        sourceLabel: 'Сайт компании',
        sourceUrl: 'https://example.test/about',
        obtainedAt: obtainedAt.toISOString(),
        lastCheckedAt: lastCheckedAt.toISOString(),
        company: {
          id: companyId,
          name: 'Северная верфь',
        },
      },
    ])
  })

  it('includes NEEDS_VERIFICATION knowledge', async () => {
    const businessId = await seedBusiness('needs')
    const obtainedAt = new Date('2025-01-10T09:00:00.000Z')
    const knowledgeId = await seedKnowledge({
      businessId,
      content: 'Телефон нужно подтвердить',
      type: KnowledgeType.USER_INFO,
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
      sourceLabel: 'Заметка пользователя',
      sourceUrl: null,
      obtainedAt,
      lastCheckedAt: null,
    })

    const response = await listRecheck(businessId)

    expect(response.statusCode).toBe(200)
    expect(response.json<RecheckSuccessBody>().data.items).toEqual([
      {
        knowledgeId,
        content: 'Телефон нужно подтвердить',
        type: 'USER_INFO',
        verificationStatus: 'NEEDS_VERIFICATION',
        sourceLabel: 'Заметка пользователя',
        sourceUrl: null,
        obtainedAt: obtainedAt.toISOString(),
        lastCheckedAt: null,
        company: null,
      },
    ])
  })

  it('excludes VERIFIED knowledge', async () => {
    const businessId = await seedBusiness('verified')
    const includedId = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      content: 'Устаревший факт',
    })
    await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.VERIFIED,
      content: 'Подтверждённый факт',
    })

    const response = await listRecheck(businessId)
    const body = response.json<RecheckSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.items.map((item) => item.knowledgeId)).toEqual([includedId])
    expect(JSON.stringify(body)).not.toContain('Подтверждённый факт')
  })

  it('excludes ASSUMPTION knowledge', async () => {
    const businessId = await seedBusiness('assumption')
    const includedId = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
      content: 'Нужно проверить',
    })
    await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.ASSUMPTION,
      content: 'Это только предположение',
    })

    const response = await listRecheck(businessId)
    const body = response.json<RecheckSuccessBody>()

    expect(response.statusCode).toBe(200)
    expect(body.data.items.map((item) => item.knowledgeId)).toEqual([includedId])
    expect(JSON.stringify(body)).not.toContain('Это только предположение')
  })

  it('excludes knowledge that belongs to another business', async () => {
    const businessId = await seedBusiness('tenant')
    const otherBusinessId = await seedBusiness('other')
    const ownId = await seedKnowledge({
      businessId,
      content: 'Своё знание',
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
    })
    const foreignId = await seedKnowledge({
      businessId: otherBusinessId,
      content: 'Чужое знание',
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
    })

    const response = await listRecheck(businessId)
    const serialized = JSON.stringify(response.json())

    expect(response.statusCode).toBe(200)
    expect(response.json<RecheckSuccessBody>().data.items.map((item) => item.knowledgeId)).toEqual([
      ownId,
    ])
    expect(serialized).not.toContain(foreignId)
    expect(serialized).not.toContain('Чужое знание')
  })

  it('returns an empty list for a business with no matching knowledge', async () => {
    const businessId = await seedBusiness('empty')
    await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.VERIFIED,
    })

    const response = await listRecheck(businessId)

    expect(response.statusCode).toBe(200)
    expect(response.json<RecheckSuccessBody>().data.items).toEqual([])
  })

  it('returns BUSINESS_NOT_FOUND for an unknown business', async () => {
    const response = await listRecheck(uniqueId('missing'))
    const body = response.json<ErrorBody>()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('BUSINESS_NOT_FOUND')
    expect(body.error.message).toBe('Business not found.')
    expect(body.error.details).toEqual({})
  })

  it('does not leak a company that belongs to another business', async () => {
    const businessId = await seedBusiness('company-tenant')
    const otherBusinessId = await seedBusiness('company-other')
    const foreignName = uniqueId('foreign-company-name')
    const foreignCompanyId = await seedCompany(otherBusinessId, foreignName)
    const knowledgeId = await seedKnowledge({
      businessId,
      companyId: foreignCompanyId,
      content: 'Знание со ссылкой на чужую компанию',
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
    })

    const response = await listRecheck(businessId)
    const body = response.json<RecheckSuccessBody>()
    const serialized = JSON.stringify(body)

    expect(response.statusCode).toBe(200)
    expect(body.data.items).toEqual([
      expect.objectContaining({
        knowledgeId,
        company: null,
      }),
    ])
    expect(serialized).not.toContain(foreignCompanyId)
    expect(serialized).not.toContain(foreignName)
  })

  it('returns knowledge that has no company', async () => {
    const businessId = await seedBusiness('no-company')
    const knowledgeId = await seedKnowledge({
      businessId,
      companyId: null,
      content: 'Знание без компании',
      type: KnowledgeType.AI_INFERENCE,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      sourceLabel: null,
      sourceUrl: null,
    })

    const response = await listRecheck(businessId)
    const item = response.json<RecheckSuccessBody>().data.items[0]

    expect(response.statusCode).toBe(200)
    expect(item).toMatchObject({
      knowledgeId,
      content: 'Знание без компании',
      type: 'AI_INFERENCE',
      verificationStatus: 'OUTDATED',
      sourceLabel: null,
      sourceUrl: null,
      company: null,
    })
  })

  it('orders OUTDATED before NEEDS_VERIFICATION, then by meaningful date, then by id', async () => {
    const businessId = await seedBusiness('order')
    const prefix = uniqueId('tie')
    const early = new Date('2024-01-01T00:00:00.000Z')
    const middle = new Date('2024-06-01T00:00:00.000Z')
    const late = new Date('2025-01-01T00:00:00.000Z')
    const olderThanCreatedAt = new Date('2020-01-01T00:00:00.000Z')

    const outdatedLaterA = await seedKnowledge({
      id: `${prefix}-a`,
      businessId,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      lastCheckedAt: late,
      obtainedAt: early,
      createdAt: early,
      content: 'outdated later a',
    })
    const outdatedLaterB = await seedKnowledge({
      id: `${prefix}-b`,
      businessId,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      lastCheckedAt: late,
      obtainedAt: early,
      createdAt: early,
      content: 'outdated later b',
    })
    const outdatedEarlier = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      lastCheckedAt: middle,
      obtainedAt: early,
      createdAt: early,
      content: 'outdated earlier',
    })
    const needsByCreatedAt = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
      lastCheckedAt: null,
      obtainedAt: null,
      createdAt: early,
      content: 'needs by createdAt',
    })
    const needsByObtainedAt = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
      lastCheckedAt: null,
      obtainedAt: middle,
      createdAt: olderThanCreatedAt,
      content: 'needs by obtainedAt',
    })

    const response = await listRecheck(businessId)

    expect(response.json<RecheckSuccessBody>().data.items.map((item) => item.knowledgeId)).toEqual([
      outdatedEarlier,
      outdatedLaterA,
      outdatedLaterB,
      needsByCreatedAt,
      needsByObtainedAt,
    ])
    expect(outdatedLaterA < outdatedLaterB).toBe(true)
  })

  it('returns at most 20 rows and keeps OUTDATED ahead of an older NEEDS_VERIFICATION', async () => {
    const businessId = await seedBusiness('limit')
    const base = new Date('2024-01-01T00:00:00.000Z').getTime()
    const includedIds: string[] = []
    for (let index = 0; index < KNOWLEDGE_RECHECK_ITEM_LIMIT; index += 1) {
      includedIds.push(
        await seedKnowledge({
          businessId,
          verificationStatus: KnowledgeVerificationStatus.OUTDATED,
          lastCheckedAt: new Date(base + index * 1_000),
          content: `outdated ${index}`,
        }),
      )
    }
    const overflowId = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      lastCheckedAt: new Date(base + KNOWLEDGE_RECHECK_ITEM_LIMIT * 1_000),
      content: 'outdated overflow',
    })
    const olderNeedsId = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
      lastCheckedAt: new Date('2020-01-01T00:00:00.000Z'),
      content: 'older needs verification',
    })

    const response = await listRecheck(businessId)
    const ids = response.json<RecheckSuccessBody>().data.items.map((item) => item.knowledgeId)

    expect(ids).toEqual(includedIds)
    expect(ids).toHaveLength(KNOWLEDGE_RECHECK_ITEM_LIMIT)
    expect(ids).not.toContain(overflowId)
    expect(ids).not.toContain(olderNeedsId)
  })

  it('does not change knowledge or company records when read twice', async () => {
    const businessId = await seedBusiness('readonly')
    const companyId = await seedCompany(businessId, 'Неизменная компания')
    const obtainedAt = new Date('2024-03-03T03:03:03.000Z')
    const lastCheckedAt = new Date('2024-04-04T04:04:04.000Z')
    const knowledgeId = await seedKnowledge({
      businessId,
      companyId,
      content: 'Только чтение',
      type: KnowledgeType.FACT,
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
      obtainedAt,
      lastCheckedAt,
    })
    const knowledgeBefore = await prisma.knowledge.findUniqueOrThrow({
      where: { id: knowledgeId },
    })
    const companyBefore = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    })

    const first = await listRecheck(businessId)
    const second = await listRecheck(businessId)
    const knowledgeAfter = await prisma.knowledge.findUniqueOrThrow({
      where: { id: knowledgeId },
    })
    const companyAfter = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    })

    expect(first.statusCode).toBe(200)
    expect(second.json()).toEqual(first.json())
    expect(knowledgeAfter.verificationStatus).toBe(knowledgeBefore.verificationStatus)
    expect(knowledgeAfter.obtainedAt?.toISOString()).toBe(knowledgeBefore.obtainedAt?.toISOString())
    expect(knowledgeAfter.lastCheckedAt?.toISOString()).toBe(
      knowledgeBefore.lastCheckedAt?.toISOString(),
    )
    expect(knowledgeAfter.createdAt.toISOString()).toBe(knowledgeBefore.createdAt.toISOString())
    expect(knowledgeAfter.updatedAt.toISOString()).toBe(knowledgeBefore.updatedAt.toISOString())
    expect(knowledgeAfter.content).toBe(knowledgeBefore.content)
    expect(knowledgeAfter.companyId).toBe(companyId)
    expect(companyAfter.name).toBe(companyBefore.name)
    expect(companyAfter.updatedAt.toISOString()).toBe(companyBefore.updatedAt.toISOString())
    expect(companyAfter.businessId).toBe(businessId)
  })
})
