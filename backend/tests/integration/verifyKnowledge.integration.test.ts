import {
  CompanyAssessment,
  CompanyOrigin,
  CompanyWorkState,
  KnowledgeType,
  KnowledgeVerificationStatus,
  type Knowledge,
  type PrismaClient,
} from '@prisma/client'
import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerListKnowledgeRecheckRoute } from '../../src/api/knowledge/listKnowledgeRecheckRoute.js'
import { registerVerifyKnowledgeRoute } from '../../src/api/knowledge/verifyKnowledgeRoute.js'
import { disconnectPrisma } from '../../src/infrastructure/prisma.js'
import {
  cleanupKnownTestFixtures,
  createGuardedTestPrisma,
  type KnownTestFixtureIds,
} from '../helpers/testDatabase.js'

const API_PREFIX = '/api/v1'
const PRESERVED_OBTAINED_AT = new Date('2024-02-01T08:30:00.000Z')
const PRESERVED_CHECKED_AT = new Date('2024-11-01T12:00:00.000Z')
const PRESERVED_UPDATED_AT = new Date('2020-01-01T00:00:00.000Z')
const PRESERVED_CREATED_AT = new Date('2023-05-01T10:00:00.000Z')

type VerifySuccessBody = {
  data: {
    knowledge: {
      id: string
      verificationStatus: string
      lastCheckedAt: string | null
      updatedAt: string
    }
  }
}

type RecheckSuccessBody = {
  data: {
    items: Array<{
      knowledgeId: string
      content: string
      verificationStatus: string
      lastCheckedAt: string | null
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

type HeldKnowledgeLock = {
  holderPid: number
  release: () => void
  finished: Promise<unknown>
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
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

    await sleep(25)
  }

  throw new Error(failureMessage)
}

async function holdKnowledgeLock(
  prisma: PrismaClient,
  businessId: string,
  knowledgeId: string,
): Promise<HeldKnowledgeLock> {
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
        FROM "Knowledge"
        WHERE id = ${knowledgeId}
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

function asPidList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => Number(item)).filter((item) => Number.isInteger(item))
}

async function countWaitersBehindHolder(
  prisma: PrismaClient,
  holderPid: number,
): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ pid: number; blockers: unknown }>>`
    SELECT pid, pg_blocking_pids(pid) AS blockers
    FROM pg_stat_activity
    WHERE wait_event_type = 'Lock'
  `
  const blockersByPid = new Map<number, number[]>()

  for (const row of rows) {
    blockersByPid.set(Number(row.pid), asPidList(row.blockers))
  }

  const waiting = new Set<number>()
  const pending = [...blockersByPid.entries()]
    .filter(([, blockers]) => blockers.includes(holderPid))
    .map(([pid]) => pid)

  while (pending.length > 0) {
    const pid = pending.pop()
    if (pid === undefined || waiting.has(pid)) {
      continue
    }

    waiting.add(pid)

    for (const [waiterPid, blockers] of blockersByPid) {
      if (blockers.includes(pid) && !waiting.has(waiterPid)) {
        pending.push(waiterPid)
      }
    }
  }

  return waiting.size
}

describe('POST /api/v1/businesses/:businessId/knowledge/:knowledgeId/verify', () => {
  let app: FastifyInstance
  let prisma: PrismaClient
  let fixtureIds = emptyFixtureIds()

  function uniqueId(label: string): string {
    return `test-verify-knowledge-${label}-${randomUUID()}`
  }

  function verifyUrl(businessId: string, knowledgeId: string): string {
    return `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/knowledge/${encodeURIComponent(knowledgeId)}/verify`
  }

  function verifyKnowledge(businessId: string, knowledgeId: string) {
    return app.inject({
      method: 'POST',
      url: verifyUrl(businessId, knowledgeId),
    })
  }

  function listRecheck(businessId: string) {
    return app.inject({
      method: 'GET',
      url: `${API_PREFIX}/businesses/${encodeURIComponent(businessId)}/knowledge/recheck`,
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
    previousKnowledgeId?: string | null
    content?: string
    type?: KnowledgeType
    verificationStatus?: KnowledgeVerificationStatus
    sourceLabel?: string | null
    sourceUrl?: string | null
    obtainedAt?: Date | null
    lastCheckedAt?: Date | null
  }): Promise<Knowledge> {
    const knowledgeId = uniqueId('knowledge')
    fixtureIds.knowledgeIds.push(knowledgeId)
    await prisma.knowledge.create({
      data: {
        id: knowledgeId,
        businessId: input.businessId,
        companyId: input.companyId ?? null,
        previousKnowledgeId: input.previousKnowledgeId ?? null,
        content: input.content ?? 'Knowledge that needs rechecking',
        type: input.type ?? KnowledgeType.FACT,
        verificationStatus:
          input.verificationStatus ?? KnowledgeVerificationStatus.OUTDATED,
        sourceLabel:
          input.sourceLabel === undefined ? 'Сайт компании' : input.sourceLabel,
        sourceUrl:
          input.sourceUrl === undefined ? 'https://example.test/about' : input.sourceUrl,
        obtainedAt:
          input.obtainedAt === undefined ? PRESERVED_OBTAINED_AT : input.obtainedAt,
        lastCheckedAt:
          input.lastCheckedAt === undefined ? PRESERVED_CHECKED_AT : input.lastCheckedAt,
        createdAt: PRESERVED_CREATED_AT,
      },
    })

    await prisma.$executeRaw`
      UPDATE "Knowledge"
      SET "updatedAt" = ${PRESERVED_UPDATED_AT}
      WHERE id = ${knowledgeId}
    `

    return prisma.knowledge.findUniqueOrThrow({ where: { id: knowledgeId } })
  }

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    app = Fastify({ logger: false })
    await registerListKnowledgeRecheckRoute(app, API_PREFIX)
    await registerVerifyKnowledgeRoute(app, API_PREFIX)
    await app.ready()
  })

  afterEach(async () => {
    const completedFixtureIds = fixtureIds
    fixtureIds = emptyFixtureIds()
    if (completedFixtureIds.knowledgeIds.length > 0) {
      await prisma.knowledge.updateMany({
        where: { id: { in: completedFixtureIds.knowledgeIds } },
        data: { previousKnowledgeId: null },
      })
    }
    await cleanupKnownTestFixtures(prisma, completedFixtureIds)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
    await disconnectPrisma()
  })

  it('verifies OUTDATED knowledge and preserves content, source, and relations', async () => {
    const businessId = await seedBusiness('outdated')
    const companyId = await seedCompany(businessId, 'Северная верфь')
    const previous = await seedKnowledge({
      businessId,
      companyId,
      content: 'Предыдущая формулировка',
      verificationStatus: KnowledgeVerificationStatus.VERIFIED,
    })
    const companyBefore = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    })
    const before = await seedKnowledge({
      businessId,
      companyId,
      previousKnowledgeId: previous.id,
      content: 'Сайт больше не открывается',
      type: KnowledgeType.OBSERVATION,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      sourceLabel: 'Сайт компании',
      sourceUrl: 'https://example.test/about',
      obtainedAt: PRESERVED_OBTAINED_AT,
      lastCheckedAt: PRESERVED_CHECKED_AT,
    })

    const response = await verifyKnowledge(businessId, before.id)
    const body = response.json<VerifySuccessBody>()
    const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })
    const companyAfter = await prisma.company.findUniqueOrThrow({ where: { id: companyId } })

    expect(response.statusCode).toBe(200)
    expect(body.data.knowledge.id).toBe(before.id)
    expect(body.data.knowledge.verificationStatus).toBe('VERIFIED')
    expect(body.data.knowledge.lastCheckedAt).toBe(after.lastCheckedAt?.toISOString())
    expect(body.data.knowledge.updatedAt).toBe(after.updatedAt.toISOString())
    expect(after.verificationStatus).toBe(KnowledgeVerificationStatus.VERIFIED)
    expect(after.lastCheckedAt).not.toBeNull()
    expect(after.lastCheckedAt?.getTime()).toBeGreaterThan(PRESERVED_CHECKED_AT.getTime())
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
    expect(after.content).toBe(before.content)
    expect(after.type).toBe(before.type)
    expect(after.sourceLabel).toBe(before.sourceLabel)
    expect(after.sourceUrl).toBe(before.sourceUrl)
    expect(after.obtainedAt).toEqual(before.obtainedAt)
    expect(after.createdAt).toEqual(before.createdAt)
    expect(after.companyId).toBe(before.companyId)
    expect(after.previousKnowledgeId).toBe(before.previousKnowledgeId)
    expect(after.businessId).toBe(before.businessId)
    expect(companyAfter).toEqual(companyBefore)
  })

  it('verifies NEEDS_VERIFICATION knowledge', async () => {
    const businessId = await seedBusiness('needs')
    const before = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
      lastCheckedAt: null,
      content: 'Телефон нужно подтвердить',
      type: KnowledgeType.USER_INFO,
    })

    const response = await verifyKnowledge(businessId, before.id)
    const body = response.json<VerifySuccessBody>()
    const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(body.data.knowledge).toEqual({
      id: before.id,
      verificationStatus: 'VERIFIED',
      lastCheckedAt: after.lastCheckedAt?.toISOString(),
      updatedAt: after.updatedAt.toISOString(),
    })
    expect(after.verificationStatus).toBe(KnowledgeVerificationStatus.VERIFIED)
    expect(after.lastCheckedAt).not.toBeNull()
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime())
    expect(after.content).toBe(before.content)
    expect(after.type).toBe(before.type)
  })

  it('returns already VERIFIED knowledge without a second write', async () => {
    const businessId = await seedBusiness('verified')
    const before = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.VERIFIED,
      lastCheckedAt: PRESERVED_CHECKED_AT,
    })

    const response = await verifyKnowledge(businessId, before.id)
    const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(response.json<VerifySuccessBody>().data.knowledge).toEqual({
      id: before.id,
      verificationStatus: 'VERIFIED',
      lastCheckedAt: PRESERVED_CHECKED_AT.toISOString(),
      updatedAt: PRESERVED_UPDATED_AT.toISOString(),
    })
    expect(after).toEqual(before)
  })

  it('preserves a null lastCheckedAt on already VERIFIED knowledge', async () => {
    const businessId = await seedBusiness('verified-null')
    const before = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.VERIFIED,
      lastCheckedAt: null,
    })

    const response = await verifyKnowledge(businessId, before.id)
    const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(response.json<VerifySuccessBody>().data.knowledge).toEqual({
      id: before.id,
      verificationStatus: 'VERIFIED',
      lastCheckedAt: null,
      updatedAt: PRESERVED_UPDATED_AT.toISOString(),
    })
    expect(after.lastCheckedAt).toBeNull()
    expect(after).toEqual(before)
  })

  it('keeps the original timestamps when verify is repeated', async () => {
    const businessId = await seedBusiness('repeat')
    const before = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      lastCheckedAt: null,
    })

    const firstResponse = await verifyKnowledge(businessId, before.id)
    const afterFirst = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })
    await sleep(40)
    const secondResponse = await verifyKnowledge(businessId, before.id)
    const afterSecond = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

    expect(firstResponse.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(secondResponse.json<VerifySuccessBody>().data.knowledge).toEqual({
      id: before.id,
      verificationStatus: 'VERIFIED',
      lastCheckedAt: afterFirst.lastCheckedAt?.toISOString() ?? null,
      updatedAt: afterFirst.updatedAt.toISOString(),
    })
    expect(afterSecond.lastCheckedAt).toEqual(afterFirst.lastCheckedAt)
    expect(afterSecond.updatedAt).toEqual(afterFirst.updatedAt)
    expect(afterSecond).toEqual(afterFirst)
    expect(afterFirst.lastCheckedAt).not.toBeNull()
  })

  it('rejects ASSUMPTION without changing the knowledge', async () => {
    const businessId = await seedBusiness('assumption')
    const before = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.ASSUMPTION,
    })

    const response = await verifyKnowledge(businessId, before.id)
    const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(409)
    expect(response.json<ErrorBody>().error).toEqual({
      code: 'KNOWLEDGE_VERIFICATION_CONFLICT',
      message: 'Knowledge cannot be verified from its current status.',
      details: {},
    })
    expect(after).toEqual(before)
  })

  it('returns business not found without changing another tenant knowledge', async () => {
    const businessId = await seedBusiness('unknown-business')
    const before = await seedKnowledge({ businessId })

    const response = await verifyKnowledge(uniqueId('absent-business'), before.id)
    const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('BUSINESS_NOT_FOUND')
    expect(after).toEqual(before)
  })

  it('returns not found for missing knowledge', async () => {
    const businessId = await seedBusiness('missing')

    const response = await verifyKnowledge(businessId, uniqueId('absent-knowledge'))

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('KNOWLEDGE_NOT_FOUND')
  })

  it('does not verify knowledge that belongs to another business', async () => {
    const ownerId = await seedBusiness('owner')
    const otherId = await seedBusiness('other')
    const before = await seedKnowledge({ businessId: ownerId })

    const response = await verifyKnowledge(otherId, before.id)
    const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(404)
    expect(response.json<ErrorBody>().error.code).toBe('KNOWLEDGE_NOT_FOUND')
    expect(after).toEqual(before)
  })

  it('verifies knowledge that has no company', async () => {
    const businessId = await seedBusiness('no-company')
    const before = await seedKnowledge({
      businessId,
      companyId: null,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
    })

    const response = await verifyKnowledge(businessId, before.id)
    const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

    expect(response.statusCode).toBe(200)
    expect(after.verificationStatus).toBe(KnowledgeVerificationStatus.VERIFIED)
    expect(after.companyId).toBeNull()
    expect(after.content).toBe(before.content)
    expect(after.obtainedAt).toEqual(before.obtainedAt)
  })

  it('removes only the verified record from the recheck queue', async () => {
    const businessId = await seedBusiness('queue')
    const verifiedTarget = await seedKnowledge({
      businessId,
      content: 'Этот факт подтверждаем',
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      lastCheckedAt: new Date('2024-01-01T00:00:00.000Z'),
    })
    const remaining = await seedKnowledge({
      businessId,
      content: 'Этот факт остаётся в очереди',
      verificationStatus: KnowledgeVerificationStatus.NEEDS_VERIFICATION,
      lastCheckedAt: new Date('2024-06-01T00:00:00.000Z'),
      type: KnowledgeType.AI_INFERENCE,
      sourceLabel: 'Заметка',
      sourceUrl: null,
    })
    const remainingBefore = await prisma.knowledge.findUniqueOrThrow({
      where: { id: remaining.id },
    })

    const verifyResponse = await verifyKnowledge(businessId, verifiedTarget.id)
    const listResponse = await listRecheck(businessId)
    const remainingAfter = await prisma.knowledge.findUniqueOrThrow({
      where: { id: remaining.id },
    })

    expect(verifyResponse.statusCode).toBe(200)
    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json<RecheckSuccessBody>().data.items).toEqual([
      expect.objectContaining({
        knowledgeId: remaining.id,
        content: 'Этот факт остаётся в очереди',
        verificationStatus: 'NEEDS_VERIFICATION',
        lastCheckedAt: remainingBefore.lastCheckedAt?.toISOString() ?? null,
      }),
    ])
    expect(remainingAfter).toEqual(remainingBefore)
  })

  it('lets two overlapping verifies persist one transition', async () => {
    const businessId = await seedBusiness('concurrent')
    const before = await seedKnowledge({
      businessId,
      verificationStatus: KnowledgeVerificationStatus.OUTDATED,
      lastCheckedAt: PRESERVED_CHECKED_AT,
      content: 'Один переход',
    })
    const held = await holdKnowledgeLock(prisma, businessId, before.id)
    const firstPromise = verifyKnowledge(businessId, before.id)

    try {
      await waitUntil(
        async () => (await countWaitersBehindHolder(prisma, held.holderPid)) >= 1,
        3_000,
        'First verify was not blocked by the knowledge row lock.',
      )
      await sleep(50)
      const secondPromise = verifyKnowledge(businessId, before.id)
      await waitUntil(
        async () => (await countWaitersBehindHolder(prisma, held.holderPid)) >= 2,
        3_000,
        'Second verify was not blocked by the knowledge row lock.',
      )
      held.release()

      const [firstResponse, secondResponse] = await Promise.all([
        firstPromise,
        secondPromise,
      ])
      const firstBody = firstResponse.json<VerifySuccessBody>()
      const secondBody = secondResponse.json<VerifySuccessBody>()
      const after = await prisma.knowledge.findUniqueOrThrow({ where: { id: before.id } })

      expect(firstResponse.statusCode).toBe(200)
      expect(secondResponse.statusCode).toBe(200)
      expect(firstBody.data.knowledge.lastCheckedAt).toBe(secondBody.data.knowledge.lastCheckedAt)
      expect(firstBody.data.knowledge.updatedAt).toBe(secondBody.data.knowledge.updatedAt)
      expect(firstBody.data.knowledge.lastCheckedAt).not.toBe(PRESERVED_CHECKED_AT.toISOString())
      expect(after.verificationStatus).toBe(KnowledgeVerificationStatus.VERIFIED)
      expect(after.lastCheckedAt?.toISOString()).toBe(firstBody.data.knowledge.lastCheckedAt)
      expect(after.updatedAt.toISOString()).toBe(firstBody.data.knowledge.updatedAt)
      expect(after.content).toBe(before.content)
      expect(after.type).toBe(before.type)
      expect(after.obtainedAt).toEqual(before.obtainedAt)
      expect(after.companyId).toBe(before.companyId)
    } finally {
      held.release()
      await held.finished
    }
  })
})
