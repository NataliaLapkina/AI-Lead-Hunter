import type { PrismaClient } from '@prisma/client'

const DEVELOPMENT_DATABASE_NAME = 'ai_lead_hunter'
export const TEST_DATABASE_NAME = 'ai_lead_hunter_test'

export type TestDatabaseEnvironment = {
  connectionString: string
  databaseName: string
}

export type KnownTestFixtureIds = {
  recommendationIds?: string[]
  decisionIds?: string[]
  knowledgeIds?: string[]
  companyIds?: string[]
  membershipIds?: string[]
  businessIds?: string[]
  userIds?: string[]
}

export function requireTestDatabaseEnvironment(): TestDatabaseEnvironment {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'Refusing test database access: NODE_ENV must be exactly "test".',
    )
  }

  const connectionString = process.env.TEST_DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'TEST_DATABASE_URL is required. Create the ai_lead_hunter_test database and set its connection URL.',
    )
  }

  let databaseUrl: URL
  try {
    databaseUrl = new URL(connectionString)
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.')
  }

  if (
    databaseUrl.protocol !== 'postgresql:' &&
    databaseUrl.protocol !== 'postgres:'
  ) {
    throw new Error('TEST_DATABASE_URL must use the PostgreSQL protocol.')
  }

  const databaseName = decodeURIComponent(
    databaseUrl.pathname.replace(/^\/+/, ''),
  )
  const normalizedDatabaseName = databaseName.toLowerCase()

  if (!databaseName || databaseName.includes('/')) {
    throw new Error('TEST_DATABASE_URL must contain one database name.')
  }

  if (normalizedDatabaseName === DEVELOPMENT_DATABASE_NAME) {
    throw new Error(
      `Refusing test database access: "${DEVELOPMENT_DATABASE_NAME}" is the development database.`,
    )
  }

  if (
    normalizedDatabaseName !== TEST_DATABASE_NAME &&
    !normalizedDatabaseName.endsWith('_test')
  ) {
    throw new Error(
      `Refusing test database access: database "${databaseName}" must be "${TEST_DATABASE_NAME}" or end with "_test".`,
    )
  }

  process.env.DATABASE_URL = connectionString

  return {
    connectionString,
    databaseName,
  }
}

export async function assertCurrentTestDatabase(
  prisma: PrismaClient,
  expectedDatabaseName: string,
): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ databaseName: string }>>`
    SELECT current_database() AS "databaseName"
  `
  const currentDatabaseName = rows[0]?.databaseName

  if (currentDatabaseName !== expectedDatabaseName) {
    throw new Error(
      `Refusing test database access: connected to "${currentDatabaseName ?? 'unknown'}", expected "${expectedDatabaseName}".`,
    )
  }
}

export async function createGuardedTestPrisma(): Promise<{
  prisma: PrismaClient
  environment: TestDatabaseEnvironment
}> {
  const environment = requireTestDatabaseEnvironment()
  const [{ PrismaClient }, { PrismaPg }] = await Promise.all([
    import('@prisma/client'),
    import('@prisma/adapter-pg'),
  ])
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: environment.connectionString,
    }),
  })

  try {
    await assertCurrentTestDatabase(prisma, environment.databaseName)
  } catch (error) {
    await prisma.$disconnect()
    throw new Error(
      `Cannot safely connect to test database "${environment.databaseName}". Create it before running tests and verify TEST_DATABASE_URL.`,
      { cause: error },
    )
  }

  return {
    prisma,
    environment,
  }
}

export async function cleanupKnownTestFixtures(
  prisma: PrismaClient,
  fixtureIds: KnownTestFixtureIds,
): Promise<void> {
  const environment = requireTestDatabaseEnvironment()
  await assertCurrentTestDatabase(prisma, environment.databaseName)

  const recommendationIds = fixtureIds.recommendationIds ?? []
  const decisionIds = fixtureIds.decisionIds ?? []
  const knowledgeIds = fixtureIds.knowledgeIds ?? []
  const companyIds = fixtureIds.companyIds ?? []
  const membershipIds = fixtureIds.membershipIds ?? []
  const businessIds = fixtureIds.businessIds ?? []
  const userIds = fixtureIds.userIds ?? []

  if (recommendationIds.length > 0 || knowledgeIds.length > 0) {
    await prisma.recommendationKnowledge.deleteMany({
      where: {
        OR: [
          ...(recommendationIds.length > 0
            ? [{ recommendationId: { in: recommendationIds } }]
            : []),
          ...(knowledgeIds.length > 0
            ? [{ knowledgeId: { in: knowledgeIds } }]
            : []),
        ],
      },
    })
  }

  if (decisionIds.length > 0) {
    await prisma.task.deleteMany({
      where: { decisionId: { in: decisionIds } },
    })
  }

  if (decisionIds.length > 0 || recommendationIds.length > 0) {
    await prisma.decision.deleteMany({
      where: {
        OR: [
          ...(decisionIds.length > 0 ? [{ id: { in: decisionIds } }] : []),
          ...(recommendationIds.length > 0
            ? [{ recommendationId: { in: recommendationIds } }]
            : []),
        ],
      },
    })
  }

  if (recommendationIds.length > 0) {
    await prisma.recommendation.deleteMany({
      where: { id: { in: recommendationIds } },
    })
  }

  if (knowledgeIds.length > 0) {
    await prisma.knowledge.deleteMany({
      where: { id: { in: knowledgeIds } },
    })
  }

  if (companyIds.length > 0) {
    await prisma.company.deleteMany({
      where: { id: { in: companyIds } },
    })
  }

  if (membershipIds.length > 0) {
    await prisma.membership.deleteMany({
      where: { id: { in: membershipIds } },
    })
  }

  if (businessIds.length > 0) {
    await prisma.business.deleteMany({
      where: { id: { in: businessIds } },
    })
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    })
  }
}
