import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select b.id,b.name,b.slug,b.status,b.contact_email as "contactEmail",bm.role,
    coalesce((select json_agg(json_build_object('id',v.id,'name',v.name,'category',v.category,
      'addressLine',v.address_line,'city',v.city,'postcode',v.postcode,'status',v.status,
      'rejectionNote',v.rejection_note,'revision',v.revision,'submittedAt',v.submitted_at,
      'archivedAt',v.archived_at) order by v.created_at)
      from business_venues v where v.business_id=b.id),'[]'::json) as venues,
    subscription.plan,subscription.subscription_status as "subscriptionStatus",
    subscription.cancel_at_period_end as "cancelAtPeriodEnd",subscription.current_period_end as "currentPeriodEnd",
    (select count(*)::int from business_offers o where o.business_id=b.id
      and o.approval_status<>'archived') as "offerCount"
    from business_members bm join businesses b on b.id=bm.business_id
    left join lateral (select bs.* from business_subscriptions bs where bs.business_id=b.id
      order by bs.updated_at desc limit 1) subscription on true
    where bm.user_id=$1 order by bm.created_at limit 1`, [sub])
  return { business: rows[0] || null }
})
