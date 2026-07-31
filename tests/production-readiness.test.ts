import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { inspectProductionConfiguration, latestRequiredMigration } from '../server/utils/productionReadiness'
import { inspectDeploymentSafety, resolveAppEnvironment } from '../server/utils/deploymentSafety'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const configuredEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://real:secret@database.example/app',
  AUTH0_DOMAIN: 'tenant.eu.auth0.com',
  AUTH0_CLIENT_ID: 'client-id',
  AUTH0_CLIENT_SECRET: 'client-secret',
  AUTH_SESSION_SECRET: 'a'.repeat(64),
  UPSTASH_REDIS_REST_URL: 'https://redis.example',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SECRET_KEY: 'storage-secret',
  NUXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  STRIPE_SECRET_KEY: 'sk_live_real',
  STRIPE_WEBHOOK_SECRET: 'whsec_real',
  STRIPE_PRICE_ID_MONTHLY: 'price_monthly',
  STRIPE_PRICE_ID_QUARTERLY: 'price_quarterly',
  STRIPE_PRICE_ID_YEARLY: 'price_yearly',
  STRIPE_BUSINESS_PRICE_ID_STANDARD: 'price_business_standard',
  STRIPE_BUSINESS_PRICE_ID_FEATURED: 'price_business_featured',
  SITE_URL: 'https://lonelyradish.app',
  QSTASH_TOKEN: 'qstash-token',
  QSTASH_CURRENT_SIGNING_KEY: 'current-key',
  QSTASH_NEXT_SIGNING_KEY: 'next-key',
  RESEND_API_KEY: 're_live_real',
  EMAIL_FROM: 'Lonely Radish <notifications@lonelyradish.app>',
  EMAIL_REPLY_TO: 'contact@lonelyradish.app',
  APP_BASE_URL: 'https://lonelyradish.app',
  OPENCAGE_API_KEY: 'opencage-key',
  AUTH0_MGMT_CLIENT_ID: 'management-client',
  AUTH0_MGMT_CLIENT_SECRET: 'management-secret',
  AUTH0_MGMT_AUDIENCE: 'https://tenant.eu.auth0.com/api/v2/',
  OFFER_CLAIM_SECRET: 'b'.repeat(64),
}

describe('production readiness', () => {
  it('requires staging to use isolated infrastructure and safe outbound services', () => {
    const staging = {
      APP_ENV: 'staging',
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      VERCEL_GIT_COMMIT_REF: 'staging',
      SITE_URL: 'https://staging.lonelyradish.app',
      APP_BASE_URL: 'https://staging.lonelyradish.app',
      STRIPE_SECRET_KEY: 'sk_test_staging',
      STAGING_EMAIL_ALLOWLIST: 'tester@example.com',
      SUPABASE_URL: 'https://stagingref.supabase.co',
      NUXT_PUBLIC_SUPABASE_URL: 'https://stagingref.supabase.co',
      DATABASE_URL: 'postgresql://postgres.stagingref:secret@aws-0-eu-west-2.pooler.supabase.com:6543/postgres',
    }
    expect(resolveAppEnvironment(staging)).toBe('staging')
    expect(inspectDeploymentSafety(staging)).toEqual({ ready: true, environment: 'staging', issues: [] })
    expect(inspectDeploymentSafety({
      ...staging,
      DATABASE_URL: 'postgresql://postgres.productionref:secret@aws-0-eu-west-2.pooler.supabase.com:6543/postgres',
    }).issues).toContain('DATABASE_URL and Supabase URLs must reference the same staging project')
  })

  it('identifies every missing production service without exposing values', () => {
    const report = inspectProductionConfiguration({ NODE_ENV: 'production' })
    expect(report.ready).toBe(false)
    expect(Object.keys(report.services)).toEqual([
      'database', 'auth0', 'redis', 'storage', 'stripe', 'qstash', 'email', 'location', 'accountDeletion',
    ])
    expect(report.services.database.missing).toContain('DATABASE_URL')
    expect(report.services.storage.missing).toContain('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY')
  })

  it('accepts a fully configured production environment and rejects placeholders', () => {
    expect(inspectProductionConfiguration(configuredEnvironment).ready).toBe(true)
    expect(inspectProductionConfiguration({ ...configuredEnvironment, STRIPE_SECRET_KEY: 'sk_test_your-secret-key' }).services.stripe.configured).toBe(false)
    expect(inspectProductionConfiguration({ ...configuredEnvironment, SITE_URL: 'http://localhost:3000' }).services.qstash.configured).toBe(false)
    expect(inspectProductionConfiguration({ ...configuredEnvironment, AUTH_SESSION_SECRET: 'too-short' }).services.auth0.configured).toBe(false)
  })

  it('fails database, Redis and Stripe closed in production', () => {
    expect(read('server/repositories/db.ts')).toContain('DATABASE_URL is required in production')
    expect(read('server/repositories/redis.ts')).toContain('Upstash Redis credentials are required in production')
    expect(read('server/services/billing/stripeClient.ts')).toContain('STRIPE_SECRET_KEY is required in production')
    expect(read('server/plugins/validate-production-config.ts')).toContain('assertProductionConfiguration()')
  })

  it('checks database connectivity and the latest migration in health responses', () => {
    const health = read('server/api/health.get.ts')
    expect(health).toContain("await db.query('select 1')")
    expect(health).toContain('from schema_migrations where filename=$1')
    expect(health).toContain('setResponseStatus(event, 503)')
    expect(read(`docs/migrations/${latestRequiredMigration}`)).toBeTruthy()
    const migrations = readdirSync(resolve(process.cwd(), 'docs/migrations')).filter(file => file.endsWith('.sql')).sort()
    expect(latestRequiredMigration).toBe(migrations.at(-1))
  })
})
