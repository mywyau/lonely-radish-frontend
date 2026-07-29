import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base'
import { registerOTel } from '@vercel/otel'
import {
  telemetryMetricExportInterval,
  telemetryMetricsConfigured,
  telemetryServiceName,
  telemetryTraceSampleRatio,
} from '~/server/utils/telemetryConfig'

const registrationKey = Symbol.for('lonely-radish.telemetry.registered')

export default defineNitroPlugin(() => {
  const globalState = globalThis as typeof globalThis & { [registrationKey]?: boolean }
  if (globalState[registrationKey] || process.env.NODE_ENV === 'test') return

  const metricReaders = telemetryMetricsConfigured()
    ? [new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ concurrencyLimit: 1 }),
        exportIntervalMillis: telemetryMetricExportInterval(),
        exportTimeoutMillis: 10_000,
        cardinalityLimits: { default: 500 },
      })]
    : []

  registerOTel({
    serviceName: telemetryServiceName(),
    attributes: {
      'deployment.environment.name': process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      'service.version': process.env.VERCEL_GIT_COMMIT_SHA || 'development',
    },
    traceSampler: process.env.OTEL_TRACES_SAMPLER
      ? 'auto'
      : new ParentBasedSampler({
          root: new TraceIdRatioBasedSampler(telemetryTraceSampleRatio()),
        }),
    metricReaders,
  })

  globalState[registrationKey] = true
})
