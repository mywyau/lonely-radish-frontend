import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { MEMBER_ACTIVE_MATCH_LIMIT } from '~/server/utils/memberLimits'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const authUser = await requireUser(event)
  const { rows } = await db.query(`select u.id,u.email,u.first_name as "firstName",u.last_name as "lastName",
    u.account_type as "accountType",u.role='admin' as "isAdmin",
    exists(select 1 from business_members bm where bm.user_id=u.id) as "hasBusiness",
    e.plan,e.subscription_status,e.current_period_start,e.current_period_end,e.cancel_at_period_end,e.canceled_at,
    ((select count(*) from matches m where m.user_one_id=u.id and m.status in ('active','queued'))
      +(select count(*) from matches m where m.user_two_id=u.id and m.status in ('active','queued')))::int as "matchCount",
    (select count(*)::int from notifications n where n.recipient_id=u.id and n.read_at is null)
      as "unreadNotificationCount",
    ${MEMBER_ACTIVE_MATCH_LIMIT}::int as "activeMatchLimit",
    (u.onboarding_completed_at is not null
      and nullif(trim(u.first_name),'') is not null and nullif(trim(u.last_name),'') is not null
      and exists(select 1 from profiles p where p.user_id=u.id and p.gender_identity is not null
        and p.sexual_orientation is not null and p.race_ethnicity is not null and p.date_of_birth is not null
        and nullif(trim(p.bio),'') is not null and p.location is not null)
      and exists(select 1 from profile_activities pa where pa.user_id=u.id)
      and exists(select 1 from match_preferences mp where mp.user_id=u.id and mp.dating_preferences_set=true
        and (mp.open_to_everyone=true or cardinality(mp.interested_genders)>0)
        and mp.no_orientation_preference=false and cardinality(mp.interested_orientations)>0))
      as "onboardingComplete"
    from users u left join entitlements e on e.user_id=u.id where u.id=$1`, [authUser.sub])
  const row = rows[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const entitlement = row.plan ? {
    plan: row.plan,
    subscription_status: row.subscription_status,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    ...(row.current_period_start && { current_period_start: new Date(row.current_period_start).toISOString() }),
    ...(row.current_period_end && { current_period_end: new Date(row.current_period_end).toISOString() }),
    ...(row.canceled_at && { canceled_at: new Date(row.canceled_at).toISOString() }),
  } : { plan: 'free', subscription_status: 'canceled', cancel_at_period_end: false }

  return {
    user: { id: row.id, email: row.email, firstName: row.firstName, lastName: row.lastName, entitlement },
    accountType: row.accountType || 'personal',
    sessionMode: authUser.mode || 'personal',
    hasBusiness: row.hasBusiness === true,
    isAdmin: row.isAdmin === true,
    onboardingComplete: row.onboardingComplete === true,
    matchCount: Number(row.matchCount || 0),
    unreadNotificationCount: Number(row.unreadNotificationCount || 0),
    activeMatchLimit: Number(row.activeMatchLimit || MEMBER_ACTIVE_MATCH_LIMIT),
    refreshedAt: new Date().toISOString(),
  }
})
