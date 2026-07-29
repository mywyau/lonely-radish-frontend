import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbQueryMock = vi.hoisted(() => vi.fn())

vi.mock('~/server/repositories/db', () => ({
  db: {
    query: dbQueryMock,
  },
}))

const { insertStripeEvent } = await import(
  '../server/services/billing/stripeEventRepository'
)

describe('Stripe event repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the routing identifiers extracted from a stored event', async () => {
    dbQueryMock.mockResolvedValue({ rows: [{ event_id: 'evt_123' }], rowCount: 1 })
    const event = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      created: 1_800_000_000,
      data: {
        object: {
          object: 'checkout.session',
          subscription: 'sub_123',
          customer: 'cus_123',
          client_reference_id: 'auth0|user_123',
        },
      },
    } as Stripe.Event

    await expect(insertStripeEvent(event)).resolves.toEqual({
      inserted: true,
      stripeSubscriptionId: 'sub_123',
      stripeCustomerId: 'cus_123',
      userId: 'auth0|user_123',
    })
  })
})
