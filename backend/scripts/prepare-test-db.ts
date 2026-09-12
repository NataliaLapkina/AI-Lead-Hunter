import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createGuardedTestPrisma } from '../tests/helpers/testDatabase.js'

async function prepareTestDatabase(): Promise<void> {
  process.env.NODE_ENV = 'test'

  const { prisma, environment } = await createGuardedTestPrisma()
  await prisma.$disconnect()

  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
  const prismaCliPath = path.resolve(
    scriptDirectory,
    '..',
    'node_modules',
    'prisma',
    'build',
    'index.js',
  )
  const result = spawnSync(
    process.execPath,
    [prismaCliPath, 'migrate', 'deploy'],
    {
      cwd: path.resolve(scriptDirectory, '..'),
      env: {
        ...process.env,
        DATABASE_URL: environment.connectionString,
      },
      stdio: 'inherit',
    },
  )

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(
      `Test database migration failed with exit code ${result.status ?? 'unknown'}.`,
    )
  }

  console.log(`TEST_DATABASE_READY:${environment.databaseName}`)
}

prepareTestDatabase().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
