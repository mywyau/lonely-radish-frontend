import { createError } from 'h3'
import { db } from '~/server/repositories/db'
import type { Database, DatabaseClient } from '~/server/repositories/db'
import { IdempotencyRepository } from '~/server/repositories/idempotency'
import { MatchRepository } from '~/server/repositories/matches'
import { OutboxRepository } from '~/server/repositories/outbox'
import { activateMatchOrQueue } from '~/server/utils/matchQueue'
import { requestOutboxProcessing } from '../outbox/requestOutboxProcessing'

export interface AcceptInterestInput {
  recipientId: string
  interestId: string
  idempotencyKey: string
}

export interface AcceptInterestResult {
  matched: true
  queued: boolean
  matchId: string
  slug: string
  name: string
}

export interface MatchServiceDependencies {
  database: Database
  matches: (client: DatabaseClient) => MatchRepository
  idempotency: (client: DatabaseClient) => IdempotencyRepository
  outbox: (client: DatabaseClient) => OutboxRepository
  activateMatch: typeof activateMatchOrQueue
  requestOutboxProcessing: typeof requestOutboxProcessing
}

const defaults: MatchServiceDependencies = {
  database: db,
  matches: client => new MatchRepository(client),
  idempotency: client => new IdempotencyRepository(client),
  outbox: client => new OutboxRepository(client),
  activateMatch: activateMatchOrQueue,
  requestOutboxProcessing,
}

function conflict(statusMessage: string) {
  return createError({ statusCode: 409, statusMessage })
}

export class MatchService {
  constructor(private readonly dependencies: MatchServiceDependencies = defaults) {}

  async acceptInterest(input: AcceptInterestInput): Promise<AcceptInterestResult> {
    const {
      database,
      matches,
      idempotency,
      outbox,
      activateMatch,
      requestOutboxProcessing: requestProcessing,
    } = this.dependencies
    const client = await database.connect()
    const repository = matches(client)
    const requests = idempotency(client)
    const events = outbox(client)

    try {
      await client.query('begin')
      await repository.lockRecipientMomentum(input.recipientId)
      await requests.removeExpired(input.recipientId)
      const request = await requests.claim<AcceptInterestResult>(
        input.recipientId,
        'interest.accept',
        input.idempotencyKey,
        input.interestId,
      )
      if (!request.claimed) {
        if (request.requestFingerprint !== input.interestId) {
          throw conflict('This Idempotency-Key was already used for another interest')
        }
        if (!request.response) throw conflict('This match request is still being processed')
        await client.query('commit')
        return request.response
      }

      if (await repository.hasPendingManualMatch(input.recipientId)) {
        throw conflict('Take action on your current new match before accepting another interest')
      }

      const incoming = await repository.findIncomingInterestForUpdate(
        input.interestId,
        input.recipientId,
      )
      if (!incoming) {
        throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
      }

      await repository.lockPair(input.recipientId, incoming.senderId)
      if (await repository.isBlocked(input.recipientId, incoming.senderId)) {
        throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
      }

      const existing = await repository.findPairMatch(input.recipientId, incoming.senderId)
      if (existing?.status === 'active') throw conflict('You are already matched')
      if (existing?.status === 'queued') throw conflict('This match is already queued')

      const match = await repository.createOrResetQueuedMatch(
        input.recipientId,
        incoming.senderId,
        input.recipientId,
        existing?.id,
      )
      if (!match) throw new Error('Match could not be created')
      if (existing?.status === 'unmatched') {
        await repository.clearDateProposals(match.id)
      }

      const activated = await activateMatch(client, match.id)
      await events.publish({
        eventType: 'match.created',
        aggregateType: 'match',
        aggregateId: match.id,
        deduplicationKey: `match.created:${match.id}:accept:${input.interestId}`,
        payload: {
          userOneId: input.recipientId,
          userTwoId: incoming.senderId,
          matchId: match.id,
          kind: activated ? 'new_match' : 'match_queued',
        },
      })

      const response: AcceptInterestResult = {
        matched: true,
        queued: !activated,
        matchId: match.id,
        slug: incoming.slug,
        name: incoming.displayName,
      }
      await requests.complete(
        input.recipientId,
        'interest.accept',
        input.idempotencyKey,
        response,
      )
      await client.query('commit')
      await requestProcessing(`interest.accept:${input.recipientId}:${input.idempotencyKey}`)
      return response
    } catch (error) {
      await client.query('rollback')
      if ((error as { code?: string }).code === '23514') {
        throw conflict('One of you has reached their active match limit')
      }
      throw error
    } finally {
      client.release()
    }
  }
}

export const matchService = new MatchService()
