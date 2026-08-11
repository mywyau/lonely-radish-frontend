import { setHeader } from 'h3'
import { withDatabaseClient } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { schedule, preferences } = await withDatabaseClient(async (database) => {
    const schedule = await database.query(`select weekday,start_time::text as "startTime",end_time::text as "endTime"
      from availability where user_id=$1 and weekday is not null order by weekday`, [sub])
    const preferences = await database.query(`select public_places_only as "publicOnly",
      availability_visible_before_match as "availabilityVisibleBeforeMatch"
      from match_preferences where user_id=$1`, [sub])
    return { schedule, preferences }
  })
  return { windows: schedule.rows, publicOnly: preferences.rows[0]?.publicOnly ?? true,
    availabilityVisibleBeforeMatch: preferences.rows[0]?.availabilityVisibleBeforeMatch ?? false }
})
