import { createError, readBody, setHeader } from "h3";
import { db } from "~/server/repositories/db";
import {
  parseOfferClaimCode,
  requireOfferClaimSecret,
} from "~/server/utils/offerClaimCode";
import { objectBody, text } from "~/server/utils/productValidation";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireBusiness } from "~/server/utils/requireBusiness";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store");
  const business = await requireBusiness(event);
  if (business.status !== "active") {
    throw createError({
      statusCode: 403,
      statusMessage: "Business approval is required before redeeming offers",
    });
  }
  await enforceRateLimit(
    `rl:offer-redeem:${business.id}:${business.userId}`,
    30,
    5 * 60,
  );
  const body = objectBody(await readBody(event));
  const venueId = text(body.venueId, "Venue", 50, true)!;
  if (!uuidPattern.test(venueId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Choose a valid venue",
    });
  }
  const code = text(body.code, "Redemption code", 100, true)!;
  const parsed = parseOfferClaimCode(code, requireOfferClaimSecret(event));
  if (!parsed)
    throw createError({
      statusCode: 400,
      statusMessage: "That redemption code is invalid or expired",
    });
  const client = await db.connect();
  try {
    await client.query("begin");
    const claimResult = await client.query(
      `select c.id,c.status,
      c.expires_at as "expiresAt",c.offer_title as "offerTitle",c.discount_type as "discountType",
      c.discount_value::float as "discountValue",c.terms,c.business_name as "businessName",
      v.name as "venueName",o.active,o.approval_status as "approvalStatus",o.starts_at as "startsAt",
      o.ends_at as "endsAt",v.status as "venueStatus"
      from business_offer_claims c join business_offers o on o.id=c.offer_id
      join business_venues v on v.id=$3 and v.business_id=o.business_id and v.status='active'
      where c.code_digest=$1 and o.business_id=$2 and (
        o.venue_scope='all' or
        (o.venue_scope='single' and o.venue_id=v.id) or
        (o.venue_scope='selected' and exists(select 1 from business_offer_venues ov
          where ov.offer_id=o.id and ov.venue_id=v.id))
      )
      for update of c`,
      [parsed.codeDigest, business.id, venueId],
    );
    const claim = claimResult.rows[0];
    if (!claim) {
      throw createError({
        statusCode: 400,
        statusMessage: "That code cannot be redeemed at this venue",
      });
    }
    if (claim.status === "redeemed") {
      throw createError({
        statusCode: 409,
        statusMessage: "This offer has already been redeemed",
      });
    }
    const now = Date.now();
    const eligible =
      claim.status === "issued" &&
      new Date(claim.expiresAt).getTime() > now &&
      claim.active === true &&
      claim.approvalStatus === "approved" &&
      claim.venueStatus === "active" &&
      (!claim.startsAt || new Date(claim.startsAt).getTime() <= now) &&
      (!claim.endsAt || new Date(claim.endsAt).getTime() > now);
    if (!eligible)
      throw createError({
        statusCode: 409,
        statusMessage: "That redemption code is invalid or expired",
      });
    const redeemed = await client.query(
      `update business_offer_claims set status='redeemed',redeemed_at=now(),
      redeemed_by_user_id=$2,redeemed_venue_id=$3,venue_name=$4 where id=$1 and status='issued'
      returning id,redeemed_at as "redeemedAt"`,
      [claim.id, business.userId, venueId, claim.venueName],
    );
    if (!redeemed.rows[0])
      throw createError({
        statusCode: 409,
        statusMessage: "This offer has already been redeemed",
      });
    await client.query("commit");
    return {
      redemption: {
        ...redeemed.rows[0],
        offerTitle: claim.offerTitle,
        discountType: claim.discountType,
        discountValue: claim.discountValue,
        terms: claim.terms,
        businessName: claim.businessName,
        venueName: claim.venueName,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});
