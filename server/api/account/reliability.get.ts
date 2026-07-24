import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select u.confirmed_no_show_count as "confirmedNoShows",
    u.discovery_restricted_until as "restrictedUntil",
    (select count(*)::int from date_outcome_responses r where r.user_id=u.id and r.outcome='happened') as "attendedDates",
    (select count(*)::int from date_no_show_cases c where c.accused_user_id=u.id and c.status='pending') as "pendingReports"
    from users u where u.id=$1`, [sub])
  return rows[0] || { confirmedNoShows: 0, restrictedUntil: null, attendedDates: 0, pendingReports: 0 }
})
