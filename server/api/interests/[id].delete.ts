import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const result = await db.query(`update daily_interests set declined_at=now()
    where id=$1 and recipient_id=$2 and declined_at is null returning id`, [id,sub])
  if (!result.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Received interest not found' })
  return { declined: true }
})
