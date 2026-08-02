import { createError } from 'h3'
import { db } from '~/server/repositories/db'
import type { Database, DatabaseClient } from '~/server/repositories/db'
import { IdempotencyRepository } from '~/server/repositories/idempotency'
import { InterestRepository } from '~/server/repositories/interests'
import { OutboxRepository } from '~/server/repositories/outbox'
import { activateMatchOrQueue } from '~/server/utils/matchQueue'
import { requestOutboxProcessing } from '../outbox/requestOutboxProcessing'

export interface SendInterestInput {
  senderId: string
  profileSlug: string
  idempotencyKey: string
}

export interface SendInterestResult {
  interest: {
    profileSlug: string
    profileName: string
    date: string
  }
  matched: boolean
  queued: boolean
}

export interface InterestServiceDependencies {
  database: Database
  interests: (client: DatabaseClient) => InterestRepository
  idempotency: (client: DatabaseClient) => IdempotencyRepository
  outbox: (client: DatabaseClient) => OutboxRepository
  activateMatch: typeof activateMatchOrQueue
  requestOutboxProcessing: typeof requestOutboxProcessing
}

const defaults: InterestServiceDependencies = {
  database: db,
  interests: client => new InterestRepository(client),
  idempotency: client => new IdempotencyRepository(client),
  outbox: client => new OutboxRepository(client),
  activateMatch: activateMatchOrQueue,
  requestOutboxProcessing,
}

function conflict(statusMessage: string) {
  return createError({ statusCode: 409, statusMessage })
}

export class InterestService {
  constructor(private readonly dependencies: InterestServiceDependencies = defaults) {}

  async sendInterest(input: SendInterestInput): Promise<SendInterestResult> {
    const {
      database,
      interests,
      idempotency,
      outbox,
      activateMatch,
      requestOutboxProcessing: requestProcessing,
    } = this.dependencies
    const client = await database.connect()
    const repository = interests(client)
    const requests = idempotency(client)
    const events = outbox(client)

    try {
      await client.query('begin')
      await repository.lockSender(input.senderId)
      await requests.removeExpired(input.senderId)
      const request = await requests.claim<SendInterestResult>(
        input.senderId,
        'interest.send',
        input.idempotencyKey,
        input.profileSlug,
      )
      if (!request.claimed) {
        if (request.requestFingerprint !== input.profileSlug) {
          throw conflict('This Idempotency-Key was already used for another profile')
        }
        if (!request.response) throw conflict('This interest request is still being processed')
        await client.query('commit')
        return request.response
      }

      const sender = await repository.getSenderForUpdate(input.senderId)
      if (sender?.accountStatus === 'paused' &&
        (!sender.pausedUntil || new Date(sender.pausedUntil) > new Date())) {
        throw conflict('Resume your profile before sending new interest')
      }
      if (sender?.discoveryRestrictedUntil &&
        new Date(sender.discoveryRestrictedUntil) > new Date()) {
        throw conflict('New discovery is temporarily paused on this account')
      }

      const discoveredTarget = await repository.findEligibleTarget(input.profileSlug, input.senderId)
      if (!discoveredTarget) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
      await repository.lockPair(input.senderId, discoveredTarget.userId)
      const target = await repository.findEligibleTarget(input.profileSlug, input.senderId)
      if (!target || target.userId !== discoveredTarget.userId) {
        throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
      }

      const currentMatch = await repository.findCurrentMatch(input.senderId, target.userId)
      if (currentMatch) {
        throw conflict(currentMatch.status === 'queued'
          ? 'Your match with this person is already queued'
          : 'You have already matched with this person')
      }

      const endedMatch = await repository.findEndedMatch(input.senderId, target.userId)
      if (endedMatch && !endedMatch.secondChanceAvailable) {
        throw conflict(endedMatch.endedBy === input.senderId
          ? 'Send a private note before asking for a second chance'
          : 'Send a private message before re-offering interest')
      }

      const existingInterest = await repository.findInterest(input.senderId, target.userId)
      if (existingInterest && (!endedMatch ||
        new Date(existingInterest.createdAt) > new Date(endedMatch.endedAt))) {
        throw conflict('You have already sent interest to this person')
      }
      if (endedMatch) {
        await repository.deletePairInterestsThrough(
          input.senderId,
          target.userId,
          endedMatch.endedAt,
        )
      }

      if (await repository.countSentToday(input.senderId) >= 5) {
        throw conflict('You have reached today’s limit of 5 interests')
      }

      const reciprocal = await repository.hasReverseInterest(input.senderId, target.userId)
      if (!reciprocal) {
        if (!await repository.recipientInboxAcceptingInterests(target.userId)) {
          throw conflict('This person is not accepting new interests right now')
        }
      }

      const createdInterest = await repository.createInterest(input.senderId, target.userId, reciprocal)
      if (!createdInterest) throw new Error('Interest could not be created')
      if (!reciprocal) {
        await events.publish({
          eventType: 'interest.sent',
          aggregateType: 'interest',
          aggregateId: createdInterest.id,
          deduplicationKey: `interest.sent:${createdInterest.id}`,
          payload: {
            senderId: input.senderId,
            recipientId: target.userId,
          },
        })
      }

      let matched = false
      let queued = false
      if (reciprocal) {
        const match = await repository.upsertQueuedMatch(input.senderId, target.userId)
        if (!match) throw new Error('Match could not be created')
        await repository.resolvePairInterestsAccepted(input.senderId, target.userId)
        if (endedMatch) await repository.clearDateProposals(match.id)
        const activated = await activateMatch(client, match.id)
        queued = !activated
        await events.publish({
          eventType: 'match.created',
          aggregateType: 'match',
          aggregateId: match.id,
          deduplicationKey: `match.created:${match.id}:interest:${createdInterest.id}`,
          payload: {
            userOneId: input.senderId,
            userTwoId: target.userId,
            matchId: match.id,
            kind: activated ? 'new_match' : 'match_queued',
          },
        })
        matched = true
      }

      const response: SendInterestResult = {
        interest: {
          profileSlug: input.profileSlug,
          profileName: target.displayName,
          date: createdInterest.date,
        },
        matched,
        queued,
      }
      await requests.complete(
        input.senderId,
        'interest.send',
        input.idempotencyKey,
        response,
      )
      await client.query('commit')
      await requestProcessing(`interest.send:${input.senderId}:${input.idempotencyKey}`)
      return response
    } catch (error) {
      await client.query('rollback')
      const databaseError = error as { code?: string; constraint?: string }
      if (databaseError.code === '23514') {
        if (databaseError.constraint === 'interest_inbox_capacity') {
          throw conflict('This person is not accepting new interests right now')
        }
        throw conflict('One of you has reached their active match limit')
      }
      if (databaseError.code === '23505') {
        throw conflict(databaseError.constraint === 'daily_interests_sender_recipient_unique'
          ? 'You have already sent interest to this person'
          : 'You have reached today’s limit of 5 interests')
      }
      throw error
    } finally {
      client.release()
    }
  }
}

export const interestService = new InterestService()
