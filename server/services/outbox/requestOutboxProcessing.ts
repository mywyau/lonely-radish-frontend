import { createHash } from 'node:crypto'
import { Client } from '@upstash/qstash'

export function outboxProcessorUrl() {
  const siteUrl = process.env.SITE_URL?.trim().replace(/\/+$/,'')
  if (!siteUrl) return null
  const url = new URL(`${siteUrl}/api/outbox/process`)
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  if (bypass) url.searchParams.set('x-vercel-protection-bypass',bypass)
  return url.toString()
}

export async function requestOutboxProcessing(deduplicationSource: string) {
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.NODE_ENV === 'test') return false
    const { outboxProcessor } = await import('./OutboxProcessor')
    await outboxProcessor.process()
    return true
  }
  const token = process.env.QSTASH_TOKEN?.trim()
  const processorUrl = outboxProcessorUrl()
  if (!token || !processorUrl) {
    console.error(JSON.stringify({
      event: 'outbox_enqueue_failed',
      error: 'QStash configuration is missing',
    }))
    return false
  }

  const deduplicationId = `outbox-${createHash('sha256')
    .update(deduplicationSource)
    .digest('hex')
    .slice(0,48)}`
  try {
    await new Client({ token }).publishJSON({
      url: processorUrl,
      body: { source: 'domain-event' },
      retries: 3,
      deduplicationId,
      flowControl: {
        key: 'transactional-outbox',
        parallelism: 5,
        rate: 120,
        period: '1m',
      },
    })
    return true
  } catch (error) {
    console.error(JSON.stringify({
      event: 'outbox_enqueue_failed',
      error: error instanceof Error ? error.message.slice(0,500) : 'Unknown QStash error',
    }))
    return false
  }
}
