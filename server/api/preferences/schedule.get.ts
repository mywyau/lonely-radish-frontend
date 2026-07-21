import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const [schedule, preferences] = await Promise.all([
    db.query(`select weekday,start_time::text as "startTime",end_time::text as "endTime"
      from availability where user_id=$1 and weekday is not null order by weekday`, [sub]),
    db.query(`select public_places_only as "publicOnly",
      availability_visible_before_match as "availabilityVisibleBeforeMatch"
      from match_preferences where user_id=$1`, [sub]),
  ])
  return { windows: schedule.rows, publicOnly: preferences.rows[0]?.publicOnly ?? true,
    availabilityVisibleBeforeMatch: preferences.rows[0]?.availabilityVisibleBeforeMatch ?? false }
})
