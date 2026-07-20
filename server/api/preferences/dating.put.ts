import { readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { boolean, objectBody, stringArray } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const body = objectBody(await readBody(event))
  const genders = stringArray(body.genders, 'Gender preferences', 10)
  const openToEveryone = boolean(body.openToEveryone, 'Open to everyone')
  const raceEthnicities = stringArray(body.raceEthnicities, 'Ethnicity preferences', 20)
  const noRaceEthnicityPreference = boolean(body.noRaceEthnicityPreference, 'No ethnicity preference')
  const { rows } = await db.query(`insert into match_preferences
    (user_id, interested_genders, open_to_everyone, preferred_ethnicities, no_ethnicity_preference)
    values ($1,$2,$3,$4,$5) on conflict (user_id) do update set
      interested_genders=excluded.interested_genders, open_to_everyone=excluded.open_to_everyone,
      preferred_ethnicities=excluded.preferred_ethnicities, no_ethnicity_preference=excluded.no_ethnicity_preference
    returning interested_genders as genders, open_to_everyone as "openToEveryone",
      preferred_ethnicities as "raceEthnicities", no_ethnicity_preference as "noRaceEthnicityPreference"`,
    [sub, genders, openToEveryone, raceEthnicities, noRaceEthnicityPreference])
  return rows[0]
})
