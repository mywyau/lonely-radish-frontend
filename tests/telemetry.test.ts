import { describe, expect, it } from 'vitest'
import {
  normalizeTelemetryRoute,
  summarizePostgresStatement,
  telemetryMetricExportInterval,
  telemetryMetricsConfigured,
  telemetryServiceName,
  telemetryTraceSampleRatio,
} from '../server/utils/telemetryConfig'

describe('telemetry configuration', () => {
  it('uses safe defaults and recognizes standard OTLP endpoints', () => {
    expect(telemetryServiceName({})).toBe('lonely-radish')
    expect(telemetryMetricsConfigured({})).toBe(false)
    expect(telemetryMetricsConfigured({ OTEL_EXPORTER_OTLP_ENDPOINT: 'https://collector.example' })).toBe(true)
    expect(telemetryMetricsConfigured({ OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://collector.example/v1/metrics' })).toBe(true)
    expect(telemetryMetricExportInterval({ OTEL_METRIC_EXPORT_INTERVAL: '1000' })).toBe(5000)
    expect(telemetryTraceSampleRatio({ NODE_ENV: 'production' })).toBe(0.1)
    expect(telemetryTraceSampleRatio({ OTEL_TRACES_SAMPLER_ARG: '0.25' })).toBe(0.25)
  })

  it('removes high-cardinality identifiers from fallback route names', () => {
    expect(normalizeTelemetryRoute('/api/profiles/alex-in-london?preview=true')).toBe('/api/profiles/:id')
    expect(normalizeTelemetryRoute('/api/matches/90d1f5b8-2e55-4ff0-860d-c86fa7dc6558/activate'))
      .toBe('/api/matches/:id/activate')
    expect(normalizeTelemetryRoute('/api/health')).toBe('/api/health')
  })

  it('summarizes SQL without retaining query text or values', () => {
    expect(summarizePostgresStatement('select id from profiles where user_id=$1'))
      .toEqual({ operation: 'SELECT', relation: 'profiles' })
    expect(summarizePostgresStatement('insert into outbox_events(event_type) values($1)'))
      .toEqual({ operation: 'INSERT', relation: 'outbox_events' })
    expect(summarizePostgresStatement('update matches set status=$1 where id=$2'))
      .toEqual({ operation: 'UPDATE', relation: 'matches' })
  })
})
