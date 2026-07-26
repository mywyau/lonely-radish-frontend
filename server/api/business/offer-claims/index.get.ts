import { createError, getQuery, setHeader } from "h3";
import { db } from "~/server/repositories/db";
import { requireBusiness } from "~/server/utils/requireBusiness";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store");
  const business = await requireBusiness(event);
  if (business.status !== "active") {
    throw createError({
      statusCode: 403,
      statusMessage: "Business approval is required before viewing redemptions",
    });
  }
  const requestedVenue = getQuery(event).venueId;
  const venueId = typeof requestedVenue === "string" ? requestedVenue : null;
  if (venueId && !uuidPattern.test(venueId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Choose a valid venue",
    });
  }
  const [summaryResult, redemptionResult] = await Promise.all([
    db.query(
      `select count(*)::int as total,
      count(*) filter(where c.redeemed_at>=now()-interval '30 days')::int as "last30Days"
      from business_offer_claims c join business_offers o on o.id=c.offer_id
      where o.business_id=$1 and ($2::uuid is null or coalesce(c.redeemed_venue_id,o.venue_id)=$2::uuid)
        and c.status='redeemed'`,
      [business.id, venueId],
    ),
    db.query(
      `select c.offer_title as "offerTitle",c.discount_type as "discountType",
      c.discount_value::float as "discountValue",coalesce(v.name,c.venue_name) as "venueName",
      coalesce(c.redeemed_venue_id,o.venue_id) as "venueId",c.redeemed_at as "redeemedAt"
      from business_offer_claims c join business_offers o on o.id=c.offer_id
      left join business_venues v on v.id=c.redeemed_venue_id
      where o.business_id=$1 and ($2::uuid is null or coalesce(c.redeemed_venue_id,o.venue_id)=$2::uuid)
        and c.status='redeemed' order by c.redeemed_at desc limit 50`,
      [business.id, venueId],
    ),
  ]);
  return {
    summary: summaryResult.rows[0] || { total: 0, last30Days: 0 },
    redemptions: redemptionResult.rows,
  };
});
