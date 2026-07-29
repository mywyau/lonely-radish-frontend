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
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(['begin', 'commit'])
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
      createInterest,
      hasReverseInterest: vi.fn().mockResolvedValue(true),
      upsertQueuedMatch: vi.fn().mockResolvedValue({ id: 'match-1' }),
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
    expect(publish).toHaveBeenCalledTimes(2)
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'interest.sent',
      aggregateId: 'interest-1',
    }))
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
      hasPendingManualMatch: vi.fn().mockResolvedValue(false),
      findIncomingInterestForUpdate,
      lockPair: vi.fn(),
      isBlocked: vi.fn().mockResolvedValue(false),
      findPairMatch: vi.fn().mockResolvedValue(null),
      createOrResetQueuedMatch: vi.fn().mockResolvedValue({ id: 'match-2' }),
      clearDateProposals: vi.fn(),
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
