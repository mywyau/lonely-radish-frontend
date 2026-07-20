import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`select u.onboarding_completed_at as "completedAt",
    (nullif(trim(u.first_name),'') is not null and nullif(trim(u.last_name),'') is not null
      and p.user_id is not null and p.date_of_birth is not null and nullif(trim(p.bio),'') is not null) as "profileComplete",
    (select count(*)::int from profile_activities pa where pa.user_id=u.id) as "activityCount",
    (mp.user_id is not null) as "preferencesComplete"
    from users u left join profiles p on p.user_id=u.id
    left join match_preferences mp on mp.user_id=u.id where u.id=$1`, [sub])
  const state = rows[0]
  if (!state) return { complete: false, nextStep: 1, profileComplete: false, activityCount: 0, preferencesComplete: false }
  const profileComplete = state.profileComplete === true
  const activityCount = Number(state.activityCount || 0)
  const preferencesComplete = state.preferencesComplete === true
  const nextStep = !profileComplete ? 1 : activityCount < 1 ? 2 : !preferencesComplete ? 3 : 4
  return { complete: Boolean(state.completedAt), completedAt: state.completedAt, nextStep, profileComplete, activityCount, preferencesComplete }
})
