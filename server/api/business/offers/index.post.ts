import { createError, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { requireBusiness } from "~/server/utils/requireBusiness";
import {
  boolean,
  integer,
  objectBody,
  stringArray,
  text,
} from "~/server/utils/productValidation";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const venueScopes = new Set(["single", "selected", "all"]);
const managingRoles = new Set(["owner", "manager"]);

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event);
  if (!managingRoles.has(business.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Owner or manager access is required to create campaigns",
    });
  }
  await enforceRateLimit(
    `rl:business-offer-create:${business.id}:${business.userId}`,
    20,
    60 * 60,
  );
  const body = objectBody(await readBody(event));
  const venueScope =
    text(body.venueScope, "Location availability", 20) || "single";
  if (!venueScopes.has(venueScope)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Choose valid offer locations",
    });
  }
  let requestedVenueIds: string[] = [];
  if (venueScope === "single") {
    requestedVenueIds = [text(body.venueId, "Venue", 50, true)!];
  } else if (venueScope === "selected") {
    requestedVenueIds = stringArray(body.venueIds, "Venues", 500, 50);
    if (!requestedVenueIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: "Choose at least one venue",
      });
    }
  }
  if (requestedVenueIds.some((venueId) => !uuidPattern.test(venueId))) {
    throw createError({
      statusCode: 400,
      statusMessage: "Choose valid offer locations",
    });
  }
  const title = text(body.title, "Offer title", 120, true)!;
  const description = text(body.description, "Description", 500);
  const discountType = text(body.discountType, "Discount type", 20, true)!;
  const discountValue = Number(body.discountValue);
  const terms = text(body.terms, "Terms", 500);
  const active = body.active == null ? false : boolean(body.active, "Active");
  if (active) {
    throw createError({
      statusCode: 409,
      statusMessage: "Create the offer for review, then publish it after approval",
    });
  }
  const redemptionLimitTotal = body.redemptionLimitTotal == null || body.redemptionLimitTotal === ""
    ? null
    : integer(body.redemptionLimitTotal, "Total redemption limit", 1, 1000000);
  const redemptionLimitPerUser = body.redemptionLimitPerUser == null
    ? 1
    : integer(body.redemptionLimitPerUser, "Per-customer redemption limit", 1, 100);
  if (
    !["percentage", "fixed"].includes(discountType) ||
    !Number.isFinite(discountValue) ||
    discountValue <= 0 ||
    (discountType === "percentage" && discountValue > 100)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Enter a valid discount",
    });
  }
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [
      `business-offers:${business.id}`,
    ]);
    const plan = await client.query(
      `select plan from business_subscriptions where business_id=$1
      and subscription_status in ('active','trialing','past_due') order by updated_at desc limit 1`,
      [business.id],
    );
    const limit =
      plan.rows[0]?.plan === "featured"
        ? 10
        : plan.rows[0]?.plan === "standard"
          ? 5
          : 1;
    const count = await client.query(
      "select count(*)::int as count from business_offers where business_id=$1",
      [business.id],
    );
    if (count.rows[0].count >= limit) {
      throw createError({
        statusCode: 409,
        statusMessage: `Your current business plan allows ${limit} ${limit === 1 ? "offer" : "offers"}`,
      });
    }

    const venues = requestedVenueIds.length
      ? await client.query(
          `select id from business_venues
          where business_id=$1 and id=any($2::uuid[])`,
          [business.id, requestedVenueIds],
        )
      : await client.query(
          `select id from business_venues
          where business_id=$1 order by created_at,id limit 1`,
          [business.id],
        );
    const ownedVenueIds = new Set(venues.rows.map((row) => row.id as string));
    if (
      !venues.rows[0] ||
      requestedVenueIds.some((venueId) => !ownedVenueIds.has(venueId))
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Choose venues belonging to this business",
      });
    }
    const primaryVenueId = requestedVenueIds[0] || venues.rows[0].id;
    const { rows } = await client.query(
      `insert into business_offers(business_id,venue_id,venue_scope,title,description,
        discount_type,discount_value,terms,active,redemption_limit_total,redemption_limit_per_user)
      values($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10)
      returning id,title,description,discount_type as "discountType",discount_value::float as "discountValue",
        terms,active,approval_status as "approvalStatus",venue_scope as "venueScope",
        redemption_limit_total as "redemptionLimitTotal",
        redemption_limit_per_user as "redemptionLimitPerUser"`,
      [
        business.id,
        primaryVenueId,
        venueScope,
        title,
        description,
        discountType,
        discountValue,
        terms,
        redemptionLimitTotal,
        redemptionLimitPerUser,
      ],
    );

    if (venueScope !== "all") {
      await client.query(
        `insert into business_offer_venues(offer_id,business_id,venue_id)
        select $1,$2,selected.venue_id from unnest($3::uuid[]) as selected(venue_id)`,
        [rows[0].id, business.id, requestedVenueIds],
      );
    }
    await client.query("commit");
    return { offer: { ...rows[0], venueIds: requestedVenueIds }, limit };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});
