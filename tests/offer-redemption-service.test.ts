import { describe, expect, it, vi } from 'vitest'
import type { Database, DatabaseClient } from '../server/repositories/db'
import { redeemOfferClaim } from '../server/services/offerRedemption'

const digest = Buffer.alloc(32, 7)
const input = {
  businessId: 'business-1', redeemerUserId: 'staff-1', venueId: 'venue-1', codeDigest: digest,
  idempotencyKey: '11111111-1111-4111-8111-111111111111',
}

function issuedClaim(overrides: Record<string, unknown> = {}) {
  return {
    id: 'claim-1', offerId: 'offer-1', claimantUserId: 'member-1', status: 'issued',
    expiresAt: new Date(Date.now() + 60_000).toISOString(), offerTitle: 'Coffee for two',
    discountType: 'percentage', discountValue: 20, terms: null, businessName: 'Cafe',
    venueName: 'Cafe Central', active: true, approvalStatus: 'approved', startsAt: null,
    endsAt: null, venueStatus: 'active', redemptionLimitTotal: 100,
    redemptionLimitPerUser: 1, redemptionIdempotencyKey: null, redeemedAt: null, ...overrides,
  }
}

function databaseFor(query: DatabaseClient['query']) {
  const release = vi.fn()
  return {
    database: { connect: vi.fn(async () => ({ query, release })), query: vi.fn() } as unknown as Database,
    release,
  }
}

describe('offer redemption policy', () => {
  it('redeems atomically and stores the attempt key', async () => {
    const query = vi.fn(async (sql: string, _values?: readonly unknown[]) => {
      if (sql.includes('from business_offer_claims c join')) return { rows: [issuedClaim()], rowCount: 1 }
      if (sql.includes('count(*)::int as total')) return { rows: [{ total: 4, userTotal: 0 }], rowCount: 1 }
      if (sql.includes("set status='redeemed'")) {
        return { rows: [{ id: 'claim-1', redeemedAt: '2026-08-12T12:00:00.000Z' }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
    const { database, release } = databaseFor(query as unknown as DatabaseClient['query'])

    const result = await redeemOfferClaim(database, input)

    expect(result.redemption).toMatchObject({ id: 'claim-1', idempotentReplay: false })
    const update = query.mock.calls.find(call => String(call[0]).includes("set status='redeemed'"))
    expect(update?.[1]).toContain(input.idempotencyKey)
    expect(release).toHaveBeenCalledOnce()
  })

  it('returns the original success for an exact retry but rejects a new replay key', async () => {
    const redeemedAt = '2026-08-12T12:00:00.000Z'
    const exactQuery = vi.fn(async (sql: string) => sql.includes('from business_offer_claims c join')
      ? { rows: [issuedClaim({ status: 'redeemed', redemptionIdempotencyKey: input.idempotencyKey, redeemedAt })], rowCount: 1 }
      : { rows: [], rowCount: 0 })
    const exact = databaseFor(exactQuery as unknown as DatabaseClient['query'])
    await expect(redeemOfferClaim(exact.database, input)).resolves.toMatchObject({
      redemption: { id: 'claim-1', idempotentReplay: true },
    })

    const replayQuery = vi.fn(async (sql: string) => sql.includes('from business_offer_claims c join')
      ? { rows: [issuedClaim({ status: 'redeemed', redemptionIdempotencyKey: '22222222-2222-4222-8222-222222222222', redeemedAt })], rowCount: 1 }
      : { rows: [], rowCount: 0 })
    const replay = databaseFor(replayQuery as unknown as DatabaseClient['query'])
    await expect(redeemOfferClaim(replay.database, input)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('enforces durable campaign-wide and per-customer limits', async () => {
    async function expectLimit(usage: { total: number; userTotal: number }, message: string) {
      const query = vi.fn(async (sql: string) => {
        if (sql.includes('from business_offer_claims c join')) return { rows: [issuedClaim()], rowCount: 1 }
        if (sql.includes('count(*)::int as total')) return { rows: [usage], rowCount: 1 }
        return { rows: [], rowCount: 0 }
      })
      const { database } = databaseFor(query as unknown as DatabaseClient['query'])
      await expect(redeemOfferClaim(database, input)).rejects.toMatchObject({ statusMessage: message })
    }

    await expectLimit({ total: 100, userTotal: 0 }, 'This offer has reached its redemption limit')
    await expectLimit({ total: 4, userTotal: 1 }, 'This customer has reached the limit for this offer')
  })
})
