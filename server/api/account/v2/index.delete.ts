import { assertMethod, createError, readBody, setResponseStatus } from 'h3'
import { useAuthSession } from '~/server/utils/authSession'
import { queueAccountDeletion } from '~/server/services/accountDeletion'

type DeleteBody = { confirm?: string }

export default defineEventHandler(async (event) => {
  assertMethod(event, 'DELETE')
  const session = await useAuthSession(event)
  const userId = session.data.user?.sub
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })

  const body = await readBody<DeleteBody>(event)
  if (body?.confirm?.trim().toLowerCase() !== 'delete') {
    throw createError({ statusCode: 400, statusMessage: 'Confirmation text did not match' })
  }

  const result = await queueAccountDeletion(userId, {
    source: 'self',
    requestedBy: userId,
  })

  await session.clear()
  setResponseStatus(event, 202)
  return result
})
