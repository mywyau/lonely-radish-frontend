import { db } from '../../repositories/db'
import type { Database, DatabaseClient } from '../../repositories/db'
import { OutboxRepository } from '../../repositories/outbox'

interface InterestSentPayload {
  senderId: string
  recipientId: string
}

interface MatchCreatedPayload {
  userOneId: string
  userTwoId: string
  matchId: string
  kind: 'new_match' | 'match_queued'
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Outbox payload must be an object')
  }
  return value as Record<string, unknown>
}

function requiredString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  if (typeof value !== 'string' || !value) {
    throw new Error(`Outbox payload is missing ${key}`)
  }
  return value
}

function interestSentPayload(value: unknown): InterestSentPayload {
  const payload = record(value)
  return {
    senderId: requiredString(payload, 'senderId'),
    recipientId: requiredString(payload, 'recipientId'),
  }
}

function matchCreatedPayload(value: unknown): MatchCreatedPayload {
  const payload = record(value)
  const kind = requiredString(payload, 'kind')
  if (kind !== 'new_match' && kind !== 'match_queued') {
    throw new Error('Outbox match notification kind is invalid')
  }
  return {
    userOneId: requiredString(payload, 'userOneId'),
    userTwoId: requiredString(payload, 'userTwoId'),
    matchId: requiredString(payload, 'matchId'),
    kind,
  }
}

async function deliverEvent(client: DatabaseClient, event: {
  id: number
  eventType: string
  payload: unknown
}) {
  if (event.eventType === 'interest.sent') {
    const payload = interestSentPayload(event.payload)
    await client.query(`insert into notifications(
        recipient_id,actor_id,kind,source_outbox_event_id
      ) values($1,$2,'interest_received',$3)
      on conflict(source_outbox_event_id,recipient_id)
        where source_outbox_event_id is not null do nothing`,
    [payload.recipientId,payload.senderId,event.id])
    return
  }

  if (event.eventType === 'match.created') {
    const payload = matchCreatedPayload(event.payload)
    await client.query(`insert into notifications(
        recipient_id,actor_id,match_id,kind,source_outbox_event_id
      ) values($1,$2,$3,$5,$4),($2,$1,$3,$5,$4)
      on conflict(source_outbox_event_id,recipient_id)
        where source_outbox_event_id is not null do nothing`,
    [payload.userOneId,payload.userTwoId,payload.matchId,event.id,payload.kind])
    return
  }

  throw new Error(`Unsupported outbox event type: ${event.eventType}`)
}

export interface OutboxProcessorDependencies {
  database: Database
}

export class OutboxProcessor {
  constructor(private readonly dependencies: OutboxProcessorDependencies = { database: db }) {}

  async process(limit = 25) {
    const batchSize = Math.max(1, Math.min(100,Math.trunc(limit)))
    const leaseClient = await this.dependencies.database.connect()
    let events: Awaited<ReturnType<OutboxRepository['claimAvailable']>> = []
    try {
      await leaseClient.query('begin')
      const repository = new OutboxRepository(leaseClient)
      await repository.removeExpired()
      events = await repository.claimAvailable(batchSize)
      await leaseClient.query('commit')
    } catch (error) {
      await leaseClient.query('rollback')
      throw error
    } finally {
      leaseClient.release()
    }

    let succeeded = 0
    let failed = 0
    let deadLettered = 0
    for (const event of events) {
      const client = await this.dependencies.database.connect()
      try {
        await client.query('begin')
        await deliverEvent(client,event)
        await new OutboxRepository(client).markProcessed(event.id)
        await client.query('commit')
        succeeded++
      } catch (error) {
        await client.query('rollback')
        const detail = error instanceof Error ? error.message.slice(0,500) : 'Unknown outbox error'
        const dead = await new OutboxRepository(this.dependencies.database)
          .markFailed(event.id,event.attempts,detail)
        console.error(JSON.stringify({
          event: 'outbox_delivery_failed',
          outboxEventId: event.id,
          eventType: event.eventType,
          attempts: event.attempts,
          deadLettered: dead,
          error: detail,
        }))
        failed++
        if (dead) deadLettered++
      } finally {
        client.release()
      }
    }

    return { processed: events.length, succeeded, failed, deadLettered }
  }
}

export const outboxProcessor = new OutboxProcessor()
