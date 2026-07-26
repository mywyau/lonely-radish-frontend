import { setHeader } from "h3";
import { db } from "~/server/repositories/db";
import { requireAdmin } from "~/server/utils/requireAdmin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  setHeader(event, "Cache-Control", "private, no-store");
  const [businesses, venues, offers] = await Promise.all([
    db.query(`select b.id,b.name,b.slug,b.contact_email as "contactEmail",b.status,b.created_at as "createdAt",
      b.reviewed_at as "reviewedAt",u.email as "reviewedBy"
      from businesses b left join users u on u.id=b.reviewed_by
      order by case when b.status='pending' then 0 else 1 end,b.created_at desc limit 200`),
    db.query(`select v.id,v.business_id as "businessId",v.name,v.category,v.address_line as "addressLine",
      v.city,v.postcode,v.status,v.reviewed_at as "reviewedAt",u.email as "reviewedBy"
      from business_venues v left join users u on u.id=v.reviewed_by order by v.created_at`),
    db.query(`select o.id,o.business_id as "businessId",o.venue_id as "venueId",o.title,o.description,
      o.discount_type as "discountType",o.discount_value::float as "discountValue",o.terms,o.active,
      o.venue_scope as "venueScope",
      case when o.venue_scope='single' then json_build_array(o.venue_id)
        when o.venue_scope='selected' then coalesce((select json_agg(ov.venue_id order by ov.venue_id)
          from business_offer_venues ov where ov.offer_id=o.id),'[]'::json)
        else '[]'::json end as "venueIds",
      o.approval_status as "approvalStatus",o.rejection_note as "rejectionNote",
      o.reviewed_at as "reviewedAt",u.email as "reviewedBy"
      from business_offers o left join users u on u.id=o.reviewed_by order by o.created_at desc`),
  ]);
  return {
    businesses: businesses.rows.map((business) => ({
      ...business,
      venues: venues.rows
        .filter((venue) => venue.businessId === business.id)
        .map((venue) => ({
          ...venue,
          offers: offers.rows.filter((offer) => offer.venueId === venue.id),
        })),
    })),
  };
});
