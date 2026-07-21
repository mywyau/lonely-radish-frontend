import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const { rowCount } = await db.query(`update notifications set read_at=now()
    where id=$1 and recipient_id=$2 and read_at is null`, [id,sub])
  if (!rowCount) throw createError({ statusCode: 404, statusMessage: 'Notification not found' })
  return { read: true }
})
