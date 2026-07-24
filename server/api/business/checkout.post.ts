import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { getOrCreateStripeCustomer } from '~/server/services/billing/getOrCreateStripeCustomer'
import { stripe } from '~/server/services/billing/stripeClient'
import { requireBusiness } from '~/server/utils/requireBusiness'
import { objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const body = objectBody(await readBody(event))
  const businessId = text(body.businessId, 'Business', 50, true)!
  const plan = text(body.plan, 'Business plan', 20, true)!
  if (!['standard','featured'].includes(plan)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid business plan' })
  const business = await requireBusiness(event,businessId)
  const active = await db.query(`select 1 from business_subscriptions where business_id=$1
    and subscription_status in ('active','trialing','past_due','incomplete') limit 1`, [business.id])
  if (active.rows[0]) throw createError({ statusCode: 409, statusMessage: 'This business already has a subscription' })
  const user = await db.query('select email from users where id=$1', [business.userId])
  const email = user.rows[0]?.email
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Account email not found' })
  const priceId = plan === 'standard' ? process.env.STRIPE_BUSINESS_PRICE_ID_STANDARD : process.env.STRIPE_BUSINESS_PRICE_ID_FEATURED
  if (!priceId) throw createError({ statusCode: 500, statusMessage: `Missing Stripe price for the ${plan} business plan` })
  const customer = await getOrCreateStripeCustomer(business.userId,email)
  const siteUrl = process.env.SITE_URL?.replace(/\/+$/,'')
  if (!siteUrl) throw createError({ statusCode: 500, statusMessage: 'SITE_URL is not configured' })
  const metadata = { subscriptionKind: 'business', businessId: business.id, businessPlan: plan, userId: business.userId }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',customer,client_reference_id: business.userId,line_items: [{ price: priceId,quantity: 1 }],
    success_url: `${siteUrl}/business?checkout=success`,cancel_url: `${siteUrl}/business/pricing?cancelled=1`,
    metadata,subscription_data: { metadata },
  },{ idempotencyKey: crypto.randomUUID() })
  if (!session.url) throw createError({ statusCode: 500, statusMessage: 'Stripe Checkout did not return a URL' })
  return { url: session.url }
})
