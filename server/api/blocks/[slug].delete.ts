import { createError, getRouterParam } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug')
  const result = await db.query(`delete from blocks b using profiles p
    where b.blocker_id=$1 and b.blocked_id=p.user_id and p.slug=$2
    returning b.blocked_id`, [sub,slug])
  if (!result.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Blocked user not found' })
  return { unblocked: true }
})
