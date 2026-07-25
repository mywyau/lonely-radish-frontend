import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { rows } = await db.query(`select o.id,o.title,o.description,o.discount_type as "discountType",
    o.discount_value::float as "discountValue",o.terms,o.starts_at as "startsAt",o.ends_at as "endsAt",
    b.name as "businessName",v.name as "venueName",v.category,v.city
    from business_offers o join businesses b on b.id=o.business_id
    join business_venues v on v.id=o.venue_id
    where o.approval_status='approved' and o.active=true
      and b.status='active' and v.status='active'
      and (o.starts_at is null or o.starts_at<=now())
      and (o.ends_at is null or o.ends_at>now())
    order by case when exists(select 1 from business_subscriptions bs where bs.business_id=b.id
      and bs.plan='featured' and bs.subscription_status in ('active','trialing','past_due')) then 0 else 1 end,
      o.created_at desc limit 100`)
  return { offers: rows }
})
