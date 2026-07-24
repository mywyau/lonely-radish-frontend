import type Stripe from 'stripe'
import { db } from '~/server/repositories/db'

function iso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null
}

export async function upsertBusinessSubscription(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.businessId
  const plan = subscription.metadata?.businessPlan
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null
  if (!businessId || !['standard','featured'].includes(plan || '')) throw new Error(`Invalid business metadata on ${subscription.id}`)
  if (!customerId) throw new Error(`Business subscription ${subscription.id} is missing its customer`)
  const item = subscription.items?.data?.[0]
  await db.query(`insert into business_subscriptions(stripe_subscription_id,business_id,stripe_customer_id,plan,
      subscription_status,cancel_at_period_end,current_period_start,current_period_end,canceled_at,latest_invoice_id)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    on conflict(stripe_subscription_id) do update set plan=excluded.plan,subscription_status=excluded.subscription_status,
      cancel_at_period_end=excluded.cancel_at_period_end,current_period_start=excluded.current_period_start,
      current_period_end=excluded.current_period_end,canceled_at=excluded.canceled_at,
      latest_invoice_id=excluded.latest_invoice_id,updated_at=now()`,
  [subscription.id,businessId,customerId,plan,subscription.status,Boolean(subscription.cancel_at_period_end),
    iso(item?.current_period_start),iso(item?.current_period_end),iso(subscription.canceled_at),
    typeof subscription.latest_invoice === 'string' ? subscription.latest_invoice : null])
}
