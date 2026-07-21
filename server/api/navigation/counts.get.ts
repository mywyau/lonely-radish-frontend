import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const [matches, notifications] = await Promise.all([
    db.query(`select count(*)::int as count from matches
      where status='active' and (user_one_id=$1 or user_two_id=$1)`, [sub]),
    db.query(`select count(*)::int as count from notifications
      where recipient_id=$1 and read_at is null`, [sub]),
  ])
  return { matchCount: matches.rows[0]?.count || 0,
    unreadNotificationCount: notifications.rows[0]?.count || 0 }
})
