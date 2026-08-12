import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { transitionOfferSubmission } from '~/server/services/businessSubmissionLifecycle'
import { requireBusiness } from '~/server/utils/requireBusiness'

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event)
  if (!['owner', 'manager'].includes(business.role)) throw createError({ statusCode: 403,
    statusMessage: 'Owner or manager access is required to archive offers' })
  const offerId = getRouterParam(event, 'id')
  if (!offerId) throw createError({ statusCode: 400, statusMessage: 'Invalid offer' })
  return transitionOfferSubmission(db, { businessId: business.id, offerId,
    actorId: business.userId, action: 'archive' })
})
