import { AsyncLocalStorage } from 'node:async_hooks'
import {
  context,
  metrics,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
  type Context,
  type TextMapGetter,
} from '@opentelemetry/api'
import { summarizePostgresStatement } from './telemetryConfig'

const instrumentationName = 'lonely-radish.server'
const tracer = trace.getTracer(instrumentationName)
const meter = metrics.getMeter(instrumentationName)
const requestContexts = new AsyncLocalStorage<Context>()

const requestCount = meter.createCounter('lonely_radish.http.server.request.count', {
  description: 'Number of server requests completed',
})
const requestDuration = meter.createHistogram('lonely_radish.http.server.request.duration', {
  description: 'Server request duration',
  unit: 's',
})
const activeRequests = meter.createUpDownCounter('lonely_radish.http.server.active_requests', {
  description: 'Number of requests currently being handled',
})
const databaseDuration = meter.createHistogram('lonely_radish.db.client.operation.duration', {
  description: 'PostgreSQL operation duration',
  unit: 's',
})
const databasePoolWait = meter.createHistogram('lonely_radish.db.client.connection.wait.duration', {
  description: 'Time spent waiting for a PostgreSQL pool connection',
  unit: 's',
})
const accountAccessCacheOperations = meter.createCounter('lonely_radish.auth.account_access.cache.operation.count', {
  description: 'Account access cache operations by outcome',
})

const headersGetter: TextMapGetter<Record<string, string>> = {
  keys: carrier => Object.keys(carrier),
  get: (carrier, key) => carrier[key],
}

function elapsedSeconds(startedAt: number) {
  return (performance.now() - startedAt) / 1000
}

export function startServerRequest(method: string, headers: Record<string, string>) {
  const upperMethod = method.toUpperCase()
  const parentContext = propagation.extract(context.active(), headers, headersGetter)
  const span = tracer.startSpan(`HTTP ${upperMethod}`, {
    kind: SpanKind.SERVER,
    attributes: { 'http.request.method': upperMethod },
  }, parentContext)
  requestContexts.enterWith(trace.setSpan(parentContext, span))
  activeRequests.add(1, { 'http.request.method': upperMethod })

  return {
    finish(route: string, statusCode: number, durationMs: number) {
      const attributes: Attributes = {
        'http.request.method': upperMethod,
        'http.route': route,
        'http.response.status_code': statusCode,
      }
      const durationSeconds = durationMs / 1000
      requestCount.add(1, attributes)
      requestDuration.record(durationSeconds, attributes)
      activeRequests.add(-1, { 'http.request.method': upperMethod })
      span.updateName(`${upperMethod} ${route}`)
      span.setAttributes(attributes)
      if (statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR })
      span.end()
    },
  }
}

export async function tracePostgresQuery<T>(statement: string, query: () => Promise<T>) {
  const { operation, relation } = summarizePostgresStatement(statement)
  const attributes: Attributes = {
    'db.system.name': 'postgresql',
    'db.operation.name': operation,
    'db.collection.name': relation,
  }
  const startedAt = performance.now()
  const parentContext = requestContexts.getStore() || context.active()

  return context.with(parentContext, () => tracer.startActiveSpan(
    `postgresql.${operation.toLowerCase()} ${relation}`,
    { kind: SpanKind.CLIENT, attributes },
    parentContext,
    async span => {
      try {
        const result = await query()
        databaseDuration.record(elapsedSeconds(startedAt), { ...attributes, outcome: 'success' })
        return result
      } catch (error) {
        databaseDuration.record(elapsedSeconds(startedAt), { ...attributes, outcome: 'error' })
        span.setStatus({ code: SpanStatusCode.ERROR })
        if (error instanceof Error) span.recordException(error)
        throw error
      } finally {
        span.end()
      }
    },
  ))
}

export async function tracePostgresPoolWait<T>(connect: () => Promise<T>) {
  const startedAt = performance.now()
  try {
    const result = await connect()
    databasePoolWait.record(elapsedSeconds(startedAt), { 'db.system.name': 'postgresql', outcome: 'success' })
    return result
  } catch (error) {
    databasePoolWait.record(elapsedSeconds(startedAt), { 'db.system.name': 'postgresql', outcome: 'error' })
    throw error
  }
}

export function recordAccountAccessCache(outcome: 'hit' | 'miss' | 'read_error' | 'write' | 'write_error' | 'invalidate' | 'invalidate_error') {
  accountAccessCacheOperations.add(1, { outcome })
}
