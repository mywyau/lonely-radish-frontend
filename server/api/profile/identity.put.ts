import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'
import { sexualOrientationValues } from '~/utils/sexualOrientation'

const options = new Set(['Asian', 'Black / African / Caribbean', 'Hispanic / Latino', 'Middle Eastern', 'North African', 'Native / Indigenous', 'Pacific Islander', 'White', 'Multiracial / multi-ethnic', 'Prefer not to say'])

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const raceEthnicity = text(body.raceEthnicity, 'Racial or ethnic identity', 100, true)!
  if (!options.has(raceEthnicity)) throw createError({ statusCode: 400, statusMessage: 'Select a valid racial or ethnic identity' })
  const sexualOrientation = text(body.sexualOrientation, 'Sexual orientation', 30, true)!
  if (!sexualOrientationValues.includes(sexualOrientation as typeof sexualOrientationValues[number])) {
    throw createError({ statusCode: 400, statusMessage: 'Select a valid sexual orientation' })
  }
  const { rows } = await db.query(`update profiles set race_ethnicity=$2,sexual_orientation=$3,updated_at=now() where user_id=$1
    returning race_ethnicity as "raceEthnicity",sexual_orientation as "sexualOrientation"`, [sub, raceEthnicity, sexualOrientation])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Complete your profile first' })
  return rows[0]
})
