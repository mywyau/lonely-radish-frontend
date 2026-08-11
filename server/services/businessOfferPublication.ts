import { createError } from 'h3'
import type { DatabaseQueryable } from '../repositories/db'

export async function setBusinessOfferActive(
  database: DatabaseQueryable,
  input: { offerId: string; businessId: string; active: boolean },
): Promise<{ id: string; active: boolean }> {
  if (!input.active) {
    const result = await database.query<{ id: string; active: boolean }>(
      `update business_offers set active=false,updated_at=now()
        where id=$1 and business_id=$2 returning id,active`,
      [input.offerId, input.businessId],
    )
    if (!result.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Offer not found' })
    return result.rows[0]
  }

  const result = await database.query<{ id: string; active: boolean }>(
    `update business_offers offer set active=true,updated_at=now()
      where offer.id=$1 and offer.business_id=$2 and offer.approval_status='approved'
        and exists(select 1 from businesses business
          where business.id=offer.business_id and business.status='active')
        and exists(select 1 from business_venues venue
          where venue.business_id=offer.business_id and venue.status='active' and (
            offer.venue_scope='all'
            or (offer.venue_scope='single' and venue.id=offer.venue_id)
            or (offer.venue_scope='selected' and exists(select 1 from business_offer_venues selected
              where selected.offer_id=offer.id and selected.venue_id=venue.id))
          ))
      returning offer.id,offer.active`,
    [input.offerId, input.businessId],
  )
  if (result.rows[0]) return result.rows[0]

  const existing = await database.query<{ id: string }>(
    `select id from business_offers where id=$1 and business_id=$2`,
    [input.offerId, input.businessId],
  )
  if (!existing.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Offer not found' })
  throw createError({
    statusCode: 409,
    statusMessage: 'The business, offer, and at least one participating venue must be approved before publishing',
  })
}
