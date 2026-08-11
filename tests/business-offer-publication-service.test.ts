import { describe, expect, it, vi } from 'vitest'
import type { DatabaseQueryable } from '../server/repositories/db'
import { setBusinessOfferActive } from '../server/services/businessOfferPublication'

describe('business offer publication policy', () => {
  it('publishes only when the database confirms every approval boundary', async () => {
    const query = vi.fn(async () => ({ rows: [{ id: 'offer-1', active: true }], rowCount: 1 }))
    const result = await setBusinessOfferActive({ query } as unknown as DatabaseQueryable,
      { offerId: 'offer-1', businessId: 'business-1', active: true })

    expect(result).toEqual({ id: 'offer-1', active: true })
    const statement = String((query.mock.calls as unknown[][])[0]?.[0])
    expect(statement).toContain("offer.approval_status='approved'")
    expect(statement).toContain("business.status='active'")
    expect(statement).toContain("venue.status='active'")
  })

  it('rejects activation when the offer exists but an approval is missing', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 'offer-1' }], rowCount: 1 })

    await expect(setBusinessOfferActive({ query } as unknown as DatabaseQueryable,
      { offerId: 'offer-1', businessId: 'business-1', active: true }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('always lets a merchant take its own offer offline', async () => {
    const query = vi.fn(async () => ({ rows: [{ id: 'offer-1', active: false }], rowCount: 1 }))
    await expect(setBusinessOfferActive({ query } as unknown as DatabaseQueryable,
      { offerId: 'offer-1', businessId: 'business-1', active: false }))
      .resolves.toEqual({ id: 'offer-1', active: false })
  })
})
