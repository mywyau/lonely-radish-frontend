import { setHeader } from "h3";
import { db } from "~/server/repositories/db";
import {
  createOfferClaimCode,
  requireOfferClaimSecret,
} from "~/server/utils/offerClaimCode";
import { requirePersonalUser } from "~/server/utils/requirePersonalUser";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store");
  const { sub } = await requirePersonalUser(event);
  const secret = requireOfferClaimSecret(event);
  const { rows } = await db.query(
    `select id,offer_id as "offerId",claimant_user_id as "claimantUserId",
    proposal_id as "proposalId",token_version as "tokenVersion",
    case when status='issued' and expires_at<=now() then 'expired' else status end as status,
    claimed_at as "claimedAt",expires_at as "expiresAt",redeemed_at as "redeemedAt",
    offer_title as "offerTitle",discount_type as "discountType",discount_value::float as "discountValue",
    terms,business_name as "businessName",venue_name as "venueName"
    from business_offer_claims claim where claimant_user_id=$1 or exists(
      select 1 from date_proposals proposal where proposal.id=claim.proposal_id
        and proposal.status='accepted' and ($1=proposal.inviter_id or $1=proposal.invitee_id)
    ) order by claimed_at desc limit 100`,
    [sub],
  );
  return {
    claims: rows.map(({ claimantUserId, ...claim }) => ({
      ...claim,
      code:
        claimantUserId === sub && claim.status === "issued"
          ? createOfferClaimCode(claim.id, claim.tokenVersion, secret)
          : null,
    })),
  };
});
