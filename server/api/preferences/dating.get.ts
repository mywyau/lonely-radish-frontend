import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { groupSexualOrientationPreferences } from '~/utils/sexualOrientation'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select interested_genders as genders,
    interested_orientations as orientations, no_orientation_preference as "noOrientationPreference",
    open_to_everyone as "openToEveryone", preferred_ethnicities as "raceEthnicities",
    no_ethnicity_preference as "noRaceEthnicityPreference"
    from match_preferences where user_id=$1`, [sub])
  const preferences = rows[0]
  if (!preferences) return { genders: [], orientations: [], noOrientationPreference: true,
    openToEveryone: true, raceEthnicities: [], noRaceEthnicityPreference: true }
  return { ...preferences, orientations: groupSexualOrientationPreferences(preferences.orientations || []) }
})
