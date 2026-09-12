import 'dotenv/config'
import Fastify from 'fastify'
import { registerListCompaniesRoute } from './api/companies/listCompaniesRoute.js'
import { registerStartCompanyWorkRoute } from './api/companies/startCompanyWorkRoute.js'
import { registerUpdateCompanyAssessmentRoute } from './api/companies/updateCompanyAssessmentRoute.js'
import { registerAcceptRecommendationRoute } from './api/recommendations/acceptRecommendationRoute.js'
import { registerSnoozeRecommendationRoute } from './api/recommendations/snoozeRecommendationRoute.js'
import { registerListSearchResultsRoute } from './api/searches/listSearchResultsRoute.js'
import { registerGetSearchResultDetailRoute } from './api/searches/getSearchResultDetailRoute.js'
import {
  checkDatabaseConnection,
  disconnectPrisma,
} from './infrastructure/prisma.js'

const DEFAULT_PORT = 3001
const API_PREFIX = '/api/v1'

function resolvePort(): number {
  const raw = process.env.PORT
  if (!raw) return DEFAULT_PORT

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: "${raw}"`)
  }

  return parsed
}

async function buildServer() {
  const app = Fastify({
    logger: true,
  })

  app.get(`${API_PREFIX}/health`, async (_request, reply) => {
    const databaseConnected = await checkDatabaseConnection()

    if (!databaseConnected) {
      return reply.status(503).send({
        data: {
          status: 'error',
          database: 'disconnected',
        },
      })
    }

    return reply.status(200).send({
      data: {
        status: 'ok',
        database: 'connected',
      },
    })
  })

  await registerListCompaniesRoute(app, API_PREFIX)
  await registerUpdateCompanyAssessmentRoute(app, API_PREFIX)
  await registerStartCompanyWorkRoute(app, API_PREFIX)
  await registerListSearchResultsRoute(app, API_PREFIX)
  await registerGetSearchResultDetailRoute(app, API_PREFIX)
  await registerAcceptRecommendationRoute(app, API_PREFIX)
  await registerSnoozeRecommendationRoute(app, API_PREFIX)

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found.',
        details: {},
      },
    })
  })

  return app
}

async function start() {
  const app = await buildServer()
  const port = resolvePort()

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down`)
    try {
      await app.close()
      await disconnectPrisma()
      process.exit(0)
    } catch (error) {
      app.log.error(error)
      process.exit(1)
    }
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  await app.listen({
    port,
    host: '0.0.0.0',
  })
}

start().catch(async (error) => {
  console.error(error)
  try {
    await disconnectPrisma()
  } catch {
    // ignore disconnect errors during failed startup
  }
  process.exit(1)
})
