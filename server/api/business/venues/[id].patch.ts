import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { updateVenueSubmission } from '~/server/services/businessSubmissionLifecycle'
import { parseVenueSubmission } from '~/server/services/businessSubmissionValidation'
import { objectBody } from '~/server/utils/productValidation'
import { enforceRateLimit } from '~/server/utils/rate-limiting/rateLimit'
import { requireBusiness } from '~/server/utils/requireBusiness'

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event)
  if (!['owner', 'manager'].includes(business.role)) throw createError({ statusCode: 403,
    statusMessage: 'Owner or manager access is required to edit venues' })
  const venueId = getRouterParam(event, 'id')
  if (!venueId) throw createError({ statusCode: 400, statusMessage: 'Invalid venue' })
  await enforceRateLimit(`rl:business-venue-edit:${business.id}:${business.userId}`, 30, 60 * 60)
  return updateVenueSubmission(db, { businessId: business.id, venueId, actorId: business.userId,
    submission: parseVenueSubmission(objectBody(await readBody(event))) })
})
