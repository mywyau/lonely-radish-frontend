import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { updateOfferSubmission } from '~/server/services/businessSubmissionLifecycle'
import { parseOfferSubmission } from '~/server/services/businessSubmissionValidation'
import { objectBody } from '~/server/utils/productValidation'
import { enforceRateLimit } from '~/server/utils/rate-limiting/rateLimit'
import { requireBusiness } from '~/server/utils/requireBusiness'

export default defineEventHandler(async (event) => {
  const business = await requireBusiness(event)
  if (!['owner', 'manager'].includes(business.role)) throw createError({ statusCode: 403,
    statusMessage: 'Owner or manager access is required to edit offers' })
  const offerId = getRouterParam(event, 'id')
  if (!offerId) throw createError({ statusCode: 400, statusMessage: 'Invalid offer' })
  await enforceRateLimit(`rl:business-offer-edit:${business.id}:${business.userId}`, 30, 60 * 60)
  return updateOfferSubmission(db, { businessId: business.id, offerId, actorId: business.userId,
    submission: parseOfferSubmission(objectBody(await readBody(event))) })
})
