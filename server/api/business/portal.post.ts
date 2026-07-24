import { createError } from 'h3'
import { db } from '~/server/repositories/db'
import { stripe } from '~/server/services/billing/stripeClient'
import { requireBusiness } from '~/server/utils/requireBusiness'

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event)
  const subscription = await db.query(`select stripe_customer_id from business_subscriptions
    where business_id=$1 order by updated_at desc limit 1`, [business.id])
  const customer = subscription.rows[0]?.stripe_customer_id
  if (!customer) throw createError({ statusCode: 400, statusMessage: 'No business subscription found' })
  const siteUrl = process.env.SITE_URL?.replace(/\/+$/,'')
  if (!siteUrl) throw createError({ statusCode: 500, statusMessage: 'SITE_URL is not configured' })
  const session = await stripe.billingPortal.sessions.create({ customer,return_url: `${siteUrl}/business` })
  return { url: session.url }
})
