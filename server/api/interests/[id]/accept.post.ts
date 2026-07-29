import { createError, getRouterParam } from 'h3'
import { matchService } from '~/server/services/matches/MatchService'
import { requestIdempotencyKey } from '~/server/utils/idempotency'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const interestId = getRouterParam(event, 'id')
  if (!interestId) {
    throw createError({ statusCode: 400, statusMessage: 'Interest id is required' })
  }
  return matchService.acceptInterest({
    recipientId: sub,
    interestId,
    idempotencyKey: requestIdempotencyKey(event),
  })
})
