import { createError, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { useAuthSession } from '~/server/utils/authSession'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await useAuthSession(event)
  const userId = session.data.user?.sub
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  const { rows } = await db.query(`select account_status as status,
    moderation_suspended_until as "suspendedUntil",moderation_updated_at as "updatedAt"
    from users where id=$1`, [userId])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  return rows[0]
})
