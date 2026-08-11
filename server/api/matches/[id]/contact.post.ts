import { createError } from 'h3'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  throw createError({
    statusCode: 410,
    statusMessage: 'Past-connection messages are no longer available. Only the person who ended the match can send an apology and ask to reconnect',
  })
})
