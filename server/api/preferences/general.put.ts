import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { boolean, integer, objectBody, stringArray, badRequest } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const distance = integer(body.distance, 'Maximum distance', 1, 500)
  const minimumAge = integer(body.minimumAge, 'Minimum age', 18, 100)
  const maximumAge = integer(body.maximumAge, 'Maximum age', 18, 100)
  if (minimumAge > maximumAge) badRequest('Minimum age cannot exceed maximum age')
  const timing = stringArray(body.timing, 'Timing', 10)
  const publicOnly = boolean(body.publicOnly, 'Public places only')
  const { rows } = await db.query(`insert into match_preferences
    (user_id, max_distance_km, minimum_age, maximum_age, timing, public_places_only)
    values ($1,$2,$3,$4,$5,$6)
    on conflict (user_id) do update set max_distance_km=excluded.max_distance_km,
      minimum_age=excluded.minimum_age, maximum_age=excluded.maximum_age,
      timing=excluded.timing, public_places_only=excluded.public_places_only
    returning max_distance_km as "distance", minimum_age as "minimumAge",
      maximum_age as "maximumAge", timing, public_places_only as "publicOnly"`,
    [sub, distance, minimumAge, maximumAge, timing, publicOnly])
  return rows[0]
})
