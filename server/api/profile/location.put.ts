import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { geocodePostcode } from '~/server/utils/geocodePostcode'
import { objectBody, text } from '~/server/utils/productValidation'
import { enforceRateLimit } from '~/server/utils/rate-limiting/rateLimit'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  await enforceRateLimit(`profile-location:${sub}`, 10, 60)
  const postcode = text(objectBody(await readBody(event)).postcode, 'Postcode', 16, true) as string
  if (!/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(postcode)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid UK postcode' })
  }
  const location = await geocodePostcode(postcode)
  const { rows } = await db.query(`with coordinates as (
      select $4::numeric as latitude,$5::numeric as longitude
    ) update profiles set postcode_area=$2,location_label=$3,
      latitude=coordinates.latitude,longitude=coordinates.longitude,
      location=extensions.ST_SetSRID(extensions.ST_MakePoint(
        coordinates.longitude::double precision,coordinates.latitude::double precision),4326)::extensions.geography
    from coordinates where user_id=$1
    returning postcode_area as "postcodeArea",location_label as label,true as "hasLocation"`,
    [sub, location.postcodeArea, location.label, location.latitude, location.longitude])
  if (!rows[0]) throw createError({ statusCode: 409, statusMessage: 'Save your profile basics before adding a location' })
  return rows[0]
})
