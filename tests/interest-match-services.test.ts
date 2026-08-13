import { describe, expect, it, vi } from 'vitest'
import type { Database, DatabaseClient } from '../server/repositories/db'
import type { IdempotencyRepository } from '../server/repositories/idempotency'
import type { InterestRepository } from '../server/repositories/interests'
import type { MatchRepository } from '../server/repositories/matches'
import type { OutboxRepository } from '../server/repositories/outbox'
import { InterestService } from '../server/services/interests/InterestService'
import { MatchService } from '../server/services/matches/MatchService'

vi.mock('~/server/repositories/db', () => ({ db: {} }))
vi.mock('~/server/repositories/idempotency', () => ({ IdempotencyRepository: class {} }))
vi.mock('~/server/repositories/interests', () => ({ InterestRepository: class {} }))
vi.mock('~/server/repositories/matches', () => ({ MatchRepository: class {} }))
vi.mock('~/server/repositories/outbox', () => ({ OutboxRepository: class {} }))
vi.mock('~/server/utils/matchQueue', () => ({ activateMatchOrQueue: vi.fn() }))
vi.mock('~/server/utils/interestLifecycle', () => ({
  expirePendingInterests: vi.fn((database: Database) => database.query('expire pending interests')),
}))
vi.mock('../server/services/outbox/requestOutboxProcessing', () => ({
  requestOutboxProcessing: vi.fn(),
}))

function databaseClient() {
  const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
  const release = vi.fn()
  const client = { query, release } as unknown as DatabaseClient
  const database = {
    query,
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Database
  return { client, database, query, release }
}

describe('interest and match services', () => {
  it('replays a completed interest request without writing it again', async () => {
    const { client, database, query } = databaseClient()
    const response = {
      interest: { profileSlug: 'alex', profileName: 'Alex', date: '2026-08-30' },
      matched: false,
      queued: false,
    }
    const repository = {
      lockSender: vi.fn(),
      getSenderForUpdate: vi.fn(),
    } as unknown as InterestRepository
    const requests = {
      removeExpired: vi.fn(),
      claim: vi.fn().mockResolvedValue({
        claimed: false,
        requestFingerprint: 'alex',
        response,
      }),
      complete: vi.fn(),
    } as unknown as IdempotencyRepository
    const events = { publish: vi.fn() } as unknown as OutboxRepository
    const service = new InterestService({
      database,
      interests: () => repository,
      idempotency: () => requests,
      outbox: () => events,
      activateMatch: vi.fn(),
      requestOutboxProcessing: vi.fn(),
    })

    await expect(service.sendInterest({
      senderId: 'user-a',
      profileSlug: 'alex',
      idempotencyKey: 'request-key-0001',
    })).resolves.toEqual(response)

    expect(repository.lockSender).toHaveBeenCalledWith('user-a')
    expect(repository.getSenderForUpdate).not.toHaveBeenCalled()
    expect(requests.complete).not.toHaveBeenCalled()
    expect(query.mock.calls.map(([sql]) => sql).slice(-2)).toEqual(['begin', 'commit'])
    expect(client.release).toHaveBeenCalledOnce()
  })

  it('creates one mutual match after acquiring the sender lock', async () => {
    const { database, query } = databaseClient()
    const lockSender = vi.fn()
    const createInterest = vi.fn().mockResolvedValue({
      id: 'interest-1',
      date: '2026-08-30',
    })
    const repository = {
      lockSender,
      getSenderForUpdate: vi.fn().mockResolvedValue({
        accountStatus: 'active',
        pausedUntil: null,
        discoveryRestrictedUntil: null,
      }),
      findEligibleTarget: vi.fn().mockResolvedValue({
        userId: 'user-b',
        displayName: 'Alex',
      }),
      lockPair: vi.fn(),
      findCurrentMatch: vi.fn().mockResolvedValue(null),
      findEndedMatch: vi.fn().mockResolvedValue(null),
      findInterest: vi.fn().mockResolvedValue(null),
      countSentToday: vi.fn().mockResolvedValue(0),
      recipientInboxAcceptingInterests: vi.fn().mockResolvedValue(true),
      createInterest,
      hasReverseInterest: vi.fn().mockResolvedValue(true),
      upsertQueuedMatch: vi.fn().mockResolvedValue({ id: 'match-1' }),
      resolvePairInterestsAccepted: vi.fn(),
      clearDateProposals: vi.fn(),
    } as unknown as InterestRepository
    const requests = {
      removeExpired: vi.fn(),
      claim: vi.fn().mockResolvedValue({ claimed: true }),
      complete: vi.fn(),
    } as unknown as IdempotencyRepository
    const publish = vi.fn().mockResolvedValue({ id: 1 })
    const events = { publish } as unknown as OutboxRepository
    const activateMatch = vi.fn().mockResolvedValue(true)
    const requestOutboxProcessing = vi.fn()
    const service = new InterestService({
      database,
      interests: () => repository,
      idempotency: () => requests,
      outbox: () => events,
      activateMatch,
      requestOutboxProcessing,
    })

    await expect(service.sendInterest({
      senderId: 'user-a',
      profileSlug: 'alex',
      idempotencyKey: 'request-key-0002',
    })).resolves.toMatchObject({ matched: true, queued: false })

    expect(lockSender.mock.invocationCallOrder[0])
      .toBeLessThan(createInterest.mock.invocationCallOrder[0])
    expect(repository.upsertQueuedMatch).toHaveBeenCalledOnce()
    expect(repository.lockPair).toHaveBeenCalledWith('user-a', 'user-b')
    expect(repository.findEligibleTarget).toHaveBeenCalledTimes(2)
    expect(activateMatch).toHaveBeenCalledWith(expect.anything(), 'match-1')
    expect(repository.createInterest).toHaveBeenCalledWith('user-a', 'user-b', true)
    expect(repository.resolvePairInterestsAccepted).toHaveBeenCalledWith('user-a', 'user-b')
    expect(publish).toHaveBeenCalledTimes(1)
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'match.created',
      aggregateId: 'match-1',
      payload: expect.objectContaining({ kind: 'new_match' }),
    }))
    expect(requests.complete).toHaveBeenCalledOnce()
    expect(query.mock.calls.at(-1)?.[0]).toBe('commit')
    expect(requestOutboxProcessing).toHaveBeenCalledWith(
      'interest.send:user-a:request-key-0002',
    )
  })

  it('keeps an ended connection closed for the person who did not end it', async () => {
    const { database, query } = databaseClient()
    const repository = {
      lockSender: vi.fn(),
      getSenderForUpdate: vi.fn().mockResolvedValue({
        accountStatus: 'active', pausedUntil: null, discoveryRestrictedUntil: null,
      }),
      findEligibleTarget: vi.fn().mockResolvedValue({ userId: 'user-b', displayName: 'Alex' }),
      lockPair: vi.fn(),
      findCurrentMatch: vi.fn().mockResolvedValue(null),
      findEndedMatch: vi.fn().mockResolvedValue({
        id: 'match-1', endedBy: 'user-b', endedAt: '2026-08-01T12:00:00.000Z',
        secondChanceAvailable: false,
      }),
      findInterest: vi.fn(),
      createInterest: vi.fn(),
    } as unknown as InterestRepository
    const service = new InterestService({
      database,
      interests: () => repository,
      idempotency: () => ({
        removeExpired: vi.fn(), claim: vi.fn().mockResolvedValue({ claimed: true }), complete: vi.fn(),
      }) as unknown as IdempotencyRepository,
      outbox: () => ({ publish: vi.fn() }) as unknown as OutboxRepository,
      activateMatch: vi.fn(),
      requestOutboxProcessing: vi.fn(),
    })

    await expect(service.sendInterest({
      senderId: 'user-a', profileSlug: 'alex', idempotencyKey: 'request-key-ended-1',
    })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'This connection was ended by the other person, so it cannot be reopened from your side',
    })
    expect(repository.findInterest).not.toHaveBeenCalled()
    expect(repository.createInterest).not.toHaveBeenCalled()
    expect(query.mock.calls.at(-1)?.[0]).toBe('rollback')
  })

  it('requires an apology before the person who ended a match can re-offer interest', async () => {
    const { database, query } = databaseClient()
    const repository = {
      lockSender: vi.fn(),
      getSenderForUpdate: vi.fn().mockResolvedValue({
        accountStatus: 'active', pausedUntil: null, discoveryRestrictedUntil: null,
      }),
      findEligibleTarget: vi.fn().mockResolvedValue({ userId: 'user-b', displayName: 'Alex' }),
      lockPair: vi.fn(),
      findCurrentMatch: vi.fn().mockResolvedValue(null),
      findEndedMatch: vi.fn().mockResolvedValue({
        id: 'match-1', endedBy: 'user-a', endedAt: '2026-08-01T12:00:00.000Z',
        secondChanceAvailable: false,
      }),
      findInterest: vi.fn(),
    } as unknown as InterestRepository
    const service = new InterestService({
      database,
      interests: () => repository,
      idempotency: () => ({
        removeExpired: vi.fn(), claim: vi.fn().mockResolvedValue({ claimed: true }), complete: vi.fn(),
      }) as unknown as IdempotencyRepository,
      outbox: () => ({ publish: vi.fn() }) as unknown as OutboxRepository,
      activateMatch: vi.fn(),
      requestOutboxProcessing: vi.fn(),
    })

    await expect(service.sendInterest({
      senderId: 'user-a', profileSlug: 'alex', idempotencyKey: 'request-key-ended-2',
    })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Send a brief note before asking to reconnect',
    })
    expect(repository.findInterest).not.toHaveBeenCalled()
    expect(query.mock.calls.at(-1)?.[0]).toBe('rollback')
  })

  it('preserves the earlier interest when sending one apology-led second chance', async () => {
    const { database, query } = databaseClient()
    const resolvePairInterestsThrough = vi.fn()
    const countSentToday = vi.fn().mockResolvedValue(1)
    const createInterest = vi.fn().mockResolvedValue({
      id: 'interest-second-chance', date: '2026-08-30',
    })
    const repository = {
      lockSender: vi.fn(),
      getSenderForUpdate: vi.fn().mockResolvedValue({
        accountStatus: 'active', pausedUntil: null, discoveryRestrictedUntil: null,
      }),
      findEligibleTarget: vi.fn().mockResolvedValue({ userId: 'user-b', displayName: 'Alex' }),
      lockPair: vi.fn(),
      findCurrentMatch: vi.fn().mockResolvedValue(null),
      findEndedMatch: vi.fn().mockResolvedValue({
        id: 'match-1', endedBy: 'user-a', endedAt: '2026-08-01T12:00:00.000Z',
        secondChanceAvailable: true,
      }),
      findInterest: vi.fn().mockResolvedValue({ createdAt: '2026-07-30T12:00:00.000Z' }),
      resolvePairInterestsThrough,
      countSentToday,
      hasReverseInterest: vi.fn().mockResolvedValue(false),
      recipientInboxAcceptingInterests: vi.fn().mockResolvedValue(true),
      createInterest,
    } as unknown as InterestRepository
    const service = new InterestService({
      database,
      interests: () => repository,
      idempotency: () => ({
        removeExpired: vi.fn(), claim: vi.fn().mockResolvedValue({ claimed: true }), complete: vi.fn(),
      }) as unknown as IdempotencyRepository,
      outbox: () => ({ publish: vi.fn() }) as unknown as OutboxRepository,
      activateMatch: vi.fn(),
      requestOutboxProcessing: vi.fn(),
    })

    await expect(service.sendInterest({
      senderId: 'user-a', profileSlug: 'alex', idempotencyKey: 'request-key-ended-3',
    })).resolves.toMatchObject({ matched: false, queued: false })

    expect(resolvePairInterestsThrough).toHaveBeenCalledWith(
      'user-a', 'user-b', '2026-08-01T12:00:00.000Z',
    )
    expect(resolvePairInterestsThrough.mock.invocationCallOrder[0])
      .toBeLessThan(countSentToday.mock.invocationCallOrder[0])
    expect(createInterest).toHaveBeenCalledOnce()
    expect(query.mock.calls.at(-1)?.[0]).toBe('commit')
  })

  it('rejects another interest in the same ended-match lifecycle', async () => {
    const { database, query } = databaseClient()
    const resolvePairInterestsThrough = vi.fn()
    const repository = {
      lockSender: vi.fn(),
      getSenderForUpdate: vi.fn().mockResolvedValue({
        accountStatus: 'active', pausedUntil: null, discoveryRestrictedUntil: null,
      }),
      findEligibleTarget: vi.fn().mockResolvedValue({ userId: 'user-b', displayName: 'Alex' }),
      lockPair: vi.fn(),
      findCurrentMatch: vi.fn().mockResolvedValue(null),
      findEndedMatch: vi.fn().mockResolvedValue({
        id: 'match-1', endedBy: 'user-a', endedAt: '2026-08-01T12:00:00.000Z',
        secondChanceAvailable: true,
      }),
      findInterest: vi.fn().mockResolvedValue({ createdAt: '2026-08-02T12:00:00.000Z' }),
      resolvePairInterestsThrough,
      createInterest: vi.fn(),
    } as unknown as InterestRepository
    const service = new InterestService({
      database,
      interests: () => repository,
      idempotency: () => ({
        removeExpired: vi.fn(), claim: vi.fn().mockResolvedValue({ claimed: true }), complete: vi.fn(),
      }) as unknown as IdempotencyRepository,
      outbox: () => ({ publish: vi.fn() }) as unknown as OutboxRepository,
      activateMatch: vi.fn(),
      requestOutboxProcessing: vi.fn(),
    })

    await expect(service.sendInterest({
      senderId: 'user-a', profileSlug: 'alex', idempotencyKey: 'request-key-ended-4',
    })).rejects.toMatchObject({
      statusCode: 409, statusMessage: 'You have already sent interest to this person',
    })
    expect(resolvePairInterestsThrough).not.toHaveBeenCalled()
    expect(repository.createInterest).not.toHaveBeenCalled()
    expect(query.mock.calls.at(-1)?.[0]).toBe('rollback')
  })

  it('does not admit a one-sided interest when the recipient inbox is unavailable', async () => {
    const { database, query } = databaseClient()
    const repository = {
      lockSender: vi.fn(),
      getSenderForUpdate: vi.fn().mockResolvedValue({
        accountStatus: 'active',
        pausedUntil: null,
        discoveryRestrictedUntil: null,
      }),
      findEligibleTarget: vi.fn().mockResolvedValue({
        userId: 'user-b',
        displayName: 'Alex',
      }),
      lockPair: vi.fn(),
      findCurrentMatch: vi.fn().mockResolvedValue(null),
      findEndedMatch: vi.fn().mockResolvedValue(null),
      findInterest: vi.fn().mockResolvedValue(null),
      countSentToday: vi.fn().mockResolvedValue(0),
      hasReverseInterest: vi.fn().mockResolvedValue(false),
      recipientInboxAcceptingInterests: vi.fn().mockResolvedValue(false),
      createInterest: vi.fn(),
    } as unknown as InterestRepository
    const requests = {
      removeExpired: vi.fn(),
      claim: vi.fn().mockResolvedValue({ claimed: true }),
      complete: vi.fn(),
    } as unknown as IdempotencyRepository
    const events = { publish: vi.fn() } as unknown as OutboxRepository
    const service = new InterestService({
      database,
      interests: () => repository,
      idempotency: () => requests,
      outbox: () => events,
      activateMatch: vi.fn(),
      requestOutboxProcessing: vi.fn(),
    })

    await expect(service.sendInterest({
      senderId: 'user-a',
      profileSlug: 'alex',
      idempotencyKey: 'request-key-0004',
    })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'This person is not accepting new interests right now',
    })

    expect(repository.recipientInboxAcceptingInterests).toHaveBeenCalledWith('user-b')
    expect(repository.createInterest).not.toHaveBeenCalled()
    expect(query.mock.calls.at(-1)?.[0]).toBe('rollback')
  })

  it('turns an atomic capacity race into the normal full-inbox response', async () => {
    const { database, query } = databaseClient()
    const repository = {
      lockSender: vi.fn(),
      getSenderForUpdate: vi.fn().mockResolvedValue({
        accountStatus: 'active',
        pausedUntil: null,
        discoveryRestrictedUntil: null,
      }),
      findEligibleTarget: vi.fn().mockResolvedValue({
        userId: 'user-b',
        displayName: 'Alex',
      }),
      lockPair: vi.fn(),
      findCurrentMatch: vi.fn().mockResolvedValue(null),
      findEndedMatch: vi.fn().mockResolvedValue(null),
      findInterest: vi.fn().mockResolvedValue(null),
      countSentToday: vi.fn().mockResolvedValue(0),
      hasReverseInterest: vi.fn().mockResolvedValue(false),
      recipientInboxAcceptingInterests: vi.fn().mockResolvedValue(true),
      createInterest: vi.fn().mockRejectedValue({
        code: '23514',
        constraint: 'interest_inbox_capacity',
      }),
    } as unknown as InterestRepository
    const requests = {
      removeExpired: vi.fn(),
      claim: vi.fn().mockResolvedValue({ claimed: true }),
      complete: vi.fn(),
    } as unknown as IdempotencyRepository
    const service = new InterestService({
      database,
      interests: () => repository,
      idempotency: () => requests,
      outbox: () => ({ publish: vi.fn() }) as unknown as OutboxRepository,
      activateMatch: vi.fn(),
      requestOutboxProcessing: vi.fn(),
    })

    await expect(service.sendInterest({
      senderId: 'user-a',
      profileSlug: 'alex',
      idempotencyKey: 'request-key-capacity-race',
    })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'This person is not accepting new interests right now',
    })
    expect(query.mock.calls.at(-1)?.[0]).toBe('rollback')
  })

  it('serializes manual acceptance and preserves a capacity-limited queued match', async () => {
    const { database, query } = databaseClient()
    const lockRecipientMomentum = vi.fn()
    const findIncomingInterestForUpdate = vi.fn().mockResolvedValue({
      senderId: 'user-a',
      slug: 'alex',
      displayName: 'Alex',
    })
    const repository = {
      lockRecipientMomentum,
      hasAcceptedInterestAwaitingAction: vi.fn().mockResolvedValue(false),
      findIncomingInterestForUpdate,
      lockPair: vi.fn(),
      isBlocked: vi.fn().mockResolvedValue(false),
      findPairMatch: vi.fn().mockResolvedValue(null),
      createOrResetQueuedMatch: vi.fn().mockResolvedValue({ id: 'match-2' }),
      clearDateProposals: vi.fn(),
      resolveAcceptedInterest: vi.fn().mockResolvedValue(undefined),
    } as unknown as MatchRepository
    const requests = {
      removeExpired: vi.fn(),
      claim: vi.fn().mockResolvedValue({ claimed: true }),
      complete: vi.fn(),
    } as unknown as IdempotencyRepository
    const publish = vi.fn().mockResolvedValue({ id: 2 })
    const events = { publish } as unknown as OutboxRepository
    const requestOutboxProcessing = vi.fn()
    const service = new MatchService({
      database,
      matches: () => repository,
      idempotency: () => requests,
      outbox: () => events,
      activateMatch: vi.fn().mockResolvedValue(false),
      requestOutboxProcessing,
    })

    await expect(service.acceptInterest({
      recipientId: 'user-b',
      interestId: 'interest-1',
      idempotencyKey: 'request-key-0003',
    })).resolves.toMatchObject({ matched: true, queued: true, matchId: 'match-2' })

    expect(lockRecipientMomentum.mock.invocationCallOrder[0])
      .toBeLessThan(findIncomingInterestForUpdate.mock.invocationCallOrder[0])
    expect(repository.lockPair).toHaveBeenCalledWith('user-b', 'user-a')
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'match.created',
      aggregateId: 'match-2',
      payload: expect.objectContaining({ kind: 'match_queued' }),
    }))
    expect(requests.complete).toHaveBeenCalledOnce()
    expect(query.mock.calls.at(-1)?.[0]).toBe('commit')
    expect(requestOutboxProcessing).toHaveBeenCalledWith(
      'interest.accept:user-b:request-key-0003',
    )
  })
})
