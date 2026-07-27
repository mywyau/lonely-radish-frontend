import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { boolean, objectBody, stringArray } from '~/server/utils/productValidation'
import { sexualOrientationValues } from '~/utils/sexualOrientation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const genders = stringArray(body.genders, 'Gender preferences', 10)
    .map(gender => gender === 'Non-binary people' ? 'Non-binary' : gender)
  if (genders.some(gender => !['Women', 'Men', 'Non-binary'].includes(gender))) {
    throw createError({ statusCode: 400, statusMessage: 'Select valid gender preferences' })
  }
  const openToEveryone = boolean(body.openToEveryone, 'Open to everyone')
  const orientations = stringArray(body.orientations, 'Sexual orientation preferences', sexualOrientationValues.length)
  if (orientations.some(orientation => !sexualOrientationValues.includes(orientation as typeof sexualOrientationValues[number]))) {
    throw createError({ statusCode: 400, statusMessage: 'Select valid sexual orientation preferences' })
  }
  if (!orientations.length) throw createError({ statusCode: 400, statusMessage: 'Choose at least one sexual orientation you are open to dating' })
  const noOrientationPreference = false
  const raceEthnicities = stringArray(body.raceEthnicities, 'Ethnicity preferences', 20)
  const allowedRaceEthnicities = ['Asian', 'Black / African / Caribbean', 'Hispanic / Latino', 'Middle Eastern', 'North African', 'Native / Indigenous', 'Pacific Islander', 'White', 'Multiracial / multi-ethnic']
  if (raceEthnicities.some(identity => !allowedRaceEthnicities.includes(identity))) {
    throw createError({ statusCode: 400, statusMessage: 'Select valid racial or ethnic preferences' })
  }
  const noRaceEthnicityPreference = boolean(body.noRaceEthnicityPreference, 'No ethnicity preference')
  const { rows } = await db.query(`insert into match_preferences
    (user_id, interested_genders, open_to_everyone, interested_orientations, no_orientation_preference,
      preferred_ethnicities, no_ethnicity_preference, dating_preferences_set)
    values ($1,$2,$3,$4,$5,$6,$7,true) on conflict (user_id) do update set
      interested_genders=excluded.interested_genders, open_to_everyone=excluded.open_to_everyone,
      interested_orientations=excluded.interested_orientations, no_orientation_preference=excluded.no_orientation_preference,
      preferred_ethnicities=excluded.preferred_ethnicities, no_ethnicity_preference=excluded.no_ethnicity_preference,
      dating_preferences_set=true
    returning interested_genders as genders, open_to_everyone as "openToEveryone",
      interested_orientations as orientations, no_orientation_preference as "noOrientationPreference",
      preferred_ethnicities as "raceEthnicities", no_ethnicity_preference as "noRaceEthnicityPreference"`,
    [sub, genders, openToEveryone, orientations, noOrientationPreference, raceEthnicities, noRaceEthnicityPreference])
  return rows[0]
})
