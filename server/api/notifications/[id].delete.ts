import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const result = await db.query('delete from notifications where id=$1 and recipient_id=$2', [id,sub])
  if (!result.rowCount) throw createError({ statusCode: 404, statusMessage: 'Notification not found' })
  return { deleted: true }
})
