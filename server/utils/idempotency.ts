import { createError, getHeader } from 'h3'
import type { H3Event } from 'h3'

const keyPattern = /^[A-Za-z0-9_-]{16,100}$/

export function requestIdempotencyKey(event: H3Event) {
  const supplied = getHeader(event, 'idempotency-key')?.trim()
  if (!supplied) return crypto.randomUUID()
  if (!keyPattern.test(supplied)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Idempotency-Key must contain 16 to 100 letters, numbers, underscores or hyphens',
    })
  }
  return supplied
}
