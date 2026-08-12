import { describe, expect, it, vi } from 'vitest'
import type { Database, DatabaseClient } from '../server/repositories/db'
import {
  transitionOfferSubmission,
  transitionVenueSubmission,
  updateOfferSubmission,
  updateVenueSubmission,
} from '../server/services/businessSubmissionLifecycle'

const venueId = '11111111-1111-4111-8111-111111111111'
const offerId = '22222222-2222-4222-8222-222222222222'
const businessId = '33333333-3333-4333-8333-333333333333'

function databaseFor(query: DatabaseClient['query']) {
  const release = vi.fn()
  return { database: { connect: vi.fn(async () => ({ query, release })), query: vi.fn() } as unknown as Database,
    release }
}

function offer(overrides: Record<string, unknown> = {}) {
  return { id: offerId, businessId, venueId, venueScope: 'single', title: 'Coffee for two', description: 'Share a drink',
    discountType: 'percentage', discountValue: 20, terms: 'Weekdays', redemptionLimitTotal: 100,
    redemptionLimitPerUser: 1, approvalStatus: 'approved', active: true, revision: 2,
    rejectionNote: null, archivedAt: null, ...overrides }
}

const submission = { venueScope: 'single' as const, venueId, title: 'Coffee for two', description: 'Share a drink',
  discountType: 'percentage' as const, discountValue: 20, terms: 'Weekdays', redemptionLimitTotal: 100,
  redemptionLimitPerUser: 1 }

describe('business submission lifecycle', () => {
  it('takes a materially edited approved offer offline and returns it to draft', async () => {
    const query = vi.fn(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes('from business_offers where')) return { rows: [offer()], rowCount: 1 }
      if (sql.includes('select venue_id as id')) return { rows: [{ id: venueId }], rowCount: 1 }
      if (sql.includes("status<>'archived' and id=any")) return { rows: [{ id: venueId }], rowCount: 1 }
      if (sql.includes('update business_offers set venue_id')) return { rows: [{ ...offer({ title: values?.[4],
        approvalStatus: 'draft', active: false, revision: 3 }) }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    const { database, release } = databaseFor(query as unknown as DatabaseClient['query'])

    const result = await updateOfferSubmission(database, { businessId, offerId, actorId: 'owner-1',
      submission: { ...submission, title: 'Coffee and cake for two' } })

    expect(result.approvalReset).toBe(true)
    const update = query.mock.calls.find(call => String(call[0]).includes('update business_offers set venue_id'))
    expect(update?.[1]?.at(-1)).toBe(true)
    expect(query.mock.calls.some(call => String(call[0]).includes('business_submission_versions'))).toBe(true)
    expect(query.mock.calls.some(call => String(call[0]).includes('delete from business_offer_venues'))).toBe(true)
    expect(release).toHaveBeenCalledOnce()
  })

  it('allows a redemption-limit edit without resetting content approval', async () => {
    const query = vi.fn(async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes('from business_offers where')) return { rows: [offer()], rowCount: 1 }
      if (sql.includes('select venue_id as id')) return { rows: [{ id: venueId }], rowCount: 1 }
      if (sql.includes("status<>'archived' and id=any")) return { rows: [{ id: venueId }], rowCount: 1 }
      if (sql.includes('update business_offers set venue_id')) return { rows: [{ ...offer({
        redemptionLimitTotal: values?.[9], revision: 3 }) }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    const { database } = databaseFor(query as unknown as DatabaseClient['query'])
    const result = await updateOfferSubmission(database, { businessId, offerId, actorId: 'owner-1',
      submission: { ...submission, redemptionLimitTotal: 50 } })

    expect(result.approvalReset).toBe(false)
    const update = query.mock.calls.find(call => String(call[0]).includes('update business_offers set venue_id'))
    expect(update?.[1]?.at(-1)).toBe(false)
    expect(query.mock.calls.some(call => String(call[0]).includes('delete from business_offer_venues'))).toBe(false)
  })

  it('preserves a rejected offer revision and resubmits it as inactive pending work', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('from business_offers where')) return { rows: [offer({ approvalStatus: 'rejected', active: false })], rowCount: 1 }
      if (sql.includes('select venue_id as id')) return { rows: [{ id: venueId }], rowCount: 1 }
      if (sql.includes('update business_offers set approval_status')) {
        return { rows: [{ id: offerId, title: 'Coffee for two', approvalStatus: 'pending', active: false,
          revision: 3, rejectionNote: null, archivedAt: null }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
    const { database } = databaseFor(query as unknown as DatabaseClient['query'])
    const result = await transitionOfferSubmission(database, { businessId, offerId,
      actorId: 'owner-1', action: 'resubmit' })
    expect(result.offer).toMatchObject({ approvalStatus: 'pending', active: false })
    expect(query.mock.calls.some(call => String(call[0]).includes('business_submission_versions'))).toBe(true)
  })

  it('archives venues non-destructively and takes unsupported campaigns offline', async () => {
    const existing = { id: venueId, businessId, name: 'Central', category: 'cafe', addressLine: '1 High Street',
      city: 'London', postcode: 'SW1 1AA', status: 'active', revision: 1, rejectionNote: null, archivedAt: null }
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('from business_venues where')) return { rows: [existing], rowCount: 1 }
      if (sql.includes('update business_venues set status')) return { rows: [{ ...existing, status: 'archived',
        revision: 2, archivedAt: '2026-08-12T12:00:00.000Z' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    const { database } = databaseFor(query as unknown as DatabaseClient['query'])
    const result = await transitionVenueSubmission(database, { businessId, venueId,
      actorId: 'owner-1', action: 'archive' })
    expect(result.venue).toMatchObject({ status: 'archived', revision: 2 })
    expect(query.mock.calls.some(call => String(call[0]).includes('not exists('))).toBe(true)
  })

  it('resets venue approval after a material address edit', async () => {
    const existing = { id: venueId, businessId, name: 'Central', category: 'cafe', addressLine: '1 High Street',
      city: 'London', postcode: 'SW1 1AA', status: 'active', revision: 1, rejectionNote: null, archivedAt: null }
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('select 1 from business_venues')) return { rows: [], rowCount: 0 }
      if (sql.includes('from business_venues where')) return { rows: [existing], rowCount: 1 }
      if (sql.includes('update business_venues set name')) return { rows: [{ ...existing,
        addressLine: '2 High Street', status: 'draft', revision: 2 }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    const { database } = databaseFor(query as unknown as DatabaseClient['query'])
    const result = await updateVenueSubmission(database, { businessId, venueId, actorId: 'owner-1',
      submission: { name: 'Central', category: 'cafe', addressLine: '2 High Street', city: 'London', postcode: 'SW1 1AA' } })
    expect(result).toMatchObject({ approvalReset: true, venue: { status: 'draft' } })
  })
})
