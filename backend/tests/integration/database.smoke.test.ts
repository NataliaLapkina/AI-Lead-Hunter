import type { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  TEST_DATABASE_NAME,
  createGuardedTestPrisma,
  type TestDatabaseEnvironment,
} from '../helpers/testDatabase.js'

describe('test database', () => {
  let prisma: PrismaClient
  let environment: TestDatabaseEnvironment

  beforeAll(async () => {
    const guardedDatabase = await createGuardedTestPrisma()
    prisma = guardedDatabase.prisma
    environment = guardedDatabase.environment
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('connects only to ai_lead_hunter_test and executes a query', async () => {
    const databases = await prisma.$queryRaw<Array<{ databaseName: string }>>`
      SELECT current_database() AS "databaseName"
    `
    const queryResult = await prisma.$queryRaw<Array<{ value: number }>>`
      SELECT 1 AS value
    `

    expect(environment.databaseName).toBe(TEST_DATABASE_NAME)
    expect(databases[0]?.databaseName).toBe(TEST_DATABASE_NAME)
    expect(databases[0]?.databaseName).not.toBe('ai_lead_hunter')
    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL)
    expect(queryResult[0]?.value).toBe(1)
  })
})
