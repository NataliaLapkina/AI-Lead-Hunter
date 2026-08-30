import 'dotenv/config'
import { checkDatabaseConnection, disconnectPrisma } from '../src/infrastructure/prisma.ts'

async function main() {
  const ok = await checkDatabaseConnection()
  console.log(ok ? 'DB_CONNECTION_OK' : 'DB_CONNECTION_FAILED')
  await disconnectPrisma()
  process.exit(ok ? 0 : 1)
}

main().catch(async () => {
  console.log('DB_CONNECTION_FAILED')
  try {
    await disconnectPrisma()
  } catch {
    // ignore
  }
  process.exit(1)
})
