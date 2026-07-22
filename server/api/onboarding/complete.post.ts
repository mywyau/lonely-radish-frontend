import { createError } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  const { sub } = await requireUser(event)
  const { rows } = await db.query(`update users u set onboarding_completed_at=coalesce(onboarding_completed_at,now())
    where u.id=$1 and nullif(trim(u.first_name),'') is not null and nullif(trim(u.last_name),'') is not null
      and exists (select 1 from profiles p where p.user_id=u.id and p.gender_identity is not null and p.date_of_birth is not null and nullif(trim(p.bio),'') is not null)
      and exists (select 1 from profile_activities pa where pa.user_id=u.id)
      and exists (select 1 from match_preferences mp where mp.user_id=u.id)
    returning onboarding_completed_at as "completedAt"`, [sub])
  if (!rows[0]) throw createError({ statusCode: 409, statusMessage: 'Please finish every onboarding step' })
  return { complete: true, completedAt: rows[0].completedAt }
})
