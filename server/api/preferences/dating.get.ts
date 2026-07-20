import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select interested_genders as genders,
    open_to_everyone as "openToEveryone", preferred_ethnicities as "raceEthnicities",
    no_ethnicity_preference as "noRaceEthnicityPreference"
    from match_preferences where user_id=$1`, [sub])
  return rows[0] ?? { genders: [], openToEveryone: true, raceEthnicities: [], noRaceEthnicityPreference: true }
})
