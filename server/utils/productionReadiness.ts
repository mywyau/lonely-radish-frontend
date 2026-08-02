type Environment = Record<string, string | undefined>

export const latestRequiredMigration = '20260902_add_admin_account_deletion.sql'

const placeholderPrefixes = [
  'your-',
  'replace-with',
  'postgresql://user:password@host',
  'https://your-',
  're_your-',
  'sk_test_your-',
  'whsec_your-',
  'price_your-',
]

function usable(value: string | undefined) {
  const normalized = value?.trim()
  return Boolean(normalized) && !placeholderPrefixes.some(prefix => normalized!.startsWith(prefix))
}

type ServiceCheck = {
  configured: boolean
  missing: string[]
}

export type ProductionConfigurationReport = {
  ready: boolean
  services: Record<'database' | 'auth0' | 'redis' | 'storage' | 'stripe' | 'qstash' | 'email' | 'location' | 'accountDeletion', ServiceCheck>
}

function check(env: Environment, required: string[], alternatives: string[][] = []): ServiceCheck {
  const missing = required.filter(name => !usable(env[name]))
  for (const choices of alternatives) {
    if (!choices.some(name => usable(env[name]))) missing.push(choices.join(' or '))
  }
  return { configured: missing.length === 0, missing }
}

function invalidate(service: ServiceCheck, reason: string) {
  service.configured = false
  service.missing.push(reason)
}

function isHttpsOrigin(value: string | undefined) {
  try {
    const url = new URL(value || '')
    return url.protocol === 'https:' && url.origin === url.href.replace(/\/$/, '')
  } catch {
    return false
  }
}

export function inspectProductionConfiguration(env: Environment = process.env): ProductionConfigurationReport {
  const services = {
    database: check(env, ['DATABASE_URL']),
    auth0: check(env, ['AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'AUTH_SESSION_SECRET']),
    redis: check(env, ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']),
    storage: check(env, ['SUPABASE_URL', 'NUXT_PUBLIC_SUPABASE_URL', 'NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
      [['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']]),
    stripe: check(env, [
      'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_ID_MONTHLY', 'STRIPE_PRICE_ID_QUARTERLY', 'STRIPE_PRICE_ID_YEARLY',
      'STRIPE_BUSINESS_PRICE_ID_STANDARD', 'STRIPE_BUSINESS_PRICE_ID_FEATURED',
    ]),
    qstash: check(env, ['SITE_URL', 'QSTASH_TOKEN', 'QSTASH_CURRENT_SIGNING_KEY', 'QSTASH_NEXT_SIGNING_KEY']),
    email: check(env, ['RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_REPLY_TO', 'APP_BASE_URL']),
    location: check(env, ['OPENCAGE_API_KEY']),
    accountDeletion: check(env, [
      'AUTH0_MGMT_CLIENT_ID', 'AUTH0_MGMT_CLIENT_SECRET', 'AUTH0_MGMT_AUDIENCE', 'OFFER_CLAIM_SECRET',
    ]),
  }
  if (usable(env.DATABASE_URL) && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL!)) {
    invalidate(services.database, 'DATABASE_URL must be a PostgreSQL URL')
  }
  if (usable(env.AUTH_SESSION_SECRET) && env.AUTH_SESSION_SECRET!.trim().length < 32) {
    invalidate(services.auth0, 'AUTH_SESSION_SECRET must contain at least 32 characters')
  }
  if (usable(env.SITE_URL) && !isHttpsOrigin(env.SITE_URL)) {
    invalidate(services.qstash, 'SITE_URL must be an HTTPS origin without a path')
  }
  if (env.APP_ENV?.trim().toLowerCase() === 'staging' && !usable(env.VERCEL_AUTOMATION_BYPASS_SECRET)) {
    invalidate(services.qstash, 'VERCEL_AUTOMATION_BYPASS_SECRET is required for protected staging deliveries')
  }
  if (usable(env.APP_BASE_URL) && !isHttpsOrigin(env.APP_BASE_URL)) {
    invalidate(services.email, 'APP_BASE_URL must be an HTTPS origin without a path')
  }
  if (usable(env.OFFER_CLAIM_SECRET) && env.OFFER_CLAIM_SECRET!.trim().length < 32) {
    invalidate(services.accountDeletion, 'OFFER_CLAIM_SECRET must contain at least 32 characters')
  }
  return { ready: Object.values(services).every(service => service.configured), services }
}

export function assertProductionConfiguration(env: Environment = process.env) {
  if (env.NODE_ENV !== 'production') return
  const report = inspectProductionConfiguration(env)
  if (report.ready) return
  const details = Object.entries(report.services)
    .filter(([, service]) => !service.configured)
    .map(([name, service]) => `${name}: ${service.missing.join(', ')}`)
    .join('; ')
  throw new Error(`[startup] Production configuration is incomplete (${details})`)
}
