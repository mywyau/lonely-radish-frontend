import { readBody } from 'h3'
import { interestService } from '~/server/services/interests/InterestService'
import { requestIdempotencyKey } from '~/server/utils/idempotency'
import { objectBody, text } from '~/server/utils/productValidation'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const profileSlug = text(
    objectBody(await readBody(event)).profileSlug,
    'Profile',
    80,
    true,
  )
  return interestService.sendInterest({
    senderId: sub,
    profileSlug,
    idempotencyKey: requestIdempotencyKey(event),
  })
})
