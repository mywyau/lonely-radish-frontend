import { Receiver } from '@upstash/qstash'
import { createError, getHeader, readRawBody } from 'h3'
import { processPendingNotificationEmails } from '~/server/utils/notificationEmail'

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw createError({ statusCode: 500, statusMessage: `Missing env var: ${name}` })
  return value
}

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event) || ''
  if (!import.meta.dev) {
    const signature = getHeader(event, 'upstash-signature')
    if (!signature) throw createError({ statusCode: 401, statusMessage: 'Missing QStash signature' })
    const siteUrl = requiredEnv('SITE_URL').replace(/\/+$/, '')
    const receiver = new Receiver({
      currentSigningKey: requiredEnv('QSTASH_CURRENT_SIGNING_KEY'),
      nextSigningKey: requiredEnv('QSTASH_NEXT_SIGNING_KEY'),
    })
    let valid = false
    try {
      valid = await receiver.verify({
        signature,
        body: rawBody,
        url: `${siteUrl}/api/email/process`,
        upstashRegion: getHeader(event, 'upstash-region') || undefined,
      })
    } catch { /* Invalid signatures receive the same response without leaking verification details. */ }
    if (!valid) throw createError({ statusCode: 401, statusMessage: 'Invalid QStash signature' })
  }
  return processPendingNotificationEmails()
})
