type Environment = Record<string, string | undefined>

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTEGER_SEGMENT = /^\d+$/
const DYNAMIC_ROUTE_PARENTS = new Set([
  'activities',
  'blocks',
  'dates',
  'interests',
  'matches',
  'notifications',
  'offers',
  'plans',
  'profiles',
  'proposals',
  'reports',
])

export function telemetryServiceName(env: Environment = process.env) {
  return env.OTEL_SERVICE_NAME?.trim() || 'lonely-radish'
}

export function telemetryMetricsConfigured(env: Environment = process.env) {
  return Boolean(
    env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?.trim()
    || env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim(),
  )
}

export function telemetryMetricExportInterval(env: Environment = process.env) {
  const requested = Number(env.OTEL_METRIC_EXPORT_INTERVAL)
  if (!Number.isFinite(requested)) return 30_000
  return Math.max(5_000, Math.min(300_000, Math.trunc(requested)))
}

export function telemetryTraceSampleRatio(env: Environment = process.env) {
  const requested = Number(env.OTEL_TRACES_SAMPLER_ARG)
  if (Number.isFinite(requested) && requested >= 0 && requested <= 1) return requested
  return env.NODE_ENV === 'production' ? 0.1 : 1
}

export function normalizeTelemetryRoute(pathname: string) {
  const path = pathname.split('?')[0] || '/'
  const segments = path.split('/').filter(Boolean)
  const normalized = segments.map((segment, index) => {
    if (UUID_SEGMENT.test(segment) || INTEGER_SEGMENT.test(segment)) return ':id'
    if (index > 0 && DYNAMIC_ROUTE_PARENTS.has(segments[index - 1]!)) return ':id'
    return segment
  })
  return normalized.length ? `/${normalized.join('/')}` : '/'
}

export function summarizePostgresStatement(statement: string) {
  const normalized = statement.replace(/\s+/g, ' ').trim()
  const operation = normalized.match(/^(select|insert|update|delete|merge)\b/i)?.[1]?.toUpperCase()
    || (normalized.match(/^with\b/i) ? 'WITH' : 'OTHER')
  const relationPatterns: Record<string, RegExp> = {
    SELECT: /\bfrom\s+([a-z_][a-z0-9_.]*)/i,
    INSERT: /\binto\s+([a-z_][a-z0-9_.]*)/i,
    UPDATE: /^update\s+([a-z_][a-z0-9_.]*)/i,
    DELETE: /\bfrom\s+([a-z_][a-z0-9_.]*)/i,
    MERGE: /\binto\s+([a-z_][a-z0-9_.]*)/i,
    WITH: /\b(?:from|into|update)\s+([a-z_][a-z0-9_.]*)/i,
  }
  const relation = relationPatterns[operation]?.exec(normalized)?.[1]?.toLowerCase() || 'unknown'
  return { operation, relation }
}
