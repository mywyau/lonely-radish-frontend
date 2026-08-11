import { getQuery, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { listNotifications } from '~/server/repositories/notifications'
import { requireUser } from '~/server/utils/requireUser'
import { decodeCursor } from '~/server/utils/cursorPagination'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const includeRead = getQuery(event).includeRead === 'true'
  const cursor = decodeCursor(getQuery(event).cursor)
  return listNotifications(db, sub, { includeRead, cursor })
})
