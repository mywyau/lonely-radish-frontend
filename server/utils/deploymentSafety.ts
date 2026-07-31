type Environment = Record<string, string | undefined>

export type AppEnvironment = 'development' | 'test' | 'staging' | 'production'

function value(environment: Environment, name: string) {
  return environment[name]?.trim()
}

function origin(raw: string | undefined) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}

function supabaseProjectRef(raw: string | undefined, database = false) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (!database) {
      return url.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i)?.[1]?.toLowerCase() || null
    }
    const direct = url.hostname.match(/^db\.([a-z0-9-]+)\.supabase\.co$/i)
    if (direct?.[1]) return direct[1].toLowerCase()
    return decodeURIComponent(url.username).match(/^postgres\.([a-z0-9-]+)$/i)?.[1]?.toLowerCase() || null
  } catch {
    return null
  }
}

export function resolveAppEnvironment(environment: Environment = process.env): AppEnvironment {
  const explicit = value(environment, 'APP_ENV')?.toLowerCase()
  if (explicit && ['development', 'test', 'staging', 'production'].includes(explicit)) {
    return explicit as AppEnvironment
  }
  if (value(environment, 'NODE_ENV') === 'test') return 'test'
  if (value(environment, 'VERCEL_GIT_COMMIT_REF') === 'staging') return 'staging'
  if (value(environment, 'VERCEL_ENV') === 'production' || value(environment, 'NODE_ENV') === 'production') {
    return 'production'
  }
  return 'development'
}

export function stagingEmailAllowlist(environment: Environment = process.env) {
  return new Set((value(environment, 'STAGING_EMAIL_ALLOWLIST') || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean))
}

export function inspectDeploymentSafety(environment: Environment = process.env) {
  const appEnvironment = resolveAppEnvironment(environment)
  const issues: string[] = []

  if (appEnvironment === 'staging') {
    if (value(environment, 'APP_ENV') !== 'staging') {
      issues.push('APP_ENV must be explicitly set to staging')
    }
    if (value(environment, 'VERCEL_ENV') && value(environment, 'VERCEL_ENV') !== 'preview') {
      issues.push('Staging must run in a Vercel Preview environment')
    }
    if (value(environment, 'VERCEL_GIT_COMMIT_REF') && value(environment, 'VERCEL_GIT_COMMIT_REF') !== 'staging') {
      issues.push('Staging must be deployed from the staging branch')
    }

    const siteOrigin = origin(value(environment, 'SITE_URL'))
    const appOrigin = origin(value(environment, 'APP_BASE_URL'))
    if (!siteOrigin) issues.push('SITE_URL must be a valid HTTPS URL')
    if (!appOrigin) issues.push('APP_BASE_URL must be a valid HTTPS URL')
    if (siteOrigin && appOrigin && siteOrigin !== appOrigin) {
      issues.push('SITE_URL and APP_BASE_URL must use the same origin')
    }
    if (!value(environment, 'STRIPE_SECRET_KEY')?.startsWith('sk_test_')) {
      issues.push('Staging must use a Stripe test-mode secret key')
    }
    if (stagingEmailAllowlist(environment).size === 0) {
      issues.push('STAGING_EMAIL_ALLOWLIST must contain at least one test recipient')
    }

    const serverRef = supabaseProjectRef(value(environment, 'SUPABASE_URL'))
    const publicRef = supabaseProjectRef(value(environment, 'NUXT_PUBLIC_SUPABASE_URL'))
    const databaseRef = supabaseProjectRef(value(environment, 'DATABASE_URL'), true)
    if (!serverRef || !publicRef || !databaseRef) {
      issues.push('Staging Supabase and database project references must be identifiable')
    } else if (new Set([serverRef, publicRef, databaseRef]).size !== 1) {
      issues.push('DATABASE_URL and Supabase URLs must reference the same staging project')
    }
  }

  return { ready: issues.length === 0, environment: appEnvironment, issues }
}

export function assertDeploymentSafety(environment: Environment = process.env) {
  const report = inspectDeploymentSafety(environment)
  if (!report.ready) {
    throw new Error(`Unsafe ${report.environment} deployment configuration: ${report.issues.join('; ')}`)
  }
  return report
}
