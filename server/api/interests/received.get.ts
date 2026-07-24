import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrl } from '~/server/utils/supabaseStorage'
import { getActiveMatchLimit } from '~/server/utils/planLimits'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const [{ rows }, active, activeMatchLimit] = await Promise.all([db.query(`select di.id,di.created_at as "createdAt",p.slug,p.display_name as name,
    extract(year from age(current_date,p.date_of_birth))::int as age,p.neighbourhood as place,
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl",
    matched.status as "matchStatus",coalesce(tags.items,'{}'::text[]) as "activityTags"
    from daily_interests di
    join profiles p on p.user_id=di.sender_id and p.visibility='active'
    join users u on u.id=di.sender_id and (u.account_status='active' or
      (u.account_status='paused' and u.paused_until is not null and u.paused_until<=now()))
    left join lateral (select storage_key,public_url from profile_photos where user_id=p.user_id order by position limit 1) photo on true
    left join lateral (select m.status from matches m where
      (m.user_one_id=$1 and m.user_two_id=di.sender_id) or (m.user_two_id=$1 and m.user_one_id=di.sender_id)
      order by m.matched_at desc limit 1) matched on true
    left join lateral (select array_agg(coalesce(a.name,pa.custom_label) order by pa.position) as items
      from profile_activities pa left join activities a on a.id=pa.activity_id where pa.user_id=di.sender_id) tags on true
    where di.recipient_id=$1 and not exists(select 1 from blocks b where
      (b.blocker_id=$1 and b.blocked_id=di.sender_id) or (b.blocker_id=di.sender_id and b.blocked_id=$1))
    order by di.created_at desc limit 100`, [sub]),
    db.query(`select count(*)::int as count from matches where status='active'
      and (user_one_id=$1 or user_two_id=$1)`, [sub]),
    getActiveMatchLimit(sub),
  ])
  const interests = await Promise.all(rows.map(async row => ({
    id: row.id, slug: row.slug, name: row.name, age: row.age, place: row.place || 'Nearby',
    createdAt: row.createdAt, activityTags: row.activityTags.slice(0, 5), matchStatus: row.matchStatus || null,
    photoUrl: row.photoStorageKey ? await signedPhotoUrl(row.photoStorageKey) : row.legacyPhotoUrl || null,
  })))
  return { interests, activeMatchCount: active.rows[0]?.count || 0, activeMatchLimit }
})
