import { createError, getRouterParam, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const viewer = await requireUser(event)
  const slug = getRouterParam(event, 'slug')
  const { rows } = await db.query(`select p.user_id as "userId",p.slug,p.display_name as name,
    extract(year from age(current_date,p.date_of_birth))::int as age,p.pronouns,p.bio,p.neighbourhood as place,
    exists(select 1 from matches m where m.status='active' and
      ((m.user_one_id=$2 and m.user_two_id=p.user_id) or (m.user_two_id=$2 and m.user_one_id=p.user_id))) as "isMatched",
    exists(select 1 from daily_interests di where di.sender_id=$2 and di.recipient_id=p.user_id) as "interestSent"
    from profiles p join users u on u.id=p.user_id
    where p.slug=$1 and p.visibility='active' and (u.account_status='active' or
      (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
      and p.user_id<>$2 and not exists(select 1 from blocks b where
        (b.blocker_id=$2 and b.blocked_id=p.user_id) or (b.blocker_id=p.user_id and b.blocked_id=$2))`, [slug,viewer.sub])
  const profile = rows[0]
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  const [photos, activities, availability] = await Promise.all([
    db.query(`select public_url as src,storage_key as "storageKey",alt_text as alt,position from profile_photos where user_id=$1 order by position`, [profile.userId]),
    db.query(`select coalesce(a.name,pa.custom_label) as name from profile_activities pa left join activities a on a.id=pa.activity_id where pa.user_id=$1 order by pa.position`, [profile.userId]),
    db.query(`select label from availability where user_id=$1 order by position`, [profile.userId]),
  ])
  return { ...profile, photos: await Promise.all(photos.rows.map(async photo => ({ ...photo,
    src: photo.storageKey ? await signedPhotoUrl(photo.storageKey) : photo.src, storageKey: undefined,
  }))), activities: activities.rows.map(row => row.name), availability: availability.rows.map(row => row.label) }
})
