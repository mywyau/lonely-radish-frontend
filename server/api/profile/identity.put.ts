import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'
import { isRaceEthnicity, raceEthnicitySelfDescriptionLimit, usesRaceEthnicitySelfDescription } from '~/utils/raceEthnicity'
import { sexualOrientationValues } from '~/utils/sexualOrientation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const raceEthnicity = text(body.raceEthnicity, 'Racial or ethnic identity', 100, true)!
  if (!isRaceEthnicity(raceEthnicity)) throw createError({ statusCode: 400, statusMessage: 'Select a valid racial or ethnic identity' })
  const raceEthnicitySelfDescription = usesRaceEthnicitySelfDescription(raceEthnicity)
    ? text(body.raceEthnicitySelfDescription, 'Self-described racial or ethnic identity', raceEthnicitySelfDescriptionLimit, true)!
    : null
  const sexualOrientation = text(body.sexualOrientation, 'Sexual orientation', 30, true)!
  if (!sexualOrientationValues.includes(sexualOrientation as typeof sexualOrientationValues[number])) {
    throw createError({ statusCode: 400, statusMessage: 'Select a valid sexual orientation' })
  }
  const { rows } = await db.query(`update profiles set race_ethnicity=$2,sexual_orientation=$3,
    race_ethnicity_self_description=$4,updated_at=now() where user_id=$1
    returning race_ethnicity as "raceEthnicity",race_ethnicity_self_description as "raceEthnicitySelfDescription",
      sexual_orientation as "sexualOrientation"`, [sub, raceEthnicity, sexualOrientation, raceEthnicitySelfDescription])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Complete your profile first' })
  return rows[0]
})
