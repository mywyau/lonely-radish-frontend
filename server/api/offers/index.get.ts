import { setHeader } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  setHeader(event, "Cache-Control", "private, no-store");
  const { rows } =
    await db.query(`select o.id,o.title,o.description,o.discount_type as "discountType",
    o.discount_value::float as "discountValue",o.terms,o.starts_at as "startsAt",o.ends_at as "endsAt",
    b.name as "businessName",o.venue_scope as "venueScope",locations."locationCount",locations.venues,
    locations.venues->0->>'name' as "venueName",locations.venues->0->>'category' as category,
    locations.venues->0->>'city' as city
    from business_offers o join businesses b on b.id=o.business_id
    join lateral (
      select count(*)::int as "locationCount",
        coalesce(json_agg(json_build_object('id',eligible.id,'name',eligible.name,'category',eligible.category,
          'city',eligible.city,'postcode',eligible.postcode) order by eligible.name,eligible.id)
          filter(where eligible.preview_position<=5),'[]'::json) as venues
      from (
        select v.id,v.name,v.category,v.city,v.postcode,
          row_number() over(order by v.name,v.id) as preview_position
        from business_venues v
        where v.business_id=o.business_id and v.status='active' and (
          o.venue_scope='all' or
          (o.venue_scope='single' and v.id=o.venue_id) or
          (o.venue_scope='selected' and exists(select 1 from business_offer_venues ov
            where ov.offer_id=o.id and ov.venue_id=v.id))
        )
      ) eligible
    ) locations on locations."locationCount">0
    where o.approval_status='approved' and o.active=true
      and b.status='active'
      and (o.starts_at is null or o.starts_at<=now())
      and (o.ends_at is null or o.ends_at>now())
    order by case when exists(select 1 from business_subscriptions bs where bs.business_id=b.id
      and bs.plan='featured' and bs.subscription_status in ('active','trialing','past_due')) then 0 else 1 end,
      o.created_at desc limit 100`);
  return { offers: rows };
});
