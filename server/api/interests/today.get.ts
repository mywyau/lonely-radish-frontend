import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const [daily, active] = await Promise.all([
    db.query(`select di.sender_day::text as date,p.slug as "profileSlug",p.display_name as "profileName"
      from daily_interests di join profiles p on p.user_id=di.recipient_id join users u on u.id=di.sender_id
      where di.sender_id=$1 and di.sender_day=(now() at time zone coalesce(u.timezone,'UTC'))::date`, [sub]),
    db.query(`select count(*)::int as count from matches where status='active'
      and (user_one_id=$1 or user_two_id=$1)`, [sub]),
  ])
  return { interests: daily.rows, activeMatchCount: active.rows[0]?.count || 0 }
})
