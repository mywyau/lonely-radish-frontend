import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'

const activityBySlug: Record<string, string> = {
  'gallery-wander': 'Gallery walks', 'market-loop': 'Markets', 'riverside-walk': 'Riverside walks',
  'live-music-set': 'Live music', 'casual-food-crawl': 'Casual food spots', 'weekend-pop-up': 'Workshops',
  'park-tennis-rally': 'Park tennis', 'cycle-and-stop': 'Cycling', 'climbing-taster': 'Climbing',
  'co-op-game-session': 'Co-op games', 'puzzle-room-online': 'Puzzle rooms', 'watch-and-play-lobby': 'Party games',
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const slug = getRouterParam(event, 'slug') || ''
  const activityName = activityBySlug[slug]
  if (!activityName) throw createError({ statusCode: 404, statusMessage: 'Activity not found' })

  const { rows } = await db.query(`select p.slug,p.display_name as name,
    extract(year from age(current_date,p.date_of_birth))::int as age,p.neighbourhood as place,p.bio as detail,
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",
    coalesce(free.label,'Availability not set') as time
    ,exists(select 1 from daily_interests di where di.sender_id=$2 and di.recipient_id=p.user_id) as "interestSent"
    from profile_activities pa join activities a on a.id=pa.activity_id
    join profiles p on p.user_id=pa.user_id join users u on u.id=p.user_id
    left join lateral (select storage_key,public_url from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    left join lateral (select label from availability where user_id=p.user_id order by position limit 1) free on true
    where lower(a.name)=lower($1) and a.is_active=true and p.user_id<>$2
      and p.visibility='active' and (u.account_status='active' or
        (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
      and not exists(select 1 from blocks b where
        (b.blocker_id=$2 and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=$2))
      and not exists(select 1 from matches m where m.status='active' and
        ((m.user_one_id=$2 and m.user_two_id=p.user_id) or (m.user_two_id=$2 and m.user_one_id=p.user_id)))
    order by p.updated_at desc limit 30`, [activityName,sub])

  const people = await Promise.all(rows.map(async person => ({
    slug: person.slug, name: person.name, age: person.age, place: person.place || 'Nearby',
    detail: person.detail || `Interested in ${activityName.toLowerCase()}.`, time: person.time,
    reason: 'Shares this activity', interestSent: person.interestSent === true, photoUrl: person.photoStorageKey
      ? await signedPhotoUrl(person.photoStorageKey) : person.legacyPhotoUrl || null,
  })))
  return { activityName, people }
})
