import { db } from '~/server/repositories/db'
import { inspectDeploymentSafety } from '~/server/utils/deploymentSafety'
import { inspectProductionConfiguration, latestRequiredMigration } from '~/server/utils/productionReadiness'

export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store")

  const production = process.env.NODE_ENV === 'production'
  const configuration = inspectProductionConfiguration()
  const deploymentSafety = inspectDeploymentSafety()
  let database: 'connected' | 'unavailable' | 'mock' = process.env.DATABASE_URL ? 'unavailable' : 'mock'
  let migrations: 'current' | 'missing' | 'unavailable' | 'skipped' = process.env.DATABASE_URL ? 'unavailable' : 'skipped'
  let outbox: 'healthy' | 'delayed' | 'dead_lettered' | 'unavailable' | 'skipped' =
    process.env.DATABASE_URL ? 'unavailable' : 'skipped'

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
      if (migrations === 'current') {
        try {
          const result = await db.query<{ dead: boolean; delayed: boolean }>(`select
            exists(select 1 from outbox_events where status='dead') as dead,
            exists(select 1 from outbox_events where status in ('pending','failed')
              and available_at<now()-interval '10 minutes') as delayed`)
          outbox = result.rows[0]?.dead ? 'dead_lettered'
            : result.rows[0]?.delayed ? 'delayed' : 'healthy'
        } catch {
          outbox = 'unavailable'
        }
      }
    } else {
      migrations = 'unavailable'
    }
  }

  const ready = deploymentSafety.ready
    && (!production || configuration.ready)
    && database !== 'unavailable'
    && migrations !== 'missing'
    && migrations !== 'unavailable'
  if (!ready) setResponseStatus(event, 503)

  return {
    status: ready ? "ok" : "not_ready",
    environment: deploymentSafety.environment,
    timestamp: new Date().toISOString(),
    runtime: process.env.NITRO_PRESET ?? "unknown",
    checks: {
      database,
      migrations,
      outbox,
      requiredMigration: latestRequiredMigration,
      deploymentSafety: deploymentSafety.ready ? 'safe' : 'unsafe',
      deploymentSafetyIssues: deploymentSafety.issues,
      services: Object.fromEntries(Object.entries(configuration.services)
        .map(([name, service]) => [name, service.configured ? 'configured' : production ? 'missing' : 'not_configured'])),
    },
  }
})
