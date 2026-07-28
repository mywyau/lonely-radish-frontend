import { db } from '~/server/repositories/db'
import { inspectProductionConfiguration, latestRequiredMigration } from '~/server/utils/productionReadiness'

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store")

  const production = process.env.NODE_ENV === 'production'
  const configuration = inspectProductionConfiguration()
  let database: 'connected' | 'unavailable' | 'mock' = process.env.DATABASE_URL ? 'unavailable' : 'mock'
  let migrations: 'current' | 'missing' | 'unavailable' | 'skipped' = process.env.DATABASE_URL ? 'unavailable' : 'skipped'

  if (process.env.DATABASE_URL) {
    try {
      await db.query('select 1')
      database = 'connected'
    } catch {
      database = 'unavailable'
    }
    if (database === 'connected') {
      try {
        const result = await db.query(`select exists(
          select 1 from schema_migrations where filename=$1
        ) as current`, [latestRequiredMigration])
        migrations = result.rows[0]?.current === true ? 'current' : 'missing'
      } catch {
        migrations = 'unavailable'
      }
    } else {
      migrations = 'unavailable'
    }
  }

  const ready = (!production || configuration.ready)
    && database !== 'unavailable'
    && migrations !== 'missing'
    && migrations !== 'unavailable'
  if (!ready) setResponseStatus(event, 503)

  return {
    status: ready ? "ok" : "not_ready",
    timestamp: new Date().toISOString(),
    runtime: process.env.NITRO_PRESET ?? "unknown",
    checks: {
      database,
      migrations,
      requiredMigration: latestRequiredMigration,
      services: Object.fromEntries(Object.entries(configuration.services)
        .map(([name, service]) => [name, service.configured ? 'configured' : production ? 'missing' : 'not_configured'])),
    },
  }
})
