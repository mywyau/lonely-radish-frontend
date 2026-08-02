import { Receiver } from '@upstash/qstash'
import { createError, getHeader, readRawBody } from 'h3'
import { outboxProcessor } from '~/server/services/outbox/OutboxProcessor'
import { outboxProcessorUrl, requestOutboxProcessing } from '~/server/services/outbox/requestOutboxProcessing'

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw createError({ statusCode: 500, statusMessage: `Missing env var: ${name}` })
  return value
}

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event) || ''
  if (!import.meta.dev) {
    const signature = getHeader(event,'upstash-signature')
    if (!signature) throw createError({ statusCode: 401, statusMessage: 'Missing QStash signature' })
    requiredEnv('SITE_URL')
    const processorUrl = outboxProcessorUrl()
    if (!processorUrl) throw createError({ statusCode: 500, statusMessage: 'Missing outbox processor URL' })
    const receiver = new Receiver({
      currentSigningKey: requiredEnv('QSTASH_CURRENT_SIGNING_KEY'),
      nextSigningKey: requiredEnv('QSTASH_NEXT_SIGNING_KEY'),
    })
    const valid = await receiver.verify({
      signature,
      body: rawBody,
      url: processorUrl,
      upstashRegion: getHeader(event,'upstash-region') || undefined,
    }).catch(() => false)
    if (!valid) throw createError({ statusCode: 401, statusMessage: 'Invalid QStash signature' })
  }
  const result = await outboxProcessor.process()
  if (result.processed === 25) {
    await requestOutboxProcessing(`outbox-drain:${Date.now()}`)
  }
  return result
})
