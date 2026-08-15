import { createError } from 'h3'
import type { Database } from '../repositories/db'
import type { OfferRedemptionResponse } from '../../types/api/offers'

type RedemptionClaim = {
  id: string
  offerId: string
  claimantUserId: string
  status: 'issued' | 'redeemed' | 'revoked'
  expiresAt: string
  offerTitle: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  terms: string | null
  businessName: string
  businessStatus: 'draft' | 'pending' | 'active' | 'paused' | 'suspended'
  venueName: string
  active: boolean
  approvalStatus: 'pending' | 'approved' | 'rejected'
  startsAt: string | null
  endsAt: string | null
  venueStatus: 'pending' | 'active' | 'paused'
  redemptionLimitTotal: number | null
  redemptionLimitPerUser: number
  redemptionIdempotencyKey: string | null
  redeemedAt: string | null
}

function responseFor(
  claim: RedemptionClaim,
  redeemed: { id: string; redeemedAt: string },
  idempotentReplay: boolean,
): OfferRedemptionResponse {
  return {
    redemption: {
      id: redeemed.id,
      redeemedAt: new Date(redeemed.redeemedAt).toISOString(),
      offerTitle: claim.offerTitle,
      discountType: claim.discountType,
      discountValue: claim.discountValue,
      terms: claim.terms,
      businessName: claim.businessName,
      venueName: claim.venueName,
      idempotentReplay,
    },
  }
}

export async function redeemOfferClaim(
  database: Database,
  input: {
    businessId: string
    redeemerUserId: string
    venueId: string
    codeDigest: Buffer
    idempotencyKey: string
  },
): Promise<OfferRedemptionResponse> {
  const client = await database.connect()
  try {
    await client.query('begin')
    const claimResult = await client.query<RedemptionClaim>(
      `select c.id,c.offer_id as "offerId",c.claimant_user_id as "claimantUserId",c.status,
        c.expires_at as "expiresAt",c.offer_title as "offerTitle",c.discount_type as "discountType",
        c.discount_value::float as "discountValue",c.terms,c.business_name as "businessName",
        business.status as "businessStatus",
        v.name as "venueName",o.active,o.approval_status as "approvalStatus",o.starts_at as "startsAt",
        o.ends_at as "endsAt",v.status as "venueStatus",
        o.redemption_limit_total as "redemptionLimitTotal",
        o.redemption_limit_per_user as "redemptionLimitPerUser",
        c.redemption_idempotency_key::text as "redemptionIdempotencyKey",c.redeemed_at as "redeemedAt"
      from business_offer_claims c join business_offers o on o.id=c.offer_id
      join businesses business on business.id=o.business_id
      join business_venues v on v.id=$3 and v.business_id=o.business_id
      where c.code_digest=$1 and o.business_id=$2 and (
        o.venue_scope='all' or
        (o.venue_scope='single' and o.venue_id=v.id) or
        (o.venue_scope='selected' and exists(select 1 from business_offer_venues ov
          where ov.offer_id=o.id and ov.venue_id=v.id))
      ) for update of c,o,business`,
      [input.codeDigest, input.businessId, input.venueId],
    )
    const claim = claimResult.rows[0]
    if (!claim) throw createError({ statusCode: 400, statusMessage: 'That code cannot be redeemed at this venue' })

    if (claim.status === 'redeemed') {
      if (claim.redemptionIdempotencyKey === input.idempotencyKey && claim.redeemedAt) {
        await client.query('commit')
        return responseFor(claim, { id: claim.id, redeemedAt: claim.redeemedAt }, true)
      }
      throw createError({ statusCode: 409, statusMessage: 'This offer has already been redeemed' })
    }

    const now = Date.now()
    const eligible = claim.status === 'issued' && new Date(claim.expiresAt).getTime() > now
      && claim.businessStatus === 'active' && claim.active === true
      && claim.approvalStatus === 'approved' && claim.venueStatus === 'active'
      && (!claim.startsAt || new Date(claim.startsAt).getTime() <= now)
      && (!claim.endsAt || new Date(claim.endsAt).getTime() > now)
    if (!eligible) throw createError({ statusCode: 409, statusMessage: 'That redemption code is invalid or expired' })

    const usage = await client.query<{ total: number; userTotal: number }>(
      `select count(*)::int as total,
        count(*) filter(where claimant_user_id=$2)::int as "userTotal"
      from business_offer_claims where offer_id=$1 and status='redeemed'`,
      [claim.offerId, claim.claimantUserId],
    )
    const totals = usage.rows[0] || { total: 0, userTotal: 0 }
    if (claim.redemptionLimitTotal !== null && totals.total >= claim.redemptionLimitTotal) {
      throw createError({ statusCode: 409, statusMessage: 'This offer has reached its redemption limit' })
    }
    if (totals.userTotal >= claim.redemptionLimitPerUser) {
      throw createError({ statusCode: 409, statusMessage: 'This customer has reached the limit for this offer' })
    }

    const redeemed = await client.query<{ id: string; redeemedAt: string }>(
      `update business_offer_claims set status='redeemed',redeemed_at=now(),
        redeemed_by_user_id=$2,redeemed_venue_id=$3,venue_name=$4,redemption_idempotency_key=$5
      where id=$1 and status='issued' returning id,redeemed_at as "redeemedAt"`,
      [claim.id, input.redeemerUserId, input.venueId, claim.venueName, input.idempotencyKey],
    )
    if (!redeemed.rows[0]) throw createError({ statusCode: 409, statusMessage: 'This offer has already been redeemed' })
    await client.query('commit')
    return responseFor(claim, redeemed.rows[0], false)
  } catch (error) {
    try { await client.query('rollback') } catch { /* Preserve the original error. */ }
    const databaseError = error as { code?: string; constraint?: string }
    if (databaseError.code === '23505'
      && databaseError.constraint === 'business_offer_claims_redemption_idempotency_uidx') {
      throw createError({ statusCode: 409, statusMessage: 'This redemption attempt has already been used' })
    }
    throw error
  } finally {
    client.release()
  }
}
