import { createError } from 'h3'
import { integer, stringArray, text } from '../utils/productValidation'
import type { BusinessOfferSubmissionRequest, BusinessVenueSubmissionRequest } from '../../types/api/businessSubmissions'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const venueScopes = new Set(['single', 'selected', 'all'])
const venueCategories = new Set(['cafe', 'restaurant', 'bar', 'activity', 'culture', 'wellness', 'other'])

export function parseVenueSubmission(body: Record<string, unknown>): BusinessVenueSubmissionRequest {
  const result = {
    name: text(body.name, 'Venue name', 120, true),
    category: text(body.category, 'Venue category', 30, true),
    addressLine: text(body.addressLine, 'Venue address', 200, true),
    city: text(body.city, 'City', 100, true),
    postcode: text(body.postcode, 'Postcode', 16, true).toUpperCase(),
  }
  if (result.name.length < 2) throw createError({ statusCode: 400, statusMessage: 'Venue name must be at least 2 characters' })
  if (!venueCategories.has(result.category)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid venue category' })
  return result
}

export function parseOfferSubmission(body: Record<string, unknown>): BusinessOfferSubmissionRequest {
  const venueScope = text(body.venueScope, 'Location availability', 20) || 'single'
  if (!venueScopes.has(venueScope)) throw createError({ statusCode: 400, statusMessage: 'Choose valid offer locations' })
  let venueIds: string[] = []
  if (venueScope === 'single') venueIds = [text(body.venueId, 'Venue', 50, true)]
  if (venueScope === 'selected') {
    venueIds = stringArray(body.venueIds, 'Venues', 500, 50)
    if (!venueIds.length) throw createError({ statusCode: 400, statusMessage: 'Choose at least one venue' })
  }
  if (venueIds.some(id => !uuidPattern.test(id))) throw createError({ statusCode: 400, statusMessage: 'Choose valid offer locations' })
  const discountType = text(body.discountType, 'Discount type', 20, true)
  const discountValue = Number(body.discountValue)
  if (!['percentage', 'fixed'].includes(discountType) || !Number.isFinite(discountValue)
    || discountValue <= 0 || (discountType === 'percentage' && discountValue > 100)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid discount' })
  }
  return {
    venueScope: venueScope as BusinessOfferSubmissionRequest['venueScope'],
    ...(venueScope === 'single' ? { venueId: venueIds[0] } : {}),
    ...(venueScope === 'selected' ? { venueIds } : {}),
    title: text(body.title, 'Offer title', 120, true),
    description: text(body.description, 'Description', 500),
    discountType: discountType as BusinessOfferSubmissionRequest['discountType'],
    discountValue,
    terms: text(body.terms, 'Terms', 500),
    redemptionLimitTotal: body.redemptionLimitTotal == null || body.redemptionLimitTotal === ''
      ? null : integer(body.redemptionLimitTotal, 'Total redemption limit', 1, 1000000),
    redemptionLimitPerUser: body.redemptionLimitPerUser == null
      ? 1 : integer(body.redemptionLimitPerUser, 'Per-customer redemption limit', 1, 100),
  }
}
