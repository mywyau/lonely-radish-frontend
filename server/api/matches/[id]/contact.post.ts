import { createError } from 'h3'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  throw createError({
    statusCode: 410,
    statusMessage: 'This connection is closed. Only the person who ended it can send one note and ask to reconnect',
  })
})
