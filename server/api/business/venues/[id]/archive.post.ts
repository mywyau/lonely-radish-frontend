import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { transitionVenueSubmission } from '~/server/services/businessSubmissionLifecycle'
import { requireBusiness } from '~/server/utils/requireBusiness'

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event)
  if (!['owner', 'manager'].includes(business.role)) throw createError({ statusCode: 403,
    statusMessage: 'Owner or manager access is required to archive venues' })
  const venueId = getRouterParam(event, 'id')
  if (!venueId) throw createError({ statusCode: 400, statusMessage: 'Invalid venue' })
  return transitionVenueSubmission(db, { businessId: business.id, venueId,
    actorId: business.userId, action: 'archive' })
})
