import { createError, readBody, setHeader } from "h3";
import { db } from "~/server/repositories/db";
import {
  parseOfferClaimCode,
  requireOfferClaimSecret,
} from "~/server/utils/offerClaimCode";
import { objectBody, text } from "~/server/utils/productValidation";
import { enforceRateLimit } from "~/server/utils/rate-limiting/rateLimit";
import { requireBusiness } from "~/server/utils/requireBusiness";
import { redeemOfferClaim } from "~/server/services/offerRedemption";
import type { OfferRedemptionResponse } from "~/types/api/offers";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event): Promise<OfferRedemptionResponse> => {
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
  const idempotencyKey = text(body.idempotencyKey, "Redemption attempt", 50, true)!;
  if (!uuidPattern.test(idempotencyKey)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid redemption attempt" });
  }
  const parsed = parseOfferClaimCode(code, requireOfferClaimSecret(event));
  if (!parsed)
    throw createError({
      statusCode: 400,
      statusMessage: "That redemption code is invalid or expired",
    });
  return redeemOfferClaim(db, {
    businessId: business.id,
    redeemerUserId: business.userId,
    venueId,
    codeDigest: parsed.codeDigest,
    idempotencyKey,
  });
});
