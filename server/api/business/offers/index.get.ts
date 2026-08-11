import { db } from "~/server/repositories/db";
import { requireBusiness } from "~/server/utils/requireBusiness";

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event);
  const { rows } = await db.query(
    `select o.id,o.title,o.description,o.discount_type as "discountType",
    o.discount_value::float as "discountValue",o.terms,o.starts_at as "startsAt",o.ends_at as "endsAt",
    o.active,o.approval_status as "approvalStatus",o.rejection_note as "rejectionNote",
    o.redemption_limit_total as "redemptionLimitTotal",
    o.redemption_limit_per_user as "redemptionLimitPerUser",
    o.reviewed_at as "reviewedAt",o.venue_scope as "venueScope",v.name as "venueName",v.id as "venueId",
    case when o.venue_scope='single' then json_build_array(o.venue_id)
      when o.venue_scope='selected' then coalesce((select json_agg(ov.venue_id order by ov.venue_id)
        from business_offer_venues ov where ov.offer_id=o.id),'[]'::json)
      else '[]'::json end as "venueIds",
    case when o.venue_scope='all' then (select count(*)::int from business_venues av
        where av.business_id=o.business_id and av.status='active')
      when o.venue_scope='selected' then (select count(*)::int from business_offer_venues ov
        join business_venues av on av.id=ov.venue_id where ov.offer_id=o.id and av.status='active')
      else case when v.status='active' then 1 else 0 end end as "venueCount"
    from business_offers o join business_venues v on v.id=o.venue_id
    where o.business_id=$1 order by o.created_at desc`,
    [business.id],
  );
  return { offers: rows };
});
