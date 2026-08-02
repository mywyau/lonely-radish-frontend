import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { objectBody, text } from '~/server/utils/productValidation'
import { isGenderIdentity } from '~/utils/genderIdentity'
import { isRaceEthnicity, raceEthnicitySelfDescriptionLimit, usesRaceEthnicitySelfDescription } from '~/utils/raceEthnicity'
import { sexualOrientationValues } from '~/utils/sexualOrientation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const displayName = text(body.displayName, 'Profile name', 80, true)!
  const raceEthnicity = text(body.raceEthnicity, 'Racial or ethnic identity', 100, true)!
  const sexualOrientation = text(body.sexualOrientation, 'Sexual orientation', 30, true)!
  const genderIdentity = text(body.genderIdentity, 'Gender identity', 20, true)!
  const pronouns = text(body.pronouns, 'Pronouns', 40)

  if (!isGenderIdentity(genderIdentity)) {
    throw createError({ statusCode: 400, statusMessage: 'Select a valid gender identity' })
  }

  if (!isRaceEthnicity(raceEthnicity)) {
    throw createError({ statusCode: 400, statusMessage: 'Select a valid racial or ethnic identity' })
  }
  const raceEthnicitySelfDescription = usesRaceEthnicitySelfDescription(raceEthnicity)
    ? text(body.raceEthnicitySelfDescription, 'Self-described racial or ethnic identity', raceEthnicitySelfDescriptionLimit, true)!
    : null
  if (!sexualOrientationValues.includes(sexualOrientation as typeof sexualOrientationValues[number])) {
    throw createError({ statusCode: 400, statusMessage: 'Select a valid sexual orientation' })
  }

  try {
    const { rows } = await db.query(`update profiles set display_name=$2,race_ethnicity=$3,
      sexual_orientation=$4,race_ethnicity_self_description=$5,gender_identity=$6,pronouns=$7,updated_at=now() where user_id=$1
      returning display_name as "displayName",slug,race_ethnicity as "raceEthnicity",
        race_ethnicity_self_description as "raceEthnicitySelfDescription",sexual_orientation as "sexualOrientation",
        gender_identity as "genderIdentity",pronouns`,
    [sub, displayName, raceEthnicity, sexualOrientation, raceEthnicitySelfDescription, genderIdentity, pronouns])
    if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Complete your profile first' })
    return rows[0]
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'That profile name is already in use' })
    }
    throw error
  }
})
