import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select
    (p.user_id is not null and nullif(trim(p.display_name),'') is not null and p.date_of_birth is not null
      and nullif(trim(p.bio),'') is not null and p.gender_identity is not null and p.race_ethnicity is not null) as "profileBasics",
    exists(select 1 from profile_photos pp where pp.user_id=$1) as photos,
    exists(select 1 from profile_activities pa where pa.user_id=$1) as activities,
    (p.location is not null) as location,
    (mp.user_id is not null) as "generalPreferences",
    (mp.dating_preferences_set=true and (mp.open_to_everyone=true or cardinality(mp.interested_genders)>0)) as "datingPreferences"
    from users u left join profiles p on p.user_id=u.id
    left join match_preferences mp on mp.user_id=u.id where u.id=$1`, [sub])
  const state = rows[0] ?? {}
  const checks = {
    profileBasics: state.profileBasics === true,
    photos: state.photos === true,
    activities: state.activities === true,
    location: state.location === true,
    generalPreferences: state.generalPreferences === true,
    datingPreferences: state.datingPreferences === true,
  }
  const completed = Object.values(checks).filter(Boolean).length
  return { checks, completed, total: Object.keys(checks).length, percentage: Math.round((completed / Object.keys(checks).length) * 100) }
})
