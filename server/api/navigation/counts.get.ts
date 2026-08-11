import { setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { matches, notifications } = await withDatabaseClient(async (database) => {
    const matches = await database.query(`select count(*)::int as count from matches
      where status in ('active','queued') and (user_one_id=$1 or user_two_id=$1)`, [sub])
    const notifications = await database.query(`select count(*)::int as count from notifications
      where recipient_id=$1 and read_at is null`, [sub])
    return { matches, notifications }
  })
  return { matchCount: matches.rows[0]?.count || 0,
    unreadNotificationCount: notifications.rows[0]?.count || 0 }
})
