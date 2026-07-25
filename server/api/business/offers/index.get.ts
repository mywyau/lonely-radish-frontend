import { db } from '~/server/repositories/db'
import { requireBusiness } from '~/server/utils/requireBusiness'

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event)
  const { rows } = await db.query(`select o.id,o.title,o.description,o.discount_type as "discountType",
    o.discount_value::float as "discountValue",o.terms,o.starts_at as "startsAt",o.ends_at as "endsAt",
    o.active,o.approval_status as "approvalStatus",o.rejection_note as "rejectionNote",
    o.reviewed_at as "reviewedAt",v.name as "venueName",v.id as "venueId"
    from business_offers o join business_venues v on v.id=o.venue_id
    where o.business_id=$1 order by o.created_at desc`, [business.id])
  return { offers: rows }
})
