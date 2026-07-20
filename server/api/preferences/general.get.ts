import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select max_distance_km as "distance", minimum_age as "minimumAge",
    maximum_age as "maximumAge", timing, public_places_only as "publicOnly"
    from match_preferences where user_id = $1`, [sub])
  return rows[0] ?? { distance: 10, minimumAge: 18, maximumAge: 80, timing: [], publicOnly: true }
})
