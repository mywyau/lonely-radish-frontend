import { randomUUID } from "node:crypto";
import { createError, getRouterParam, readBody, setHeader } from "h3";
import { db } from "~/server/repositories/db";
import {
  createOfferClaimCode,
  offerClaimCodeDigest,
  requireOfferClaimSecret,
} from "~/server/utils/offerClaimCode";
import { objectBody, text } from "~/server/utils/productValidation";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requirePersonalUser } from "~/server/utils/requirePersonalUser";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store");
  const { sub } = await requirePersonalUser(event);
  const offerId = getRouterParam(event, "id") || "";
  if (!uuidPattern.test(offerId))
    throw createError({ statusCode: 400, statusMessage: "Invalid offer" });
  const body = objectBody(await readBody(event));
  const proposalId = text(body.proposalId, "Confirmed date", 80);
  if (proposalId && !uuidPattern.test(proposalId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid confirmed date",
    });
  }
  await enforceRateLimit(`rl:offer-claim:${sub}`, 10, 60 * 60);
  const secret = requireOfferClaimSecret(event);
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      `offer-claim:${offerId}:${sub}`,
    ]);
    const offerResult = await client.query(
      `select o.id,o.title,o.discount_type as "discountType",
      o.discount_value::float as "discountValue",o.terms,b.name as "businessName",
      case when locations."venueCount"=1 then locations."firstVenueName"
        else concat(locations."venueCount",' participating locations') end as "venueName",
      least(now()+interval '15 minutes',coalesce(o.ends_at,now()+interval '15 minutes')) as "expiresAt"
      from business_offers o join businesses b on b.id=o.business_id
      join lateral (
        select count(*)::int as "venueCount",min(v.name) as "firstVenueName"
        from business_venues v
        where v.business_id=o.business_id and v.status='active' and (
          o.venue_scope='all' or
          (o.venue_scope='single' and v.id=o.venue_id) or
          (o.venue_scope='selected' and exists(select 1 from business_offer_venues ov
            where ov.offer_id=o.id and ov.venue_id=v.id))
        )
      ) locations on locations."venueCount">0
      where o.id=$1 and o.approval_status='approved' and o.active=true
        and b.status='active'
        and (o.starts_at is null or o.starts_at<=now())
        and (o.ends_at is null or o.ends_at>now())`,
      [offerId],
    );
    const offer = offerResult.rows[0];
    if (!offer)
      throw createError({
        statusCode: 404,
        statusMessage: "This offer is no longer available",
      });
    if (proposalId) {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [
        `date-offer:${proposalId}:${sub}`,
      ]);
      const proposal = await client.query(
        `select 1 from date_proposals where id=$1 and status='accepted'
        and selected_time_id is not null and ($2=inviter_id or $2=invitee_id)`,
        [proposalId, sub],
      );
      if (!proposal.rows[0])
        throw createError({
          statusCode: 400,
          statusMessage: "Choose one of your confirmed dates",
        });
      await client.query(
        `update business_offer_claims set proposal_id=null
        where proposal_id=$1 and claimant_user_id=$2 and offer_id<>$3`,
        [proposalId, sub, offerId],
      );
    }
    const existingResult = await client.query(
      `select id,status,token_version as "tokenVersion"
      from business_offer_claims where offer_id=$1 and claimant_user_id=$2 for update`,
      [offerId, sub],
    );
    const existing = existingResult.rows[0];
    if (existing?.status === "redeemed") {
      throw createError({
        statusCode: 409,
        statusMessage: "You have already used this offer",
      });
    }
    if (existing?.status === "revoked") {
      throw createError({
        statusCode: 409,
        statusMessage: "This claim is no longer available",
      });
    }
    let claimResult;
    let code: string;
    if (existing) {
      claimResult = await client.query(
        `update business_offer_claims set proposal_id=$2,token_version=token_version+1,
          status='issued',offer_title=$3,discount_type=$4,discount_value=$5,terms=$6,business_name=$7,
          venue_name=$8,claimed_at=now(),expires_at=$9,redeemed_at=null,redeemed_by_user_id=null,
          redeemed_venue_id=null
          where id=$1 returning id,offer_id as "offerId",token_version as "tokenVersion",status,
          claimed_at as "claimedAt",expires_at as "expiresAt",offer_title as "offerTitle",
          discount_type as "discountType",discount_value::float as "discountValue",terms,
          business_name as "businessName",venue_name as "venueName"`,
        [
          existing.id,
          proposalId,
          offer.title,
          offer.discountType,
          offer.discountValue,
          offer.terms,
          offer.businessName,
          offer.venueName,
          offer.expiresAt,
        ],
      );
      code = createOfferClaimCode(
        claimResult.rows[0].id,
        claimResult.rows[0].tokenVersion,
        secret,
      );
      await client.query(
        "update business_offer_claims set code_digest=$2 where id=$1",
        [claimResult.rows[0].id, offerClaimCodeDigest(code, secret)],
      );
    } else {
      const claimId = randomUUID();
      code = createOfferClaimCode(claimId, 1, secret);
      claimResult = await client.query(
        `insert into business_offer_claims(id,offer_id,claimant_user_id,proposal_id,code_digest,offer_title,
          discount_type,discount_value,terms,business_name,venue_name,expires_at)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          returning id,offer_id as "offerId",token_version as "tokenVersion",status,
          claimed_at as "claimedAt",expires_at as "expiresAt",offer_title as "offerTitle",
          discount_type as "discountType",discount_value::float as "discountValue",terms,
          business_name as "businessName",venue_name as "venueName"`,
        [
          claimId,
          offerId,
          sub,
          proposalId,
          offerClaimCodeDigest(code, secret),
          offer.title,
          offer.discountType,
          offer.discountValue,
          offer.terms,
          offer.businessName,
          offer.venueName,
          offer.expiresAt,
        ],
      );
    }
    const claim = claimResult.rows[0];
    await client.query("commit");
    return {
      claim: {
        ...claim,
        proposalId: proposalId || null,
        code,
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});
