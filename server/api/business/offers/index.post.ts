import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireBusiness } from '~/server/utils/requireBusiness'
import { boolean, objectBody, text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event)
  const body = objectBody(await readBody(event))
  const venueId = text(body.venueId, 'Venue', 50, true)!
  const title = text(body.title, 'Offer title', 120, true)!
  const description = text(body.description, 'Description', 500)
  const discountType = text(body.discountType, 'Discount type', 20, true)!
  const discountValue = Number(body.discountValue)
  const terms = text(body.terms, 'Terms', 500)
  const active = body.active == null ? false : boolean(body.active, 'Active')
  if (!['percentage','fixed'].includes(discountType) || !Number.isFinite(discountValue) || discountValue <= 0 ||
    (discountType === 'percentage' && discountValue > 100)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid discount' })
  }
  const plan = await db.query(`select plan from business_subscriptions where business_id=$1
    and subscription_status in ('active','trialing','past_due') order by updated_at desc limit 1`, [business.id])
  const limit = plan.rows[0]?.plan === 'featured' ? 10 : plan.rows[0]?.plan === 'standard' ? 5 : 1
  const count = await db.query('select count(*)::int as count from business_offers where business_id=$1', [business.id])
  if (count.rows[0].count >= limit) throw createError({ statusCode: 409,
    statusMessage: `Your current business plan allows ${limit} ${limit === 1 ? 'offer' : 'offers'}` })
  const { rows } = await db.query(`insert into business_offers(business_id,venue_id,title,description,
      discount_type,discount_value,terms,active)
    select $1,v.id,$3,$4,$5,$6,$7,$8 from business_venues v where v.id=$2 and v.business_id=$1
    returning id,title,description,discount_type as "discountType",discount_value::float as "discountValue",
      terms,active,approval_status as "approvalStatus"`,
  [business.id,venueId,title,description,discountType,discountValue,terms,active])
  if (!rows[0]) throw createError({ statusCode: 400, statusMessage: 'Choose a venue belonging to this business' })
  return { offer: rows[0], limit }
})
