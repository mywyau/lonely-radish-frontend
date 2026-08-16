const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const SIGNED_SERVICE_ENDPOINTS = new Set([
  '/api/account/v2/worker-delete',
  '/api/email/process',
  '/api/outbox/process',
  '/api/reminders/process',
  '/api/stripe/v2/process-event-v2',
  '/api/stripe/v2/webhook',
])

type RequestOriginCheck = {
  method: string
  pathname: string
  origin?: string
  fetchSite?: string
  allowedOrigins: Set<string>
}

export function requestOriginAllowed(check: RequestOriginCheck) {
  const pathname = check.pathname.replace(/\/+$/, '') || '/'
  if (SAFE_METHODS.has(check.method.toUpperCase())
    || !pathname.startsWith('/api/')
    || SIGNED_SERVICE_ENDPOINTS.has(pathname)) return true
  if (check.fetchSite?.toLowerCase() === 'cross-site') return false
  if (!check.origin) return true
  try {
    return check.allowedOrigins.has(new URL(check.origin).origin)
  } catch {
    return false
  }
}

export function configuredRequestOrigins(environment: NodeJS.ProcessEnv = process.env) {
  const origins = new Set<string>()
  for (const value of [environment.SITE_URL, environment.APP_BASE_URL]) {
    try {
      if (value) origins.add(new URL(value).origin)
    } catch { /* Invalid deployment URLs are rejected by production readiness checks. */ }
  }
  return origins
}
